import { REGEX_PATTERNS } from "../constants";

/**
 * Adds empty lines between main sections and tasks according to the style guide.
 *
 * Uses an "append after previous block" model:
 * - Comment lines are buffered until the next non-comment line is seen.
 * - When a section header or task definition is encountered, a blank line is
 *   appended after the previous block ends (i.e. emitted before any buffered
 *   comments that belong to the new block).
 *
 * @param yamlStr The YAML string
 * @returns The YAML string with empty lines added
 */
export function addEmptyLines(yamlStr: string): string {
  const lines = yamlStr.split("\n");
  const result: string[] = [];
  let inMultiLineString = false;
  let multiLineStringIndent = 0;
  let inTasksSection = false;

  // True once any body-content line has been emitted after the most recent
  // section or task header. Used to decide whether a blank line is needed
  // before the next header.
  let hasContentAfterLastHeader = false;

  // Lines buffered while we don't yet know whether they belong to the
  // current block (content) or are the leading-comment of the next block.
  let commentBuffer: string[] = [];

  /** Emit a blank line if the previous block had content and the result
   *  doesn't already end with a blank line. */
  const emitBlankIfNeeded = (): void => {
    if (
      hasContentAfterLastHeader &&
      result.length > 0 &&
      result[result.length - 1].trim() !== ""
    ) {
      result.push("");
    }
  };

  /** Flush buffered comments into result as plain content (no blank before). */
  const flushCommentsAsContent = (): void => {
    if (commentBuffer.length > 0) {
      result.push(...commentBuffer);
      commentBuffer = [];
      hasContentAfterLastHeader = true;
    }
  };

  /** Flush buffered comments into result as the leading-comment of the next
   *  block. A blank line has already been emitted by the caller if needed. */
  const flushCommentsAsBlockHeader = (): void => {
    if (commentBuffer.length > 0) {
      result.push(...commentBuffer);
      commentBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    const indent = line.length - line.trimStart().length;

    // ── Multi-line string tracking ──────────────────────────────────────────
    if (!inMultiLineString) {
      if (trimmedLine.endsWith("|") || trimmedLine.endsWith(">")) {
        inMultiLineString = true;
        multiLineStringIndent = indent;
      }
    } else if (trimmedLine !== "" && indent <= multiLineStringIndent) {
      // First line that exits the multi-line block
      inMultiLineString = false;
    }

    // Inside a multi-line string: treat everything as raw content.
    // Any comments that were buffered before the `|` / `>` line are regular
    // content too (they appeared inside a task body).
    if (inMultiLineString) {
      flushCommentsAsContent();
      result.push(line);
      hasContentAfterLastHeader = true;
      continue;
    }

    // ── Empty lines ─────────────────────────────────────────────────────────
    // Pass them through immediately; the MULTIPLE_EMPTY_LINES cleanup at the
    // end handles any excess.
    if (trimmedLine === "") {
      flushCommentsAsContent();
      result.push(line);
      continue;
    }

    // ── Comment lines ───────────────────────────────────────────────────────
    // Buffer them — we decide what to do when the next non-comment line arrives.
    if (trimmedLine.startsWith("#")) {
      commentBuffer.push(line);
      continue;
    }

    // ── Determine whether this line opens a new block ───────────────────────
    const isMainSection = !!trimmedLine.match(REGEX_PATTERNS.MAIN_SECTION);
    const isTasksHeader = !!trimmedLine.match(
      /^(tasks|tasks_with_templates):$/,
    );
    const isTaskDefinition =
      !isTasksHeader &&
      inTasksSection &&
      !!line.match(REGEX_PATTERNS.TASK_DEFINITION);

    if (isMainSection || isTaskDefinition) {
      // ── Start of a new block ─────────────────────────────────────────────
      // 1. Emit blank after the previous block (before buffered comments).
      emitBlankIfNeeded();
      // 2. Flush buffered leading-comments of this new block.
      flushCommentsAsBlockHeader();
      // 3. Update section-tracking state.
      if (isMainSection) {
        inTasksSection = isTasksHeader;
      }
      hasContentAfterLastHeader = false;
    } else {
      // ── Body content of the current block ────────────────────────────────
      flushCommentsAsContent();
      hasContentAfterLastHeader = true;
    }

    result.push(line);
  }

  // Flush any trailing buffered comments.
  if (commentBuffer.length > 0) {
    result.push(...commentBuffer);
  }

  return result
    .join("\n")
    .replace(REGEX_PATTERNS.MULTIPLE_EMPTY_LINES, "\n\n")
    .replace(/^\n+/, "");
}
