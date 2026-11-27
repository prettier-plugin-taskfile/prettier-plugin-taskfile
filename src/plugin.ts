import { Plugin } from "prettier";
import { TASKFILE_FILENAMES } from "./constants";
import {
  checkTaskfileFormatting,
  createTaskfileDocument,
  formatTaskfileText,
  formatTaskfileTextWithDiagnostics,
  printTaskfileDocument,
} from "./api/format-taskfile-text";
import { TaskfileFormattingOptions } from "./types";

/**
 * Prettier plugin for Taskfile YAML formatting
 */
export const plugin: Plugin = {
  options: {
    taskfileFlowSequencePadding: {
      type: "boolean",
      category: "Taskfile",
      default: false,
      description: "Add inner spaces to single-line flow sequences.",
    },
    taskfileNormalizeNames: {
      type: "boolean",
      category: "Taskfile",
      default: true,
      description:
        "Normalize Taskfile names and recognized references when safe.",
    },
    taskfileAllowRenamesWithIncludes: {
      type: "boolean",
      category: "Taskfile",
      default: false,
      description:
        "Allow local renaming with includes without checking or rewriting external Taskfiles.",
    },
    taskfileUnsafeRenames: {
      type: "choice",
      category: "Taskfile",
      default: "preserve",
      description:
        "Preserve names or fail when safe renaming cannot be established.",
      choices: [
        {
          value: "preserve",
          description: "Preserve all names in unsafe documents.",
        },
        { value: "error", description: "Reject unsafe name normalization." },
      ],
    },
  },
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
      print: (path, options) => {
        try {
          return printTaskfileDocument(
            path.getNode(),
            options as TaskfileFormattingOptions,
          );
        } catch (error) {
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
export {
  formatTaskfileText,
  formatTaskfileTextWithDiagnostics,
  checkTaskfileFormatting,
};
