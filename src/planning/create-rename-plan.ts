import { isTaskSpecialVariable } from "../rules/task-special-variables";
import { TaskfileFormattingOptions } from "../types";
import { createNameDefinitionIndex } from "./name-definition-index";
import { RenameAnalysis, RenamePlan, ScalarRename } from "./rename-types";

export function createRenamePlan(
  analysis: RenameAnalysis,
  options: TaskfileFormattingOptions = {},
): RenamePlan {
  const empty = Object.freeze([]);
  if (options.taskfileNormalizeNames === false)
    return Object.freeze({ edits: empty, diagnostics: empty });
  const index = createNameDefinitionIndex(analysis.definitions);
  if (
    !index.entries.some(
      ({ definition, normalizedName }) => normalizedName !== definition.name,
    )
  )
    return Object.freeze({ edits: empty, diagnostics: empty });
  const hazards = new Set(analysis.hazards);
  if (analysis.hasIncludes && options.taskfileAllowRenamesWithIncludes !== true)
    hazards.add("Included Taskfiles have external scopes; preserving names.");
  const changedTaskNames = index.entries.some(
    ({ definition, normalizedName }) =>
      definition.kind === "task" && normalizedName !== definition.name,
  );
  for (const {
    definition,
    normalizedName,
    normalizedCollision,
  } of index.entries) {
    if (
      definition.kind === "variable" &&
      normalizedName !== definition.name &&
      isTaskSpecialVariable(normalizedName)
    )
      hazards.add(
        `Variable "${definition.name}" would become Task special variable "${normalizedName}"; preserving names.`,
      );
    if (normalizedCollision)
      hazards.add(`Name collision at "${normalizedName}"; preserving names.`);
    if (definition.kind === "variable" && definition.scope !== "root") {
      const root = index.lookup(
        "variable",
        normalizedName,
        "root",
        "normalized",
      )?.definition;
      if (root && root.name !== definition.name)
        hazards.add(
          `Variable "${definition.name}" could shadow "${root.name}" after normalization; preserving names.`,
        );
    }
  }
  const edits: ScalarRename[] = index.entries
    .filter(
      ({ definition, normalizedName }) => definition.name !== normalizedName,
    )
    .map(({ definition, normalizedName }) => ({
      node: definition.node,
      from: definition.name,
      to: normalizedName,
    }));
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
    const resolved = index.resolve(
      reference.kind,
      reference.name,
      reference.scope,
    );
    const definition = resolved?.definition;
    if (
      resolved &&
      reference.definitionLimit !== undefined &&
      resolved.position >= reference.definitionLimit &&
      resolved.normalizedName !== resolved.definition.name
    )
      hazards.add(
        `Initializer reference "${reference.name}" may read an earlier external binding; preserving names.`,
      );
    if (
      !definition &&
      reference.kind === "variable" &&
      reference.scope === "root" &&
      index.hasRenamedLocalVariable(reference.name)
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
    const renamed = resolved ? resolved.normalizedName : reference.name;
    if (
      index.resolve(reference.kind, renamed, reference.scope, "normalized")
        ?.definition !== definition
    )
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
