import * as yaml from "yaml";
import { normalizeTemplateWhitespace } from "../rules/normalize-template-whitespace";

const taskFields = new Set([
  "vars",
  "env",
  "cmds",
  "cmd",
  "defer",
  "desc",
  "summary",
  "dir",
  "sources",
  "generates",
  "status",
  "preconditions",
  "if",
  "msg",
  "label",
  "prefix",
]);

function keyOf(pair: yaml.Pair): string | undefined {
  return yaml.isScalar(pair.key) && typeof pair.key.value === "string"
    ? pair.key.value
    : undefined;
}

export function hasSharedYamlNodes(root: yaml.YAMLMap): boolean {
  let shared = false;
  yaml.visit(root, {
    Node: (_key, node) => {
      if (yaml.isAlias(node) || ("anchor" in node && node.anchor))
        shared = true;
    },
  });
  return shared;
}

export function formatTemplateFields(root: yaml.YAMLMap): void {
  if (hasSharedYamlNodes(root)) return;

  function value(
    node: unknown,
    variables = false,
    variableValue = false,
  ): void {
    if (yaml.isScalar(node) && typeof node.value === "string")
      node.value = normalizeTemplateWhitespace(node.value);
    else if (yaml.isSeq(node)) {
      if (!variableValue) node.items.forEach((item) => value(item));
    } else if (yaml.isMap(node)) {
      for (const pair of node.items) {
        const key = keyOf(pair) ?? "";
        if (
          variables ||
          (!variableValue && taskFields.has(key)) ||
          key === "sh" ||
          key === "ref"
        )
          value(pair.value, key === "vars" || key === "env", variables);
      }
    }
  }

  for (const pair of root.items) {
    const key = keyOf(pair);
    if (key === "vars" || key === "env") value(pair.value, true);
    else if (key === "dir") value(pair.value);
    else if (key === "tasks" && yaml.isMap(pair.value)) {
      for (const task of pair.value.items) value(task.value);
    }
  }
}
