import * as yaml from "yaml";
import { TASKFILE_KEY_PRIORITY } from "../constants";

/**
 * Formats a YAML Document while preserving comments
 * Note: If comments are present at the root level, sorting is disabled
 * as we cannot reliably determine which comment belongs to which key.
 * In such cases, only formatting rules (uppercase vars, kebab-case tasks, etc.) are applied.
 *
 * @param doc YAML Document
 * @param sourceText The original YAML source text (optional, for comment detection)
 * @returns The modified document (same reference)
 * @throws Error if comments are present and keys are not in the correct order
 */
export function formatTaskfileDocument(
  doc: yaml.Document,
  sourceText?: string,
): yaml.Document {
  if (!doc.contents || !yaml.isMap(doc.contents)) {
    return doc;
  }

  const rootMap = doc.contents;

  // Check if there are comments at the root level
  // We detect comments by checking the source text for lines starting with # 
  // that appear before any key: value pairs (at the root level, indentation = 0)
  const hasRootComments = sourceText
    ? detectRootLevelComments(sourceText)
    : false;

  // If comments are present, validate key order instead of sorting
  if (hasRootComments) {
    validateKeyOrder(rootMap);
  } else {
    // If no comments, sort the keys according to priority
    sortMapKeys(rootMap);
  }

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
 * Detect if there are root-level comments in the YAML source
 * Root-level comments are those at indentation level 0 (starting with # and no leading spaces)
 */
function detectRootLevelComments(source: string): boolean {
  const lines = source.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Check for root-level comments (no indentation, starts with #)
    if (trimmed.startsWith("#") && !line.startsWith(" ")) {
      return true;
    }
    // Stop checking once we encounter a non-comment, non-empty line at root level
    if (trimmed && !trimmed.startsWith("#")) {
      break;
    }
  }

  return false;
}

/**
 * Validate that keys are in the correct order according to Taskfile style guide
 * @throws Error if keys are not in the correct order with detailed information
 */
function validateKeyOrder(map: yaml.YAMLMap): void {
  const priorityOrder: string[] = [...TASKFILE_KEY_PRIORITY];
  let lastPriorityIndex = -1;
  let lastKeyName = "";

  for (const item of map.items) {
    if (!yaml.isScalar(item.key)) continue;

    const keyName = item.key.value as string;
    const priorityIndex = priorityOrder.indexOf(keyName);

    // Check if key is in priority order
    if (priorityIndex !== -1) {
      if (priorityIndex < lastPriorityIndex) {
        throw new Error(
          `Key "${keyName}" appears after "${lastKeyName}", but should come before it.\n` +
          `Current order: "version", "includes", "vars", "env", "tasks"\n` +
          `Your order: ... "${lastKeyName}", "${keyName}" ...\n` +
          `Please reorder your keys according to the Taskfile style guide: ${priorityOrder.join(", ")}`,
        );
      }
      lastPriorityIndex = priorityIndex;
      lastKeyName = keyName;
    }
  }
}

/**
 * Sort map keys according to Taskfile priority
 * Only used when there are no comments at root level
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
