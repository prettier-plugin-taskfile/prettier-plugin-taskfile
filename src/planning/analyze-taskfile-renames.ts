import * as yaml from "yaml";
import { NameDefinition, NameReference, RenameAnalysis } from "./rename-types";
import { hasTemplatedShellCommand } from "../rules/has-templated-shell-command";
import {
  classifyTaskfileTemplateField,
  classifyTaskfileTemplateSequence,
  TaskfileTemplateContext,
} from "../rules/taskfile-template-context";

function keyOf(pair: yaml.Pair): string | undefined {
  return yaml.isScalar(pair.key) && typeof pair.key.value === "string"
    ? pair.key.value
    : undefined;
}

export function analyzeTaskfileRenames(root: yaml.YAMLMap): RenameAnalysis {
  const definitions: NameDefinition[] = [];
  const references: NameReference[] = [];
  const initializerLimits = new Map<yaml.Node, number>();
  const variableValues = new Map<yaml.Scalar, unknown>();
  const environments = new Map<string, unknown>();
  const shellTemplates = new Set<yaml.Scalar>();
  const hazards = new Set<string>();
  const hazard = (message: string) => hazards.add(message);
  const entry = (map: yaml.YAMLMap, name: string) =>
    map.items.find((pair) => keyOf(pair) === name)?.value;

  function shellInvocation(node: unknown): void {
    if (!yaml.isScalar(node) || typeof node.value !== "string") return;
    const command = node.value;
    if (command.includes("{{")) shellTemplates.add(node);
    // Reject quoted/escaped spellings too; this is not a shell parser.
    const unquoted = command.replace(/\\\r?\n/g, "").replace(/['"\\]/g, "");
    if (/\btask\b/.test(unquoted) || /\{\{\s*\.TASK_EXE\s*\}\}/.test(command))
      hazard(
        "Shell Task invocations cannot be rewritten safely; preserving names.",
      );
    if (/\$(?:\(|\{|[A-Za-z_])|`/.test(command))
      hazard(
        "Dynamic shell expansions cannot be analyzed safely; preserving names.",
      );
    if (hasTemplatedShellCommand(command))
      hazard(
        "Template-derived shell commands cannot be analyzed safely; preserving names.",
      );
  }

  function inspectStructure(node: unknown): void {
    if (yaml.isAlias(node)) hazard("YAML aliases require preserving names.");
    if (yaml.isNode(node) && "anchor" in node && node.anchor)
      hazard("YAML anchors require preserving names.");
    if (
      yaml.isNode(node) &&
      "tag" in node &&
      node.tag &&
      !node.tag.startsWith("tag:yaml.org,2002:")
    )
      hazard("Custom YAML tags require preserving names.");
    if (yaml.isMap(node)) {
      for (const pair of node.items) {
        if (keyOf(pair) === undefined || keyOf(pair) === "<<")
          hazard("Complex keys or YAML merges require preserving names.");
        if (keyOf(pair) === "ref")
          hazard("Variable ref expressions require preserving names.");
        if (keyOf(pair) === "sh")
          hazard("Shell expression environments require preserving names.");
        if (keyOf(pair) === "requires" || keyOf(pair) === "for")
          hazard("Required-variable and loop scopes require preserving names.");
        if (["sh", "cmd", "if"].includes(keyOf(pair) ?? ""))
          shellInvocation(pair.value);
        if (
          (keyOf(pair) === "status" || keyOf(pair) === "preconditions") &&
          yaml.isSeq(pair.value)
        )
          pair.value.items.forEach(shellInvocation);
        inspectStructure(pair.key);
        inspectStructure(pair.value);
      }
    } else if (yaml.isSeq(node)) node.items.forEach(inspectStructure);
  }

  function defineVariables(node: unknown, scope: string): void {
    if (node === undefined) return;
    if (!yaml.isMap(node)) {
      hazard("Non-map variable definitions require preserving names.");
      return;
    }
    for (const pair of node.items) {
      const name = keyOf(pair);
      if (name !== undefined && yaml.isScalar(pair.key)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
          hazard("Unsupported variable identifiers require preserving names.");
        definitions.push(
          Object.freeze({ node: pair.key, name, kind: "variable", scope }),
        );
        variableValues.set(pair.key, pair.value);
        if (yaml.isNode(pair.value))
          initializerLimits.set(pair.value, definitions.length - 1);
      }
    }
  }

  function templates(
    node: unknown,
    scope: string,
    classification: {
      readonly recognized: boolean;
      readonly context: TaskfileTemplateContext;
    },
    definitionLimit?: number,
  ): void {
    if (yaml.isNode(node))
      definitionLimit = initializerLimits.get(node) ?? definitionLimit;
    if (yaml.isScalar(node) && typeof node.value === "string") {
      const text = node.value;
      if (!text.includes("{{") && !text.includes("}}")) return;
      if (!classification.recognized)
        hazard("Templates in unknown fields require preserving names.");
      let offset = 0;
      const actions = /\{\{([\s\S]*?)\}\}/g;
      for (const match of text.matchAll(actions)) {
        const start = match.index!;
        if (
          text.slice(offset, start).includes("{{") ||
          text.slice(offset, start).includes("}}")
        )
          hazard("Malformed templates require preserving names.");
        const simple = /^(\s*)\.([A-Za-z_][A-Za-z0-9_]*)(\s*)$/.exec(match[1]);
        if (!simple) hazard("Complex templates require preserving names.");
        else {
          const nameStart = start + 2 + simple[1].length + 1;
          references.push(
            Object.freeze({
              node,
              text,
              name: simple[2],
              kind: "variable",
              scope,
              start: nameStart,
              end: nameStart + simple[2].length,
              definitionLimit,
            }),
          );
        }
        offset = start + match[0].length;
      }
      if (
        text.slice(offset).includes("{{") ||
        text.slice(offset).includes("}}")
      )
        hazard("Malformed templates require preserving names.");
    } else if (yaml.isMap(node)) {
      for (const pair of node.items) {
        templates(pair.key, scope, {
          recognized: false,
          context: { kind: "task" },
        });
        const key = keyOf(pair) ?? "";
        const field = classifyTaskfileTemplateField(
          key,
          classification.context,
        );
        templates(
          pair.value,
          scope,
          {
            ...field,
            recognized: classification.recognized && field.recognized,
          },
          definitionLimit,
        );
      }
    } else if (yaml.isSeq(node)) {
      const sequence = classifyTaskfileTemplateSequence(classification.context);
      node.items.forEach((item) =>
        templates(
          item,
          scope,
          {
            ...sequence,
            recognized: classification.recognized && sequence.recognized,
          },
          definitionLimit,
        ),
      );
    }
  }

  function taskReference(node: unknown): void {
    if (
      !yaml.isScalar(node) ||
      typeof node.value !== "string" ||
      node.value.includes("{{")
    ) {
      hazard("Dynamic or non-string task references require preserving names.");
      return;
    }
    const text = node.value;
    const prefix = text.startsWith(":") ? 1 : 0;
    references.push(
      Object.freeze({
        node,
        text,
        name: text.slice(prefix),
        kind: "task",
        scope: "root",
        start: prefix,
        end: text.length,
      }),
    );
  }

  function calls(node: unknown, dependencies: boolean): void {
    if (node === undefined) return;
    if (!yaml.isSeq(node)) {
      hazard(
        "Unsupported command or dependency forms require preserving names.",
      );
      return;
    }
    for (const item of node.items) {
      call(item, dependencies);
    }
  }

  function call(item: unknown, dependencies: boolean): void {
    if (yaml.isMap(item)) {
      const task = entry(item, "task");
      if (task !== undefined) {
        taskReference(task);
        if (entry(item, "vars") !== undefined)
          hazard("Task-call variable overrides require preserving names.");
      } else if (dependencies)
        hazard("Unsupported dependency mappings require preserving names.");
      const deferred = entry(item, "defer");
      if (deferred !== undefined) call(deferred, false);
      const command = entry(item, "cmd");
      if (command !== undefined) call(command, false);
    } else if (dependencies) taskReference(item);
    else shellInvocation(item);
  }

  inspectStructure(root);
  const includes = entry(root, "includes");
  const hasIncludes =
    includes !== undefined &&
    (!yaml.isMap(includes) || includes.items.length > 0);
  const includedNamespaces: string[] = [];
  if (yaml.isMap(includes)) {
    for (const pair of includes.items) {
      const namespace = keyOf(pair);
      const path = yaml.isMap(pair.value)
        ? entry(pair.value, "taskfile")
        : pair.value;
      if (
        !namespace ||
        !yaml.isScalar(path) ||
        typeof path.value !== "string"
      ) {
        hazard("Unsupported include definitions require preserving names.");
        continue;
      }
      const flatten = yaml.isMap(pair.value)
        ? entry(pair.value, "flatten")
        : undefined;
      if (yaml.isScalar(flatten) && flatten.value === true) continue;
      includedNamespaces.push(namespace);
      if (yaml.isMap(pair.value)) {
        const aliases = entry(pair.value, "aliases");
        if (aliases === undefined) continue;
        if (!yaml.isSeq(aliases)) {
          hazard("Unsupported include aliases require preserving names.");
          continue;
        }
        for (const alias of aliases.items) {
          if (
            yaml.isScalar(alias) &&
            typeof alias.value === "string" &&
            alias.value.length > 0
          )
            includedNamespaces.push(alias.value);
          else hazard("Unsupported include aliases require preserving names.");
        }
      }
    }
  } else if (includes !== undefined)
    hazard("Non-map include definitions require preserving names.");
  environments.set("root", entry(root, "env"));
  defineVariables(entry(root, "vars"), "root");
  const tasks = entry(root, "tasks");
  if (tasks !== undefined && !yaml.isMap(tasks))
    hazard("Non-map task definitions require preserving names.");
  if (yaml.isMap(tasks)) {
    for (const pair of tasks.items) {
      const name = keyOf(pair);
      if (name === undefined || !yaml.isScalar(pair.key)) continue;
      definitions.push(
        Object.freeze({ node: pair.key, name, kind: "task", scope: "root" }),
      );
      if (/[{}*]/.test(name))
        hazard("Dynamic task names require preserving names.");
      const scope = `task:${name}`;
      if (yaml.isMap(pair.value)) {
        environments.set(scope, entry(pair.value, "env"));
        defineVariables(entry(pair.value, "vars"), scope);
        if (entry(pair.value, "aliases") !== undefined)
          hazard("Task aliases require preserving names.");
        calls(entry(pair.value, "deps"), true);
        calls(entry(pair.value, "cmds"), false);
        const command = entry(pair.value, "cmd");
        if (command !== undefined) call(command, false);
        for (const field of pair.value.items) {
          const key = keyOf(field) ?? "";
          templates(
            field.value,
            scope,
            classifyTaskfileTemplateField(key, { kind: "task-definition" }),
          );
        }
      } else if (yaml.isSeq(pair.value)) {
        calls(pair.value, false);
        templates(pair.value, scope, {
          recognized: true,
          context: { kind: "task" },
        });
      } else {
        call(pair.value, false);
        templates(pair.value, scope, {
          recognized: true,
          context: { kind: "task" },
        });
      }
    }
  }
  for (const pair of root.items) {
    if (keyOf(pair) === "tasks") continue;
    const key = keyOf(pair) ?? "";
    templates(
      pair.value,
      "root",
      classifyTaskfileTemplateField(key, { kind: "root" }),
      key === "env" ? 0 : undefined,
    );
  }

  function scalarValue(
    reference: NameReference,
    scope: string,
    seen: Set<yaml.Scalar>,
  ): string | undefined {
    const definition =
      definitions.find(
        (item) =>
          item.kind === "variable" &&
          item.scope === scope &&
          item.name === reference.name,
      ) ??
      definitions.find(
        (item) =>
          item.kind === "variable" &&
          item.scope === "root" &&
          item.name === reference.name,
      );
    if (!definition) {
      const environmentOverride = [
        environments.get(scope),
        environments.get("root"),
      ].some(
        (environment) =>
          yaml.isMap(environment) &&
          environment.items.some((pair) => keyOf(pair) === reference.name),
      );
      // Task's version is shell-inert; arbitrary external bindings are not.
      return reference.name === "TASK_VERSION" && !environmentOverride
        ? "0"
        : undefined;
    }
    if (
      seen.has(definition.node) ||
      (reference.definitionLimit !== undefined &&
        definitions.indexOf(definition) >= reference.definitionLimit)
    )
      return undefined;
    const value = variableValues.get(definition.node);
    if (!yaml.isScalar(value)) return undefined;
    if (typeof value.value === "number" || typeof value.value === "boolean")
      return String(value.value);
    if (typeof value.value !== "string") return undefined;
    const expanded = expandShellTemplate(
      value,
      definition.scope,
      new Set([...seen, definition.node]),
    );
    return expanded !== undefined &&
      !/[\\'"`$;&|<>()\r\n*?\[\]~{}]/.test(expanded)
      ? expanded
      : undefined;
  }

  function expandShellTemplate(
    node: yaml.Scalar,
    scope: string,
    seen: Set<yaml.Scalar>,
  ): string | undefined {
    if (typeof node.value !== "string") return undefined;
    let unknown = false;
    const rendered = node.value.replace(
      /\{\{\s*\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g,
      (_action, name: string) => {
        const reference = references.find(
          (item) =>
            item.kind === "variable" &&
            item.node === node &&
            item.name === name,
        );
        const value = reference && scalarValue(reference, scope, seen);
        if (value === undefined) unknown = true;
        return value ?? "";
      },
    );
    return unknown || rendered.includes("{{") || rendered.includes("}}")
      ? undefined
      : rendered;
  }

  for (const node of shellTemplates) {
    const scope =
      references.find((reference) => reference.node === node)?.scope ?? "root";
    const rendered = expandShellTemplate(node, scope, new Set());
    if (
      rendered === undefined ||
      /\btask\b/.test(
        rendered.replace(/\\\r?\n/g, "").replace(/['"\\]/g, ""),
      ) ||
      /[*?\[\]~{}]|\$(?:\(|\{|[A-Za-z_])|`/.test(rendered)
    )
      hazard(
        "Shell template arguments require known shell-inert scalar bindings; preserving names.",
      );
  }
  return Object.freeze({
    definitions: Object.freeze(definitions),
    references: Object.freeze(references),
    hazards: Object.freeze([...hazards]),
    hasIncludes,
    includedNamespaces: Object.freeze(includedNamespaces),
  });
}
