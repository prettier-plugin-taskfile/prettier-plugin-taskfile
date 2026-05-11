import { REGEX_PATTERNS } from "../constants";

export function addEmptyLines(yamlStr: string): string {
  const lines = yamlStr.split("\n");
  const result: string[] = [];
  let inMultiLineString = false;
  let multiLineStringIndent = 0;
  let inTasksSection = false;
  let hasContentAfterLastHeader = false;
  let commentBuffer: string[] = [];

  const emitBlankIfNeeded = (): void => {
    if (
      hasContentAfterLastHeader &&
      result.length > 0 &&
      result[result.length - 1].trim() !== ""
    ) {
      result.push("");
    }
  };

  const flushCommentsAsContent = (): void => {
    if (commentBuffer.length > 0) {
      result.push(...commentBuffer);
      commentBuffer = [];
      hasContentAfterLastHeader = true;
    }
  };

  const flushCommentsAsBlockHeader = (): void => {
    if (commentBuffer.length > 0) {
      result.push(...commentBuffer);
      commentBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    const indent = line.length - line.trimStart().length;

    if (!inMultiLineString) {
      if (trimmedLine.endsWith("|") || trimmedLine.endsWith(">")) {
        inMultiLineString = true;
        multiLineStringIndent = indent;
      }
    } else if (trimmedLine !== "" && indent <= multiLineStringIndent) {
      inMultiLineString = false;
    }

    if (inMultiLineString) {
      flushCommentsAsContent();
      result.push(line);
      hasContentAfterLastHeader = true;
      continue;
    }

    if (trimmedLine === "") {
      flushCommentsAsContent();
      result.push(line);
      continue;
    }

    if (trimmedLine.startsWith("#")) {
      commentBuffer.push(line);
      continue;
    }

    const isMainSection = !!line.match(REGEX_PATTERNS.MAIN_SECTION);
    const isTasksHeader = !!trimmedLine.match(
      /^(tasks|tasks_with_templates):$/,
    );
    const isTaskDefinition =
      !isTasksHeader &&
      inTasksSection &&
      !!line.match(REGEX_PATTERNS.TASK_DEFINITION);

    if (isMainSection || isTaskDefinition) {
      emitBlankIfNeeded();
      flushCommentsAsBlockHeader();
      if (isMainSection) {
        inTasksSection = isTasksHeader;
      }
      hasContentAfterLastHeader = false;
    } else {
      flushCommentsAsContent();
      hasContentAfterLastHeader = true;
    }

    result.push(line);
  }

  if (commentBuffer.length > 0) {
    result.push(...commentBuffer);
  }

  return result
    .join("\n")
    .replace(REGEX_PATTERNS.MULTIPLE_EMPTY_LINES, "\n\n")
    .replace(/^\n+/, "");
}
