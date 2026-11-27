import * as yaml from "yaml";
import { normalizeTemplateWhitespace } from "../rules/normalize-template-whitespace";
import {
  classifyTaskfileTemplateField,
  classifyTaskfileTemplateSequence,
  TaskfileTemplateContext,
} from "../rules/taskfile-template-context";
import { hasSharedYamlNodes } from "./has-shared-yaml-nodes";

function keyOf(pair: yaml.Pair): string | undefined {
  return yaml.isScalar(pair.key) && typeof pair.key.value === "string"
    ? pair.key.value
    : undefined;
}

export function formatTemplateFields(root: yaml.YAMLMap): void {
  if (hasSharedYamlNodes(root)) return;

  function value(node: unknown, context: TaskfileTemplateContext): void {
    if (yaml.isScalar(node) && typeof node.value === "string")
      node.value = normalizeTemplateWhitespace(node.value);
    else if (yaml.isSeq(node)) {
      const classification = classifyTaskfileTemplateSequence(context);
      if (classification.recognized)
        node.items.forEach((item) => value(item, classification.context));
    } else if (yaml.isMap(node)) {
      for (const pair of node.items) {
        const key = keyOf(pair) ?? "";
        const classification = classifyTaskfileTemplateField(key, context);
        if (classification.recognized)
          value(pair.value, classification.context);
      }
    }
  }

  for (const pair of root.items) {
    const key = keyOf(pair);
    const classification = classifyTaskfileTemplateField(key ?? "", {
      kind: "root",
    });
    if (classification.recognized) value(pair.value, classification.context);
    else if (key === "tasks" && yaml.isMap(pair.value)) {
      for (const task of pair.value.items) value(task.value, { kind: "task" });
    }
  }
}
