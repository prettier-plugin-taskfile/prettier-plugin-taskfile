import { TaskfileVars } from "../types";

/**
 * Converts variable names to uppercase according to the style guide.
 *
 * @param vars The vars object from the Taskfile
 * @returns A new vars object with uppercase keys
 */
export function uppercaseVariableNames(vars: TaskfileVars): TaskfileVars {
  if (!vars) return vars;

  const result: TaskfileVars = {};
  for (const key in vars) {
    result[key.toUpperCase()] = vars[key];
  }
  return result;
}
