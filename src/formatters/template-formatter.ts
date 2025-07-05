import { REGEX_PATTERNS } from "../constants";

/**
 * Removes whitespace in template variables according to the style guide.
 *
 * @param text The text to process
 * @returns The text with whitespace removed from template variables
 */
export function removeTemplateWhitespace(text: string): string {
  // Replace {{ .VAR }} with {{.VAR}}
  return text.replace(REGEX_PATTERNS.TEMPLATE_WHITESPACE, "{{.$1}}");
}

/**
 * Processes command strings to remove whitespace in template variables.
 *
 * @param cmds Array of command strings
 * @returns Processed array of command strings
 */
export function processCommands(cmds: any[]): any[] {
  if (!cmds) return cmds;

  return cmds.map((cmd) => {
    if (typeof cmd === "string") {
      return removeTemplateWhitespace(cmd);
    }
    return cmd;
  });
}
