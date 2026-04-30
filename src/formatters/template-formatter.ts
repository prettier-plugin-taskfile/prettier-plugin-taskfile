import {
  normalizeCommand,
  normalizeTemplateWhitespace,
} from "../rules/normalize-template-whitespace";

/**
 * Removes whitespace in template variables according to the style guide.
 *
 * @param text The text to process
 * @returns The text with whitespace removed from template variables
 */
export function removeTemplateWhitespace(text: string): string {
  return normalizeTemplateWhitespace(text);
}

/**
 * Processes command strings to remove whitespace in template variables.
 *
 * @param cmds Array of command strings
 * @returns Processed array of command strings
 */
export function processCommands<T>(cmds: T[]): (T | string)[] {
  if (!cmds) return cmds;

  return cmds.map((cmd) => normalizeCommand(cmd));
}
