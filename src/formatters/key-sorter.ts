import { Taskfile } from "../types";
import { sortRootKeys } from "../rules/sort-root-keys";

/**
 * Sorts the keys of a Taskfile according to the style guide.
 *
 * @param obj The parsed YAML object
 * @returns A new object with sorted keys
 */
export function sortTaskfileKeys(obj: Taskfile): Taskfile {
  if (!obj) {
    return {};
  }

  const sortedObj: Taskfile = {};
  for (const key of sortRootKeys(Object.keys(obj))) {
    (sortedObj as any)[key] = obj[key];
  }

  return sortedObj;
}
