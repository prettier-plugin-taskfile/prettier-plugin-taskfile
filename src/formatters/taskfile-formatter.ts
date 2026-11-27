import * as yaml from "yaml";
import { Taskfile, TaskfileFormattingOptions } from "../types";
import { formatTaskfileDocument } from "../ast/format-document";

/**
 * Formats a Taskfile object according to the style guide.
 *
 * @param obj The Taskfile object
 * @returns A formatted Taskfile object
 */
export function formatTaskfile(
  obj: Taskfile,
  options: TaskfileFormattingOptions = {},
): Taskfile {
  if (!obj) {
    return {};
  }

  return formatTaskfileDocument(new yaml.Document(obj), options).toJS();
}
