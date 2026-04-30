import * as yaml from "yaml";
import { formatRootMap } from "./format-root-map";

export function formatTaskfileDocument(doc: yaml.Document): yaml.Document {
  if (!doc.contents || !yaml.isMap(doc.contents)) {
    return doc;
  }

  formatRootMap(doc.contents);

  return doc;
}
