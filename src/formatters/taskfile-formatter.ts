import { Taskfile } from "../types";
import { sortTaskfileKeys } from "./key-sorter";
import { uppercaseVariableNames } from "./variable-formatter";
import { kebabCaseTaskNames } from "./task-formatter";
import { processCommands } from "./template-formatter";

/**
 * Formats a Taskfile object according to the style guide.
 *
 * @param obj The Taskfile object
 * @returns A formatted Taskfile object
 */
export function formatTaskfile(obj: Taskfile): Taskfile {
  // Handle null or undefined input
  if (!obj) {
    return {};
  }

  // Sort keys according to priority
  const sortedObj = sortTaskfileKeys(obj);

  // Format vars (uppercase variable names)
  if (sortedObj.vars) {
    sortedObj.vars = uppercaseVariableNames(sortedObj.vars);
  }

  // Format tasks (kebab-case task names, process commands)
  if (sortedObj.tasks) {
    const formattedTasks = kebabCaseTaskNames(sortedObj.tasks);

    // Process each task's commands to remove whitespace in template variables
    for (const taskName in formattedTasks) {
      const task = formattedTasks[taskName];
      if (task.cmds) {
        task.cmds = processCommands(task.cmds);
      }
    }

    sortedObj.tasks = formattedTasks;
  }

  // Handle tasks_with_templates or any other task-like sections
  for (const key in sortedObj) {
    if (
      key.startsWith("tasks_") &&
      typeof (sortedObj as any)[key] === "object"
    ) {
      const formattedTasks = kebabCaseTaskNames((sortedObj as any)[key]);

      // Process each task's commands to remove whitespace in template variables
      for (const taskName in formattedTasks) {
        const task = formattedTasks[taskName];
        if (task.cmds) {
          task.cmds = processCommands(task.cmds);
        }
      }

      (sortedObj as any)[key] = formattedTasks;
    }
  }

  return sortedObj;
}
