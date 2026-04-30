import * as yaml from "yaml";
import { normalizeTaskName } from "../rules/normalize-task-name";
import { normalizeTemplateWhitespace } from "../rules/normalize-template-whitespace";

function formatCommands(commands: yaml.YAMLSeq): void {
  commands.items.forEach((item) => {
    if (yaml.isScalar(item) && typeof item.value === "string") {
      item.value = normalizeTemplateWhitespace(item.value);
    }
  });
}

function formatTaskMap(taskMap: yaml.YAMLMap): void {
  taskMap.items.forEach((item) => {
    if (
      yaml.isScalar(item.key) &&
      item.key.value === "cmds" &&
      yaml.isSeq(item.value)
    ) {
      formatCommands(item.value);
    }
  });
}

export function formatTaskSection(tasksMap: yaml.YAMLMap): void {
  tasksMap.items.forEach((item) => {
    if (!yaml.isScalar(item.key) || typeof item.key.value !== "string") {
      return;
    }

    item.key.value = normalizeTaskName(item.key.value);

    if (yaml.isMap(item.value)) {
      formatTaskMap(item.value);
    }
  });
}
