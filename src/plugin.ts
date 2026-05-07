import { Plugin } from "prettier";
import { TASKFILE_FILENAMES } from "./constants";
import {
  checkTaskfileFormatting,
  createTaskfileDocument,
  formatTaskfileText,
  printTaskfileDocument,
} from "./api/format-taskfile-text";

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
        if (node && node.start !== undefined) {
          return node.start;
        }
        if (node && node.range && Array.isArray(node.range)) {
          return node.range[0];
        }
        return 0;
      },
      locEnd: (node: any) => {
        if (node && node.end !== undefined) {
          return node.end;
        }
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
export { formatTaskfileText, checkTaskfileFormatting };
