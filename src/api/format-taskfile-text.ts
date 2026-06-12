import * as yaml from "yaml";
import { formatTaskfileDocument } from "../ast/format-document";
import { addEmptyLines } from "../render/add-empty-lines";
import { getYamlOptions, PrettierOptions } from "../render/yaml-options";

export function createTaskfileDocument(text: string): yaml.Document {
  return yaml.parseDocument(text);
}

export function printTaskfileDocument(doc: yaml.Document, prettierOptions?: PrettierOptions): string {
  formatTaskfileDocument(doc);

  return addEmptyLines(doc.toString(getYamlOptions(prettierOptions)));
}

export function formatTaskfileText(text: string, prettierOptions?: PrettierOptions): string {
  return printTaskfileDocument(createTaskfileDocument(text), prettierOptions);
}

export function checkTaskfileFormatting(text: string, prettierOptions?: PrettierOptions): boolean {
  return formatTaskfileText(text, prettierOptions) === text;
}
