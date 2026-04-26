import { Plugin } from "prettier";
import * as yaml from "yaml";
import { TASKFILE_FILENAMES } from "./constants";
import { formatTaskfileDocument } from "./formatters";
import { getYamlOptions, addEmptyLines } from "./utils";

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
          // Parse the YAML as a Document to preserve comments
          const doc = yaml.parseDocument(text);

          // Store the source text in the document for later use
          // This allows us to check for comments during formatting
          (doc as any)._sourceText = text;

          // Return the document instead of the parsed object
          return doc;
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
          const doc = path.getNode();

          // Get the source text stored during parsing
          const sourceText = (doc as any)._sourceText;

          // Format the document while preserving comments
          formatTaskfileDocument(doc, sourceText);

          // Get YAML options
          const yamlOptions = getYamlOptions();

          // Apply formatting options to the document
          Object.assign(doc.options, yamlOptions);

          // Convert to YAML string
          let yamlStr = doc.toString();

          // Add empty lines
          yamlStr = addEmptyLines(yamlStr);

          return yamlStr;
        } catch (error) {
          console.error("Failed to format Taskfile:", error);
          
          // If the error has location information, re-throw preserving it
          if (error instanceof Error && (error as any).start !== undefined && (error as any).end !== undefined) {
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
