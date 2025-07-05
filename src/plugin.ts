import { Plugin } from "prettier";
import * as yaml from "yaml";
import { TASKFILE_FILENAMES } from "./constants";
import { formatTaskfile } from "./formatters";
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
          // Parse the YAML
          const obj = yaml.parse(text);
          return obj;
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
          const obj = path.getValue();

          // Format the Taskfile
          const formattedObj = formatTaskfile(obj);

          // Convert to YAML
          const yamlOptions = getYamlOptions();
          let yamlStr = yaml.stringify(formattedObj, yamlOptions);

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
