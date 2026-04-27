import { REGEX_PATTERNS } from "../constants";

/**
 * Looks backward in `result` for a contiguous block of comment lines at `commentIndent`
 * and inserts an empty line before that block (if not already present).
 * If no leading comment block exists, inserts just before the last pushed line.
 */
function insertEmptyLineBeforeCommentBlock(
  result: string[],
  commentIndent: number,
): void {
  // Find the start of the preceding comment block
  let insertIndex = result.length; // position to insert empty line (before this index)

  for (let k = result.length - 1; k >= 0; k--) {
    const t = result[k].trim();
    const ind = result[k].length - result[k].trimStart().length;

    if (t.startsWith("#") && ind === commentIndent) {
      insertIndex = k;
    } else {
      break;
    }
  }

  // Only insert if the line just before insertIndex is not already empty
  if (insertIndex > 0 && result[insertIndex - 1].trim() !== "") {
    result.splice(insertIndex, 0, "");
  }
}

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
    // If the section is preceded by a comment block, put the empty line before the block
    if (i > 0 && !inMultiLineString) {
      const isMainSection = trimmedLine.match(REGEX_PATTERNS.MAIN_SECTION);

      if (
        isMainSection &&
        result.length > 0 &&
        result[result.length - 1].trim() !== ""
      ) {
        insertEmptyLineBeforeCommentBlock(result, 0);
      }
    }

    // Add empty line before task definitions (2-space indented keys ending with colon)
    // But not for variables in vars/env sections
    if (i > 0 && !inMultiLineString) {
      const isTaskDefinition = line.match(REGEX_PATTERNS.TASK_DEFINITION);

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
        result.length > 0 &&
        result[result.length - 1].trim() !== "" &&
        !trimmedLine.match(/^(tasks|tasks_with_templates):$/)
      ) {
        // Don't add empty line for the very first item under a tasks header
        // Find last non-empty line in result to check
        let lastNonEmpty = "";
        for (let k = result.length - 1; k >= 0; k--) {
          if (result[k].trim() !== "") {
            lastNonEmpty = result[k].trim();
            break;
          }
        }
        if (!lastNonEmpty.match(/^(tasks|tasks_with_templates):$/)) {
          insertEmptyLineBeforeCommentBlock(result, 2);
        }
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
