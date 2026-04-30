import { REGEX_PATTERNS } from "../constants";

export function normalizeTemplateWhitespace(text: string): string {
  return text.replace(REGEX_PATTERNS.TEMPLATE_WHITESPACE, "{{.$1}}");
}

export function normalizeCommand<T>(command: T): T | string {
  if (typeof command === "string") {
    return normalizeTemplateWhitespace(command);
  }

  return command;
}
