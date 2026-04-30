import { DEFAULT_YAML_OPTIONS } from "../constants";
import { YamlStringifyOptions } from "../types";

export function getYamlOptions(): YamlStringifyOptions {
  return { ...DEFAULT_YAML_OPTIONS };
}
