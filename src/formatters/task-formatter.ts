import { TaskfileTasks } from "../types";
import { normalizeTaskName } from "../rules/normalize-task-name";

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
    result[normalizeTaskName(key)] = tasks[key];
  }
  return result;
}
