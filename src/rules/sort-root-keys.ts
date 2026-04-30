import { TASKFILE_KEY_PRIORITY } from "../constants";

export function compareRootKeys(keyA: string, keyB: string): number {
  const indexA = TASKFILE_KEY_PRIORITY.indexOf(
    keyA as (typeof TASKFILE_KEY_PRIORITY)[number],
  );
  const indexB = TASKFILE_KEY_PRIORITY.indexOf(
    keyB as (typeof TASKFILE_KEY_PRIORITY)[number],
  );

  if (indexA !== -1 && indexB !== -1) {
    return indexA - indexB;
  }
  if (indexA !== -1) {
    return -1;
  }
  if (indexB !== -1) {
    return 1;
  }

  return keyA.localeCompare(keyB);
}

export function sortRootKeys(keys: readonly string[]): string[] {
  return [...keys].sort(compareRootKeys);
}
