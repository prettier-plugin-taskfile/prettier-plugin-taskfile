import * as yaml from "yaml";
import { normalizeVariableName } from "../rules/normalize-variable-name";

export function formatVarsSection(varsMap: yaml.YAMLMap): void {
  varsMap.items.forEach((item) => {
    if (yaml.isScalar(item.key) && typeof item.key.value === "string") {
      item.key.value = normalizeVariableName(item.key.value);
    }
  });
}
