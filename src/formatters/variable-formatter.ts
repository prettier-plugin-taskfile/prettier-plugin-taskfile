import { TaskfileFormattingOptions, TaskfileVars } from "../types";
import { formatTaskfile } from "./taskfile-formatter";

/**
 * Converts variable names to uppercase according to the style guide.
 *
 * @param vars The vars object from the Taskfile
 * @returns A new vars object with uppercase keys
 */
export function uppercaseVariableNames(
  vars: TaskfileVars,
  options: TaskfileFormattingOptions = {},
): TaskfileVars {
  if (!vars) return vars;

  return formatTaskfile({ vars }, options).vars!;
}
