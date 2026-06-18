import { Plugin } from "prettier";
import * as yamlPlugin from "prettier/plugins/yaml";
import { TASKFILE_FILENAMES } from "./constants";
import {
  checkTaskfileFormatting,
  formatTaskfileText,
} from "./api/format-taskfile-text";

const builtinParser = (yamlPlugin as any).parsers.yaml;

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
      preprocess: (text: string) => formatTaskfileText(text),
      parse: (text: string) => builtinParser.parse(text),
      astFormat: "yaml",
      locStart: builtinParser.locStart,
      locEnd: builtinParser.locEnd,
    },
  },
};
export { formatTaskfileText, checkTaskfileFormatting };
