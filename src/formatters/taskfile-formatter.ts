import { Taskfile } from "../types";
import { sortTaskfileKeys } from "./key-sorter";
import { uppercaseVariableNames } from "./variable-formatter";
import { kebabCaseTaskNames } from "./task-formatter";
import { processCommands } from "./template-formatter";
import { isTaskLikeSection } from "../rules/is-task-like-section";

function formatTaskCollection(tasks: Record<string, any>): Record<string, any> {
  const formattedTasks = kebabCaseTaskNames(tasks);

  for (const taskName in formattedTasks) {
    const task = formattedTasks[taskName];
    if (task?.cmds) {
      task.cmds = processCommands(task.cmds);
    }
  }

  return formattedTasks;
}

/**
 * Formats a Taskfile object according to the style guide.
 *
 * @param obj The Taskfile object
 * @returns A formatted Taskfile object
 */
export function formatTaskfile(obj: Taskfile): Taskfile {
  if (!obj) {
    return {};
  }

  const sortedObj = sortTaskfileKeys(obj);

  if (sortedObj.vars) {
    sortedObj.vars = uppercaseVariableNames(sortedObj.vars);
  }

  if (sortedObj.tasks) {
    sortedObj.tasks = formatTaskCollection(sortedObj.tasks);
  }

  for (const key in sortedObj) {
    if (
      isTaskLikeSection(key) &&
      key !== "tasks" &&
      typeof (sortedObj as any)[key] === "object" &&
      (sortedObj as any)[key] !== null
    ) {
      (sortedObj as any)[key] = formatTaskCollection((sortedObj as any)[key]);
    }
  }

  return sortedObj;
}
