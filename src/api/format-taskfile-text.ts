import * as yaml from "yaml";
import { formatTaskfileDocument } from "../ast/format-document";
import { addEmptyLines } from "../render/add-empty-lines";
import { formatFlowCollectionPadding } from "../render/flow-collection-padding";
import { getYamlOptions } from "../render/yaml-options";
import {
  TaskfileDiagnostic,
  TaskfileFormattingOptions,
  TaskfileFormattingResult,
} from "../types";

export function createTaskfileDocument(text: string): yaml.Document {
  let doc: yaml.Document;
  try {
    doc = yaml.parseDocument(text);
  } catch (error) {
    throw new Error(
      `Invalid YAML: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
  if (doc.errors.length > 0)
    throw new Error(
      `Invalid YAML: ${doc.errors.map((error) => error.message).join(" ")}`,
    );
  return doc;
}

export function printTaskfileDocument(
  doc: yaml.Document,
  options: TaskfileFormattingOptions = {},
  diagnostics: TaskfileDiagnostic[] = [],
): string {
  formatTaskfileDocument(doc, options, diagnostics);

  return addEmptyLines(
    formatFlowCollectionPadding(doc.toString(getYamlOptions()), options),
  );
}

export function formatTaskfileText(
  text: string,
  options: TaskfileFormattingOptions = {},
): string {
  return formatTaskfileTextWithDiagnostics(text, options).text;
}

export function formatTaskfileTextWithDiagnostics(
  text: string,
  options: TaskfileFormattingOptions = {},
): TaskfileFormattingResult {
  const diagnostics: TaskfileDiagnostic[] = [];
  const formatted = printTaskfileDocument(
    createTaskfileDocument(text),
    options,
    diagnostics,
  );
  return { text: formatted, diagnostics: Object.freeze(diagnostics) };
}

export function checkTaskfileFormatting(
  text: string,
  options: TaskfileFormattingOptions = {},
): boolean {
  return formatTaskfileText(text, options) === text;
}
