import * as yaml from "yaml";
import { formatTaskfileDocument } from "../ast/format-document";
import { addEmptyLines } from "../render/add-empty-lines";
import { getYamlOptions } from "../render/yaml-options";

export function createTaskfileDocument(text: string): yaml.Document {
  return yaml.parseDocument(text);
}

export function printTaskfileDocument(doc: yaml.Document): string {
  formatTaskfileDocument(doc);

  return addEmptyLines(doc.toString(getYamlOptions()));
}

export function formatTaskfileText(text: string): string {
  return printTaskfileDocument(createTaskfileDocument(text));
}

export function checkTaskfileFormatting(text: string): boolean {
  return formatTaskfileText(text) === text;
}
