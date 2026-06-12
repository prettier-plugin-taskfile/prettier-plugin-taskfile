import { DEFAULT_YAML_OPTIONS } from "../constants";
import { YamlStringifyOptions } from "../types";

export interface PrettierOptions {
  tabWidth?: number;
  printWidth?: number;
  singleQuote?: boolean;
}

export function getYamlOptions(prettierOptions?: PrettierOptions): YamlStringifyOptions {
  const options: YamlStringifyOptions = { ...DEFAULT_YAML_OPTIONS };

  if (prettierOptions) {
    if (prettierOptions.tabWidth !== undefined) {
      options.indent = prettierOptions.tabWidth;
    }
    if (prettierOptions.printWidth !== undefined && prettierOptions.printWidth !== Infinity) {
      options.lineWidth = prettierOptions.printWidth;
    }
    if (prettierOptions.singleQuote !== undefined) {
      options.singleQuote = prettierOptions.singleQuote;
    }
  }

  return options;
}
