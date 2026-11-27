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

  test("places optional configurations before variables and dotenv after env", () => {
    expect(
      sortRootKeys([
        "tasks",
        "dotenv",
        "env",
        "vars",
        "use_gitignore",
        "shopt",
        "set",
        "interval",
        "run",
        "method",
        "silent",
        "output",
        "includes",
        "version",
      ]),
    ).toEqual([
      "version",
      "includes",
      "output",
      "silent",
      "method",
      "run",
      "interval",
      "set",
      "shopt",
      "use_gitignore",
      "vars",
      "env",
      "dotenv",
      "tasks",
    ]);
    expect(sortRootKeys(["tasks", "dotenv", "vars", "version"])).toEqual([
      "version",
      "vars",
      "dotenv",
      "tasks",
    ]);
  });
});
