import * as yaml from "yaml";
import { formatRootMap } from "./format-root-map";

describe("formatRootMap", () => {
  test("ignores entries whose keys are not string scalars", () => {
    const rootMap = new yaml.YAMLMap();
    rootMap.items.push(new yaml.Pair(new yaml.YAMLSeq(), "ignored"));
    rootMap.items.push(
      new yaml.Pair(
        new yaml.Scalar("vars"),
        yaml.parseDocument("project_name: demo").contents,
      ),
    );

    formatRootMap(rootMap);

    expect(rootMap.items).toHaveLength(2);
    const varsEntry = rootMap.items.find(
      (item) => yaml.isScalar(item.key) && item.key.value === "vars",
    );
    expect(varsEntry).toBeDefined();
    if (!varsEntry) {
      throw new Error("vars entry not found");
    }
    expect(yaml.isScalar(varsEntry.key)).toBe(true);
    expect(
      yaml.isMap(varsEntry.value) &&
        yaml.isScalar(varsEntry.value.items[0]?.key) &&
        varsEntry.value.items[0].key.value,
    ).toBe("PROJECT_NAME");
  });
});
