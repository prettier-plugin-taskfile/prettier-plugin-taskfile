import { REGEX_PATTERNS } from "../constants";

export function normalizeTemplateWhitespace(text: string): string {
  let result = "";
  let cursor = 0;

  while (cursor < text.length) {
    const start = text.indexOf("{{", cursor);
    if (start === -1) {
      return result + text.slice(cursor);
    }
    result += text.slice(cursor, start);

    let end = start + 2;
    let quote = "";
    let comment = false;
    for (; end < text.length; end++) {
      const char = text[end];
      if (comment) {
        if (text.startsWith("*/", end)) {
          comment = false;
          end++;
        }
      } else if (quote) {
        if (char === "\\" && quote !== "`") {
          end++;
        } else if (char === quote) {
          quote = "";
        }
      } else if (text.startsWith("/*", end)) {
        comment = true;
        end++;
      } else if (char === '"' || char === "'" || char === "`") {
        quote = char;
      } else if (text.startsWith("}}", end)) {
        break;
      }
    }

    if (end >= text.length) {
      return result + text.slice(start);
    }

    const action = text.slice(start, end + 2);
    result += action.replace(REGEX_PATTERNS.TEMPLATE_WHITESPACE, "{{$1}}");
    cursor = end + 2;
  }

  return result;
}

export function normalizeCommand<T>(command: T): T | string {
  if (typeof command === "string") {
    return normalizeTemplateWhitespace(command);
  }

  return command;
}
