import { isMap, isNode, isScalar, parseDocument, visit, YAMLMap } from "yaml";
import { isTaskLikeSection } from "../rules/is-task-like-section";

export function addEmptyLines(yamlStr: string): string {
  const document = parseDocument(yamlStr, { keepSourceTokens: true });
  if (document.errors.length > 0 || !isMap(document.contents)) {
    return yamlStr;
  }

  const lines = yamlStr.split("\n");
  const offsets: number[] = [];
  let offset = 0;
  for (const line of lines) {
    offsets.push(offset);
    offset += line.length + 1;
  }

  const scalarRanges: [number, number][] = [];
  const keepChompRanges: [number, number][] = [];
  visit(document, {
    Scalar(_key, scalar) {
      if (!scalar.range) return;
      const range: [number, number] = [scalar.range[0], scalar.range[1]];
      scalarRanges.push(range);
      if (
        scalar.srcToken?.type === "block-scalar" &&
        scalar.srcToken.props.some(
          (token) =>
            token.type === "block-scalar-header" && token.source.includes("+"),
        )
      ) {
        keepChompRanges.push(range);
      }
    },
  });

  const insideScalar = (line: number): boolean =>
    scalarRanges.some(
      ([start, end]) => offsets[line] > start && offsets[line] < end,
    );
  const insertBefore = new Set<number>();

  const separatePairs = (map: YAMLMap): void => {
    if (map.flow) return;
    for (const pair of map.items.slice(1)) {
      if (!isNode(pair.key) || !pair.key.range) continue;
      const keyOffset = pair.key.range[0];
      let line = offsets.findIndex(
        (start, index) =>
          start <= keyOffset &&
          (index === offsets.length - 1 || offsets[index + 1] > keyOffset),
      );
      if (line < 1 || insideScalar(line)) continue;

      // Keep comments attached to the section or task they describe.
      while (
        line > 0 &&
        !insideScalar(line - 1) &&
        (/^\s*#/.test(lines[line - 1]) || lines[line - 1].trim() === "")
      ) {
        line--;
      }
      if (
        line === 0 ||
        lines[line].trim() === "" ||
        lines[line - 1].trim() === ""
      ) {
        continue;
      }
      // A blank line immediately after |+ or >+ becomes scalar content.
      if (
        keepChompRanges.some(
          ([start, end]) =>
            offsets[line - 1] + lines[line - 1].length >= start &&
            offsets[line] <= end,
        )
      ) {
        continue;
      }
      insertBefore.add(line);
    }
  };

  separatePairs(document.contents);
  // Retain legacy template-section spacing without treating it as task schema.
  for (const pair of document.contents.items) {
    if (
      isScalar(pair.key) &&
      typeof pair.key.value === "string" &&
      (isTaskLikeSection(pair.key.value) ||
        pair.key.value === "tasks_with_templates") &&
      isMap(pair.value)
    ) {
      separatePairs(pair.value);
    }
  }

  const result: string[] = [];
  for (let line = 0; line < lines.length; line++) {
    if (
      lines[line].trim() === "" &&
      !insideScalar(line) &&
      (result.length === 0 || result[result.length - 1].trim() === "") &&
      line !== lines.length - 1
    ) {
      continue;
    }
    if (insertBefore.has(line)) result.push("");
    result.push(lines[line]);
  }
  return result.join("\n");
}
