import { DEFAULT_YAML_OPTIONS } from "../constants";
import { YamlStringifyOptions } from "../types";

/**
 * Customizes the YAML stringify options to follow the style guide.
 *
 * @returns YAML stringify options
 */
export function getYamlOptions(): YamlStringifyOptions {
  return { ...DEFAULT_YAML_OPTIONS };
}
