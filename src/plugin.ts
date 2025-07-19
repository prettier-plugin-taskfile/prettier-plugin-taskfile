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
      parse: (text: string, options: any) => {
        try {
          // Parse the YAML as a Document to preserve comments
          const doc = yaml.parseDocument(text);

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
      locStart: () => 0,
      locEnd: () => 0,
    },
  },
  printers: {
    "taskfile-yaml": {
      print: (path: any) => {
        try {
          const doc = path.getValue();

          // Format the document while preserving comments
          formatTaskfileDocument(doc);

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
          throw new Error(
            `Formatting failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }
      },
    },
  },
};
