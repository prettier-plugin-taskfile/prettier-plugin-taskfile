import { TaskfileTasks } from "../types";
import { REGEX_PATTERNS } from "../constants";

/**
 * Converts task names to kebab case according to the style guide.
 * Preserves namespace separators (colons).
 *
 * @param tasks The tasks object from the Taskfile
 * @returns A new tasks object with kebab-case task names
 */
export function kebabCaseTaskNames(tasks: TaskfileTasks): TaskfileTasks {
  if (!tasks) return tasks;

  const result: TaskfileTasks = {};
  for (const key in tasks) {
    // Preserve namespace separators (colons)
    const parts = key.split(":");
    const kebabParts = parts.map((part) =>
      part.replace(
        REGEX_PATTERNS.UNDERSCORE_LOWERCASE,
        (_, letter) => `-${letter}`,
      ),
    );
    const newKey = kebabParts.join(":");
    result[newKey] = tasks[key];
  }
  return result;
}
