import * as yaml from "yaml";
import { compareRootKeys } from "../rules/sort-root-keys";
import { isTaskLikeSection } from "../rules/is-task-like-section";
import { formatTaskSection } from "./format-task-section";
import { formatVarsSection } from "./format-vars-section";

export function formatRootMap(rootMap: yaml.YAMLMap): void {
  rootMap.items.sort((itemA, itemB) => {
    const keyA =
      yaml.isScalar(itemA.key) && typeof itemA.key.value === "string"
        ? itemA.key.value
        : "";
    const keyB =
      yaml.isScalar(itemB.key) && typeof itemB.key.value === "string"
        ? itemB.key.value
        : "";

    return compareRootKeys(keyA, keyB);
  });

  rootMap.items.forEach((item) => {
    if (!yaml.isScalar(item.key) || typeof item.key.value !== "string") {
      return;
    }

    const key = item.key.value;
    if (key === "vars" && yaml.isMap(item.value)) {
      formatVarsSection(item.value);
      return;
    }

    if (isTaskLikeSection(key) && yaml.isMap(item.value)) {
      formatTaskSection(item.value);
    }
  });
}
