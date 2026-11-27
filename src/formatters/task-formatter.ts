import { TaskfileFormattingOptions, TaskfileTasks } from "../types";
import { formatTaskfile } from "./taskfile-formatter";

/**
 * Converts task names to kebab case according to the style guide.
 * Preserves namespace separators (colons).
 *
 * @param tasks The tasks object from the Taskfile
 * @returns A new tasks object with kebab-case task names
 */
export function kebabCaseTaskNames(
  tasks: TaskfileTasks,
  options: TaskfileFormattingOptions = {},
): TaskfileTasks {
  if (!tasks) return tasks;

  return formatTaskfile({ tasks }, options).tasks!;
}
