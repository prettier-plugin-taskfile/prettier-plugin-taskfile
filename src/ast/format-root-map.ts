import * as yaml from "yaml";
import { compareRootKeys } from "../rules/sort-root-keys";
import {
  formatTemplateFields,
  hasSharedYamlNodes,
} from "./format-template-fields";
import { TaskfileDiagnostic, TaskfileFormattingOptions } from "../types";
import { analyzeTaskfileRenames } from "../planning/analyze-taskfile-renames";
import { createRenamePlan } from "../planning/create-rename-plan";
import { applyRenamePlan } from "../planning/apply-rename-plan";

export function formatRootMap(
  rootMap: yaml.YAMLMap,
  options: TaskfileFormattingOptions = {},
  diagnostics: TaskfileDiagnostic[] = [],
): void {
  if (options.taskfileNormalizeNames !== false) {
    const plan = createRenamePlan(analyzeTaskfileRenames(rootMap), options);
    applyRenamePlan(plan);
    diagnostics.push(...plan.diagnostics);
  }
  const sortedItems = [...rootMap.items].sort((itemA, itemB) => {
    const keyA =
      yaml.isScalar(itemA.key) && typeof itemA.key.value === "string"
        ? itemA.key.value
        : "";
    const keyB =
      yaml.isScalar(itemB.key) && typeof itemB.key.value === "string"
        ? itemB.key.value
        : "";

    return compareRootKeys(keyA, keyB);
  });
  if (hasSharedYamlNodes(rootMap)) {
    if (sortedItems.some((item, index) => item !== rootMap.items[index]))
      diagnostics.push({
        code: "unsafe-ordering",
        message: "Preserving root order to keep YAML anchors before aliases.",
      });
  } else rootMap.items = sortedItems;

  formatTemplateFields(rootMap);
}
