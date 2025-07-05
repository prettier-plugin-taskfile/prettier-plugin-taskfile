import { TASKFILE_KEY_PRIORITY } from "../constants";
import { Taskfile } from "../types";

/**
 * Sorts the keys of a Taskfile according to the style guide.
 *
 * @param obj The parsed YAML object
 * @returns A new object with sorted keys
 */
export function sortTaskfileKeys(obj: Taskfile): Taskfile {
  // Handle null or undefined input
  if (!obj) {
    return {};
  }

  // Create a new object to store the sorted keys
  const sortedObj: Taskfile = {};

  // First, add keys in the priority order
  for (const key of TASKFILE_KEY_PRIORITY) {
    if (key in obj) {
      (sortedObj as any)[key] = obj[key];
    }
  }

  // Then add any remaining keys in alphabetical order
  const remainingKeys = Object.keys(obj)
    .filter((key) => !TASKFILE_KEY_PRIORITY.includes(key as any))
    .sort();

  for (const key of remainingKeys) {
    (sortedObj as any)[key] = obj[key];
  }

  return sortedObj;
}
