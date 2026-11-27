import { isMap, parseDocument, visit } from "yaml";
import type { TaskfileFormattingOptions } from "../types";

export function formatFlowCollectionPadding(
  text: string,
  options: TaskfileFormattingOptions = {},
): string {
  if (
    options.taskfileFlowSequencePadding === true &&
    options.bracketSpacing !== false
  )
    return text;
  const document = parseDocument(text, { keepSourceTokens: true });
  if (document.errors.length > 0) return text;
  const removals = new Set<number>();
  visit(document, {
    Collection(_key, node) {
      const padded = isMap(node)
        ? options.bracketSpacing !== false
        : options.taskfileFlowSequencePadding === true;
      const token = node.srcToken;
      if (
        padded ||
        node.items.length === 0 ||
        token?.type !== "flow-collection"
      )
        return;
      const closing = token.end.find(
        (part) => part.type === "flow-map-end" || part.type === "flow-seq-end",
      );
      if (
        !closing ||
        text.slice(token.start.offset, closing.offset).includes("\n")
      )
        return;
      // Only remove serializer padding at actual collection boundaries.
      for (const offset of [token.start.offset + 1, closing.offset - 1])
        if (text[offset] === " ") removals.add(offset);
    },
  });
  const parts: string[] = [];
  let start = 0;
  for (const offset of [...removals].sort((a, b) => a - b)) {
    parts.push(text.slice(start, offset));
    start = offset + 1;
  }
  parts.push(text.slice(start));
  return parts.join("");
}
