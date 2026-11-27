// https://taskfile.dev/docs/reference/templating#special-variables
const specialVariables = new Set([
  "CLI_ARGS",
  "CLI_ARGS_LIST",
  "CLI_FORCE",
  "CLI_SILENT",
  "CLI_VERBOSE",
  "CLI_OFFLINE",
  "CLI_ASSUME_YES",
  "TASK",
  "ALIAS",
  "TASK_EXE",
  "ROOT_TASKFILE",
  "ROOT_DIR",
  "TASKFILE",
  "TASKFILE_DIR",
  "TASK_DIR",
  "USER_WORKING_DIR",
  "FILE_PATH_SEPARATOR",
  "PATH_LIST_SEPARATOR",
  "CHECKSUM",
  "TIMESTAMP",
  "ITEM",
  "EXIT_CODE",
  "TASK_VERSION",
]);

export function isTaskSpecialVariable(name: string): boolean {
  return specialVariables.has(name);
}
