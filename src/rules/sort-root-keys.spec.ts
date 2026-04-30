import { sortRootKeys } from "./sort-root-keys";

describe("sortRootKeys", () => {
  test("sorts known Taskfile sections by style-guide priority", () => {
    expect(sortRootKeys(["tasks", "vars", "version", "env"])).toEqual([
      "version",
      "vars",
      "env",
      "tasks",
    ]);
  });

  test("sorts unknown sections alphabetically after known sections", () => {
    expect(sortRootKeys(["custom_b", "tasks", "custom_a", "version"])).toEqual([
      "version",
      "tasks",
      "custom_a",
      "custom_b",
    ]);
  });
});
