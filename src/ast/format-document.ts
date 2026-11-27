import * as yaml from "yaml";
import { formatRootMap } from "./format-root-map";
import { TaskfileDiagnostic, TaskfileFormattingOptions } from "../types";

export function formatTaskfileDocument(
  doc: yaml.Document,
  options: TaskfileFormattingOptions = {},
  diagnostics: TaskfileDiagnostic[] = [],
): yaml.Document {
  if (doc.errors.length > 0) {
    throw new Error(
      `Invalid YAML: ${doc.errors.map((error) => error.message).join(" ")}`,
    );
  }
  if (!doc.contents || !yaml.isMap(doc.contents)) {
    return doc;
  }

  formatRootMap(doc.contents, options, diagnostics);

  return doc;
}
