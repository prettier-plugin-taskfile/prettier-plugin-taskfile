import { Plugin } from "prettier";
import * as yaml from "yaml";
import { TASKFILE_FILENAMES } from "./constants";
import { formatTaskfileDocument } from "./formatters";
import { getYamlOptions, addEmptyLines } from "./utils";

function createTaskfileDocument(text: string): yaml.Document {
  const doc = yaml.parseDocument(text);
  (doc as any)._sourceText = text;
  return doc;
}

function printTaskfileDocument(doc: yaml.Document): string {
  const sourceText = (doc as any)._sourceText;
  formatTaskfileDocument(doc, sourceText);

  Object.assign(doc.options, getYamlOptions());

  let yamlStr = doc.toString();
  yamlStr = addEmptyLines(yamlStr);

  return yamlStr;
}

/**
 * Prettier plugin for Taskfile YAML formatting
 */
export const plugin: Plugin = {
  languages: [
    {
      name: "TaskfileYAML",
      extensions: [], // Empty array to avoid matching all .yml/.yaml files
      parsers: ["taskfile-yaml"],
      filenames: [...TASKFILE_FILENAMES],
    },
  ],
  parsers: {
    "taskfile-yaml": {
      parse: (text: string) => {
        try {
          return createTaskfileDocument(text);
        } catch (error) {
          console.error("Failed to parse YAML:", error);
          throw new Error(
            `Invalid YAML: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
      astFormat: "taskfile-yaml",
      locStart: (node: any) => {
        // Use stored start position if available
        if (node && node.start !== undefined) {
          return node.start;
        }
        // Fall back to range if available
        if (node && node.range && Array.isArray(node.range)) {
          return node.range[0];
        }
        return 0;
      },
      locEnd: (node: any) => {
        // Use stored end position if available
        if (node && node.end !== undefined) {
          return node.end;
        }
        // Fall back to range if available
        if (node && node.range && Array.isArray(node.range)) {
          return node.range[1];
        }
        return 0;
      },
    },
  },
  printers: {
    "taskfile-yaml": {
      print: (path) => {
        try {
          return printTaskfileDocument(path.getNode());
        } catch (error) {
          console.error("Failed to format Taskfile:", error);

          // If the error has location information, re-throw preserving it
          if (
            error instanceof Error &&
            (error as any).start !== undefined &&
            (error as any).end !== undefined
          ) {
            (error as any).loc = {
              start: { line: 0, column: (error as any).start },
              end: { line: 0, column: (error as any).end },
            };
            throw error;
          }

          throw new Error(
            `Formatting failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    },
  },
};

export function formatTaskfileText(text: string): string {
  const parser = plugin.parsers!["taskfile-yaml"];
  const doc = parser.parse(text, {} as any) as yaml.Document;

  return printTaskfileDocument(doc);
}

export function checkTaskfileFormatting(text: string): boolean {
  return formatTaskfileText(text) === text;
}
