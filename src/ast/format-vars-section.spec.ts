import * as yaml from "yaml";
import { formatVarsSection } from "./format-vars-section";

describe("formatVarsSection", () => {
  test("only normalizes string scalar keys", () => {
    const varsMap = new yaml.YAMLMap();
    varsMap.items.push(new yaml.Pair(new yaml.YAMLSeq(), "ignored"));
    varsMap.items.push(
      new yaml.Pair(new yaml.Scalar("project_name"), new yaml.Scalar("demo")),
    );

    formatVarsSection(varsMap);

    expect(varsMap.items).toHaveLength(2);
    const variableEntry = varsMap.items.find(
      (item) => yaml.isScalar(item.key) && item.key.value === "PROJECT_NAME",
    );
    expect(variableEntry).toBeDefined();
    if (!variableEntry) {
      throw new Error("variable entry not found");
    }
    expect(yaml.isScalar(variableEntry.key) && variableEntry.key.value).toBe(
      "PROJECT_NAME",
    );
  });
});
