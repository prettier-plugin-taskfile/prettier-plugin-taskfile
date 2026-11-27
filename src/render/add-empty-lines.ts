import { isMap, isNode, isScalar, YAMLMap } from "yaml";
import { isTaskLikeSection } from "../rules/is-task-like-section";
import { applyRenderEdits, RenderEdit } from "./apply-render-edits";
import { SerializedYamlContext } from "./serialized-yaml-context";

export function addEmptyLines(yamlStr: string): string {
  const context = new SerializedYamlContext(yamlStr);
  return applyRenderEdits(yamlStr, planEmptyLines(context));
}

export function planEmptyLines(context: SerializedYamlContext): RenderEdit[] {
  const { document, lines, lineOffsets: offsets } = context;
  if (document.errors.length > 0 || !isMap(document.contents)) {
    return [];
  }

  const insertBefore = new Set<number>();

  const separatePairs = (map: YAMLMap): void => {
    if (map.flow) return;
    for (const pair of map.items.slice(1)) {
      if (!isNode(pair.key) || !pair.key.range) continue;
      const keyOffset = pair.key.range[0];
      let line = context.lineAt(keyOffset);
      if (line < 1 || context.insideScalar(line)) continue;

      // Keep comments attached to the section or task they describe.
      while (
        line > 0 &&
        !context.insideScalar(line - 1) &&
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
      if (context.followsKeepChomp(line)) continue;
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

  const edits: RenderEdit[] = [];
  let previousLine: string | undefined;
  for (let line = 0; line < lines.length; line++) {
    if (
      lines[line].trim() === "" &&
      !context.insideScalar(line) &&
      (previousLine === undefined || previousLine.trim() === "") &&
      line !== lines.length - 1
    ) {
      edits.push({ start: offsets[line], end: offsets[line + 1] });
      continue;
    }
    if (insertBefore.has(line))
      edits.push({ start: offsets[line], text: "\n" });
    previousLine = lines[line];
  }
  return edits;
}
