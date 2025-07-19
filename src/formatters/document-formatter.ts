import * as yaml from "yaml";
import { TASKFILE_KEY_PRIORITY } from "../constants";

/**
 * Formats a YAML Document while preserving comments
 * @param doc YAML Document
 * @returns The modified document (same reference)
 */
export function formatTaskfileDocument(doc: yaml.Document): yaml.Document {
  if (!doc.contents || !yaml.isMap(doc.contents)) {
    return doc;
  }

  const rootMap = doc.contents;

  // Sort the keys according to priority
  sortMapKeys(rootMap);

  // Format specific sections
  rootMap.items.forEach((item) => {
    if (!yaml.isScalar(item.key) || typeof item.key.value !== "string") return;

    const key = item.key.value;

    switch (key) {
      case "vars":
        if (yaml.isMap(item.value)) {
          formatVariables(item.value);
        }
        break;
      case "tasks":
        if (yaml.isMap(item.value)) {
          formatTasks(item.value);
        }
        break;
    }
  });

  return doc;
}

/**
 * Sort map keys according to Taskfile priority
 */
function sortMapKeys(map: yaml.YAMLMap): void {
  const priorityOrder: string[] = [...TASKFILE_KEY_PRIORITY];

  map.items.sort((a, b) => {
    const keyA = yaml.isScalar(a.key) ? (a.key.value as string) : "";
    const keyB = yaml.isScalar(b.key) ? (b.key.value as string) : "";

    const indexA = priorityOrder.indexOf(keyA);
    const indexB = priorityOrder.indexOf(keyB);

    // Items in priority list come first
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // Items not in priority list are sorted alphabetically
    return keyA.localeCompare(keyB);
  });
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/**
 * Format variables section (uppercase variable names)
 */
function formatVariables(varsMap: yaml.YAMLMap): void {
  varsMap.items.forEach((item) => {
    if (yaml.isScalar(item.key) && typeof item.key.value === "string") {
      const originalKey = item.key.value;
      const uppercaseKey = originalKey.toUpperCase();

      if (originalKey !== uppercaseKey) {
        item.key.value = uppercaseKey;
      }
    }
  });
}

/**
 * Format tasks section (kebab-case task names and process commands)
 */
function formatTasks(tasksMap: yaml.YAMLMap): void {
  tasksMap.items.forEach((item) => {
    if (yaml.isScalar(item.key) && typeof item.key.value === "string") {
      const originalKey = item.key.value;
      const kebabKey = toKebabCase(originalKey);

      if (originalKey !== kebabKey) {
        item.key.value = kebabKey;
      }

      // Process commands in the task
      if (yaml.isMap(item.value)) {
        const taskMap = item.value;
        taskMap.items.forEach((taskItem) => {
          if (
            yaml.isScalar(taskItem.key) &&
            taskItem.key.value === "cmds" &&
            yaml.isSeq(taskItem.value)
          ) {
            formatCommands(taskItem.value);
          }
        });
      }
    }
  });
}

/**
 * Format commands (remove whitespace in template variables)
 */
function formatCommands(cmdSeq: yaml.YAMLSeq): void {
  cmdSeq.items.forEach((item) => {
    if (yaml.isScalar(item) && typeof item.value === "string") {
      const original = item.value;
      const formatted = original.replace(
        /\{\{\s*\.\s*([A-Z0-9_]+)\s*\}\}/g,
        "{{.$1}}",
      );

      if (original !== formatted) {
        item.value = formatted;
      }
    }
  });
}
