import { REGEX_PATTERNS } from "../constants";

/**
 * Adds empty lines between main sections and tasks according to the style guide.
 *
 * @param yamlStr The YAML string
 * @returns The YAML string with empty lines added
 */
export function addEmptyLines(yamlStr: string): string {
  const lines = yamlStr.split("\n");
  const result: string[] = [];
  let inMultiLineString = false;
  let multiLineStringIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const indent = line.length - line.trimStart().length;

    // Track multi-line string state
    if (trimmedLine.endsWith("|") || trimmedLine.endsWith(">")) {
      inMultiLineString = true;
      multiLineStringIndent = indent;
    } else if (
      inMultiLineString &&
      trimmedLine !== "" &&
      indent <= multiLineStringIndent
    ) {
      inMultiLineString = false;
    }

    // Add empty line before main sections (except first line)
    if (i > 0 && !inMultiLineString) {
      const isMainSection = trimmedLine.match(REGEX_PATTERNS.MAIN_SECTION);
      const prevLine = lines[i - 1];

      if (isMainSection && prevLine.trim() !== "") {
        result.push("");
      }
    }

    // Add empty line before task definitions (2-space indented keys ending with colon)
    // But not for variables in vars/env sections
    if (i > 0 && !inMultiLineString) {
      const isTaskDefinition = line.match(REGEX_PATTERNS.TASK_DEFINITION);
      const prevLine = lines[i - 1];
      const prevTrimmed = prevLine.trim();

      // Check if we're in a tasks or tasks_with_templates section
      let inTasksSection = false;
      for (let j = i - 1; j >= 0; j--) {
        const checkLine = lines[j].trim();
        if (checkLine.match(/^(tasks|tasks_with_templates):$/)) {
          inTasksSection = true;
          break;
        } else if (checkLine.match(/^(version|includes|vars|env):$/)) {
          break;
        }
      }

      if (
        isTaskDefinition &&
        inTasksSection &&
        prevTrimmed !== "" &&
        !prevTrimmed.match(/^(tasks|tasks_with_templates):$/) &&
        !result[result.length - 1]?.match(/^\s*$/)
      ) {
        result.push("");
      }
    }

    result.push(line);
  }

  // Clean up multiple consecutive empty lines
  const finalResult = result
    .join("\n")
    .replace(REGEX_PATTERNS.MULTIPLE_EMPTY_LINES, "\n\n");

  return finalResult;
}
