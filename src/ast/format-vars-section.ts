import * as yaml from "yaml";
import { TaskfileFormattingOptions } from "../types";
import { analyzeTaskfileRenames } from "../planning/analyze-taskfile-renames";
import { createRenamePlan } from "../planning/create-rename-plan";
import { applyRenamePlan } from "../planning/apply-rename-plan";
import { formatTemplateFields } from "./format-template-fields";

export function formatVarsSection(
  varsMap: yaml.YAMLMap,
  options: TaskfileFormattingOptions = {},
): void {
  const root = new yaml.YAMLMap();
  root.items.push(new yaml.Pair(new yaml.Scalar("vars"), varsMap));
  if (options.taskfileNormalizeNames !== false)
    applyRenamePlan(createRenamePlan(analyzeTaskfileRenames(root), options));
  formatTemplateFields(root);
}
