/**
 * Type definitions for Taskfile structures
 */

export interface TaskfileVars {
  [key: string]: string | number | boolean;
}

export interface TaskfileEnv {
  [key: string]: string;
}

export interface TaskCommand {
  cmd?: string;
  task?: string;
  silent?: boolean;
  ignore_error?: boolean;
  defer?: boolean;
  [key: string]: any;
}

export interface Task {
  desc?: string;
  summary?: string;
  aliases?: string[];
  cmds?: (string | TaskCommand)[];
  deps?: string[];
  preconditions?: any[];
  vars?: TaskfileVars;
  env?: TaskfileEnv;
  dir?: string;
  sources?: string[];
  generates?: string[];
  status?: string[];
  method?: "timestamp" | "checksum" | "none";
  prefix?: string;
  silent?: boolean;
  interactive?: boolean;
  internal?: boolean;
  [key: string]: any;
}

export interface TaskfileTasks {
  [taskName: string]: Task;
}

export interface TaskfileInclude {
  taskfile: string;
  dir?: string;
  optional?: boolean;
  internal?: boolean;
  aliases?: string[];
  vars?: TaskfileVars;
}

export interface TaskfileIncludes {
  [alias: string]: string | TaskfileInclude;
}

export interface Taskfile {
  version?: string;
  includes?: TaskfileIncludes;
  vars?: TaskfileVars;
  env?: TaskfileEnv;
  tasks?: TaskfileTasks;
  [key: string]: any; // For custom sections like tasks_with_templates
}

export interface YamlStringifyOptions {
  indent?: number;
  lineWidth?: number;
  prettyErrors?: boolean;
  blockQuote?: boolean;
  flowLevel?: number;
  defaultType?: string;
}
