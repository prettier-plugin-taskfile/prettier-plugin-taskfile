import { normalizeTaskName } from "../rules/normalize-task-name";
import { normalizeVariableName } from "../rules/normalize-variable-name";
import { isTaskSpecialVariable } from "../rules/task-special-variables";
import { TaskfileFormattingOptions } from "../types";
import {
  NameDefinition,
  RenameAnalysis,
  RenamePlan,
  ScalarRename,
} from "./rename-types";

export function createRenamePlan(
  analysis: RenameAnalysis,
  options: TaskfileFormattingOptions = {},
): RenamePlan {
  const empty = Object.freeze([]);
  if (options.taskfileNormalizeNames === false)
    return Object.freeze({ edits: empty, diagnostics: empty });
  const target = (definition: NameDefinition) =>
    definition.kind === "task"
      ? normalizeTaskName(definition.name)
      : normalizeVariableName(definition.name);
  if (
    !analysis.definitions.some(
      (definition) => target(definition) !== definition.name,
    )
  )
    return Object.freeze({ edits: empty, diagnostics: empty });
  const hazards = new Set(analysis.hazards);
  if (analysis.hasIncludes && options.taskfileAllowRenamesWithIncludes !== true)
    hazards.add("Included Taskfiles have external scopes; preserving names.");
  const changedTaskNames = analysis.definitions.some(
    (definition) =>
      definition.kind === "task" && target(definition) !== definition.name,
  );
  const occupied = new Map<string, NameDefinition>();
  for (const definition of analysis.definitions) {
    if (
      definition.kind === "variable" &&
      target(definition) !== definition.name &&
      isTaskSpecialVariable(target(definition))
    )
      hazards.add(
        `Variable "${definition.name}" would become Task special variable "${target(definition)}"; preserving names.`,
      );
    const key = `${definition.kind}/${definition.scope}/${target(definition)}`;
    if (occupied.has(key))
      hazards.add(
        `Name collision at "${target(definition)}"; preserving names.`,
      );
    occupied.set(key, definition);
    if (definition.kind === "variable" && definition.scope !== "root") {
      const root = analysis.definitions.find(
        (other) =>
          other.kind === "variable" &&
          other.scope === "root" &&
          target(other) === target(definition),
      );
      if (root && root.name !== definition.name)
        hazards.add(
          `Variable "${definition.name}" could shadow "${root.name}" after normalization; preserving names.`,
        );
    }
  }
  const resolve = (
    kind: string,
    name: string,
    scope: string,
    normalized: boolean,
  ) =>
    analysis.definitions.find(
      (d) =>
        d.kind === kind &&
        d.scope === scope &&
        (normalized ? target(d) : d.name) === name,
    ) ??
    analysis.definitions.find(
      (d) =>
        d.kind === kind &&
        d.scope === "root" &&
        (normalized ? target(d) : d.name) === name,
    );
  const edits: ScalarRename[] = analysis.definitions
    .filter((d) => d.name !== target(d))
    .map((d) => ({ node: d.node, from: d.name, to: target(d) }));
  const replacements = new Map<
    ScalarRename["node"],
    { from: string; parts: { start: number; end: number; to: string }[] }
  >();
  for (const reference of analysis.references) {
    if (
      changedTaskNames &&
      reference.kind === "variable" &&
      (reference.name === "TASK" || reference.name === "ALIAS")
    )
      hazards.add(
        `Special variable "${reference.name}" can observe renamed tasks; preserving names.`,
      );
    const definition = resolve(
      reference.kind,
      reference.name,
      reference.scope,
      false,
    );
    if (
      definition &&
      reference.definitionLimit !== undefined &&
      analysis.definitions.indexOf(definition) >= reference.definitionLimit &&
      target(definition) !== definition.name
    )
      hazards.add(
        `Initializer reference "${reference.name}" may read an earlier external binding; preserving names.`,
      );
    if (
      !definition &&
      reference.kind === "variable" &&
      reference.scope === "root" &&
      analysis.definitions.some(
        (d) =>
          d.kind === "variable" &&
          d.scope !== "root" &&
          d.name === reference.name &&
          target(d) !== d.name,
      )
    )
      hazards.add(
        `Root reference "${reference.name}" may depend on task-local variables; preserving names.`,
      );
    const includedReference =
      options.taskfileAllowRenamesWithIncludes === true &&
      reference.kind === "task" &&
      analysis.includedNamespaces.some(
        (namespace) =>
          reference.name === namespace ||
          (reference.name.startsWith(`${namespace}:`) &&
            reference.name.length > namespace.length + 1),
      );
    if (!definition && reference.kind === "task" && !includedReference)
      hazards.add(
        `Unresolved task reference "${reference.name}"; preserving names.`,
      );
    const renamed = definition ? target(definition) : reference.name;
    if (resolve(reference.kind, renamed, reference.scope, true) !== definition)
      hazards.add(
        `Reference "${reference.name}" would change scope; preserving names.`,
      );
    if (renamed !== reference.name) {
      let replacement = replacements.get(reference.node);
      if (!replacement) {
        replacement = { from: reference.text, parts: [] };
        replacements.set(reference.node, replacement);
      }
      replacement.parts.push({
        start: reference.start,
        end: reference.end,
        to: renamed,
      });
    }
  }
  if (hazards.size > 0) {
    const diagnostics = Object.freeze(
      [...hazards].map((message) =>
        Object.freeze({ code: "unsafe-rename" as const, message }),
      ),
    );
    if (options.taskfileUnsafeRenames === "error")
      throw new Error(
        `Unsafe Taskfile renames: ${diagnostics.map((d) => d.message).join(" ")}`,
      );
    return Object.freeze({ edits: empty, diagnostics });
  }
  for (const [node, replacement] of replacements) {
    let to = replacement.from;
    for (const part of replacement.parts.sort((a, b) => b.start - a.start))
      to = to.slice(0, part.start) + part.to + to.slice(part.end);
    edits.push({ node, from: replacement.from, to });
  }
  return Object.freeze({
    edits: Object.freeze(edits.map((edit) => Object.freeze(edit))),
    diagnostics:
      analysis.hasIncludes && options.taskfileAllowRenamesWithIncludes === true
        ? Object.freeze([
            Object.freeze({
              code: "unchecked-includes" as const,
              message:
                "Local names were normalized without checking or updating included Taskfiles; external references and variable bindings are not guaranteed.",
            }),
          ])
        : empty,
  });
}
