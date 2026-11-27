import type { Document } from "yaml";
import type { TaskfileFormattingOptions } from "../types";
import { addEmptyLines } from "./add-empty-lines";
import { formatFlowCollectionPadding } from "./flow-collection-padding";
import { getYamlOptions } from "./yaml-options";

/** Serializes and renders without applying AST transformations. */
export function renderTaskfileDocument(
  document: Document,
  options: TaskfileFormattingOptions = {},
): string {
  return addEmptyLines(
    formatFlowCollectionPadding(document.toString(getYamlOptions()), options),
  );
}
