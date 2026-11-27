import type { Document } from "yaml";
import type { TaskfileFormattingOptions } from "../types";
import { planEmptyLines } from "./add-empty-lines";
import { applyRenderEdits } from "./apply-render-edits";
import { planFlowCollectionPadding } from "./flow-collection-padding";
import { SerializedYamlContext } from "./serialized-yaml-context";
import { getYamlOptions } from "./yaml-options";

/** Serializes and renders without applying AST transformations. */
export function renderTaskfileDocument(
  document: Document,
  options: TaskfileFormattingOptions = {},
): string {
  const context = new SerializedYamlContext(
    document.toString(getYamlOptions()),
  );
  // Boundary padding cannot turn a collection line into a structural blank line.
  return applyRenderEdits(context.text, [
    ...planFlowCollectionPadding(context, options),
    ...planEmptyLines(context),
  ]);
}
