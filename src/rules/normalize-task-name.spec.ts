import { normalizeTaskName } from "./normalize-task-name";

describe("normalizeTaskName", () => {
  test("converts task names to kebab-case", () => {
    expect(normalizeTaskName("build_project")).toBe("build-project");
    expect(normalizeTaskName("testSuite")).toBe("test-suite");
  });

  test("preserves namespace separators", () => {
    expect(normalizeTaskName("docker:build_image")).toBe("docker:build-image");
  });
});
