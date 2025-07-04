import { sortTaskfileKeys } from "./key-sorter";

describe("sortTaskfileKeys", () => {
  test("should sort keys according to priority order", () => {
    const input = {
      tasks: {},
      env: {},
      includes: {},
      vars: {},
      version: "3",
      custom: {},
    };

    const result = sortTaskfileKeys(input);
    const keys = Object.keys(result);

    // Check priority order
    expect(keys[0]).toBe("version");
    expect(keys[1]).toBe("includes");
    expect(keys[2]).toBe("vars");
    expect(keys[3]).toBe("env");
    expect(keys[4]).toBe("tasks");
    expect(keys[5]).toBe("custom"); // Non-priority keys should be sorted alphabetically
  });

  test("should handle missing keys", () => {
    const input = {
      tasks: {},
      version: "3",
      custom: {},
    };

    const result = sortTaskfileKeys(input);
    const keys = Object.keys(result);

    expect(keys[0]).toBe("version");
    expect(keys[1]).toBe("tasks");
    expect(keys[2]).toBe("custom");
  });

  test("should handle empty object", () => {
    const input = {};
    const result = sortTaskfileKeys(input);
    expect(Object.keys(result).length).toBe(0);
  });

  test("should handle null/undefined input", () => {
    expect(sortTaskfileKeys(null as any)).toEqual({});
    expect(sortTaskfileKeys(undefined as any)).toEqual({});
  });

  test("should sort additional keys alphabetically", () => {
    const input = {
      version: "3",
      zebra: "last",
      alpha: "first",
      beta: "second",
      tasks: {},
    };

    const result = sortTaskfileKeys(input);
    const keys = Object.keys(result);

    expect(keys[0]).toBe("version");
    expect(keys[1]).toBe("tasks");
    expect(keys[2]).toBe("alpha");
    expect(keys[3]).toBe("beta");
    expect(keys[4]).toBe("zebra");
  });

  test("should handle complex Taskfile structure", () => {
    const complexTaskfile = {
      version: "3",
      output: "prefixed",
      silent: true,
      method: "checksum",
      includes: { common: "./common.yml" },
      vars: { PROJECT_NAME: "my-project" },
      env: { NODE_ENV: "development" },
      tasks: { build: { cmds: ["echo test"] } },
    };

    const result = sortTaskfileKeys(complexTaskfile);
    const keys = Object.keys(result);

    // Check that priority keys come first
    expect(keys[0]).toBe("version");
    expect(keys[1]).toBe("includes");
    expect(keys[2]).toBe("vars");
    expect(keys[3]).toBe("env");
    expect(keys[4]).toBe("tasks");

    // Check that other keys are sorted alphabetically
    const otherKeys = keys.slice(5);
    const sortedOtherKeys = [...otherKeys].sort();
    expect(otherKeys).toEqual(sortedOtherKeys);
  });

  test("should preserve all values", () => {
    const input = {
      version: "3",
      custom: { value: "test" },
      tasks: { build: { cmds: ["echo test"] } },
    };

    const result = sortTaskfileKeys(input);

    expect(result.version).toBe("3");
    expect(result.custom).toEqual({ value: "test" });
    expect(result.tasks).toEqual({ build: { cmds: ["echo test"] } });
  });

  test("should handle edge cases", () => {
    expect(sortTaskfileKeys({})).toEqual({});

    const onlyVersion = { version: "3" };
    const onlyVersionResult = sortTaskfileKeys(onlyVersion);
    expect(Object.keys(onlyVersionResult)).toEqual(["version"]);
    expect(onlyVersionResult.version).toBe("3");
  });
});
