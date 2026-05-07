import * as yaml from "yaml";
import { formatTaskfileDocument as formatDocument } from "../ast/format-document";

export function formatTaskfileDocument(
  doc: yaml.Document,
  _sourceText?: string,
): yaml.Document {
  return formatDocument(doc);
}
