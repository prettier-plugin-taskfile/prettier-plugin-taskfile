import { isMap, visit } from "yaml";
import type { TaskfileFormattingOptions } from "../types";
import { applyRenderEdits, RenderEdit } from "./apply-render-edits";
import { SerializedYamlContext } from "./serialized-yaml-context";

export function formatFlowCollectionPadding(
  text: string,
  options: TaskfileFormattingOptions = {},
): string {
  const context = new SerializedYamlContext(text);
  return applyRenderEdits(text, planFlowCollectionPadding(context, options));
}

export function planFlowCollectionPadding(
  context: SerializedYamlContext,
  options: TaskfileFormattingOptions = {},
): RenderEdit[] {
  if (
    options.taskfileFlowSequencePadding === true &&
    options.bracketSpacing !== false
  )
    return [];
  const { document, text } = context;
  if (document.errors.length > 0) return [];
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
  return [...removals].map((start) => ({ start, end: start + 1 }));
}
