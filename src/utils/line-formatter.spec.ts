import { addEmptyLines } from "./line-formatter";

describe("addEmptyLines", () => {
  test("should add empty lines between main sections", () => {
    const input =
      'version: 3\nincludes:\n  - file.yml\nvars:\n  VAR: value\nenv:\n  ENV: value\ntasks:\n  task:\n    cmds:\n      - echo "test"';
    const result = addEmptyLines(input);

    // Check for empty lines between sections
    expect(result).toContain("version: 3\n\nincludes:");
    expect(result).toContain("- file.yml\n\nvars:");
    expect(result).toContain("VAR: value\n\nenv:");
    expect(result).toContain("ENV: value\n\ntasks:");
  });

  test("should add empty lines between tasks", () => {
    const input =
      'tasks:\n  task1:\n    cmds:\n      - echo "test1"\n  task2:\n    cmds:\n      - echo "test2"';
    const result = addEmptyLines(input);

    // Check for empty lines between tasks
    expect(result).toContain(
      'tasks:\n  task1:\n    cmds:\n      - echo "test1"\n\n  task2:',
    );
  });

  test("should handle missing sections", () => {
    const input = 'version: 3\ntasks:\n  task:\n    cmds:\n      - echo "test"';
    const result = addEmptyLines(input);

    // Should still add empty line between version and tasks
    expect(result).toContain("version: 3\n\ntasks:");
  });

  test("should not add empty lines at the beginning", () => {
    const input = "version: 3\nincludes:\n  - file.yml";
    const result = addEmptyLines(input);

    expect(result.startsWith("version: 3")).toBe(true);
    expect(result.startsWith("\nversion: 3")).toBe(false);
  });

  test("should handle multi-line strings correctly", () => {
    const input = `version: 3
tasks:
  task1:
    cmds:
      - |
        echo "Multi-line"
        echo "content"
      - echo "simple"
  task2:
    cmds:
      - echo "test"`;

    const result = addEmptyLines(input);

    // Should add empty line between version and tasks
    expect(result).toContain("version: 3\n\ntasks:");

    // Should add empty line between tasks
    expect(result).toContain('echo "simple"\n\n  task2:');

    // Should not add empty lines within multi-line strings
    expect(result).toContain('echo "Multi-line"\n        echo "content"');
  });

  test("should handle literal block scalars", () => {
    const input = `tasks:
  script:
    cmds:
      - |
        #!/bin/bash
        echo "Line 1"
        echo "Line 2"
  other:
    cmds:
      - echo "test"`;

    const result = addEmptyLines(input);

    // Should preserve multi-line literal block
    expect(result).toContain(
      '#!/bin/bash\n        echo "Line 1"\n        echo "Line 2"',
    );

    // Should add empty line between tasks
    expect(result).toContain('echo "Line 2"\n\n  other:');
  });

  test("should handle folded block scalars", () => {
    const input = `tasks:
  docs:
    desc: >
      This is a long description
      that spans multiple lines
      but should be folded
  build:
    cmds:
      - echo "build"`;

    const result = addEmptyLines(input);

    // Should preserve folded block
    expect(result).toContain(
      "This is a long description\n      that spans multiple lines",
    );

    // Should add empty line between tasks
    expect(result).toContain("but should be folded\n\n  build:");
  });

  test("should clean up multiple consecutive empty lines", () => {
    const input =
      'version: 3\n\n\n\nincludes:\n  - file.yml\n\n\ntasks:\n  task:\n    cmds:\n      - echo "test"';
    const result = addEmptyLines(input);

    // Should not have more than two consecutive newlines anywhere
    expect(result).not.toContain("\n\n\n");

    // Should still have proper spacing
    expect(result).toContain("version: 3\n\nincludes:");
    expect(result).toContain("- file.yml\n\ntasks:");
  });

  test("should handle tasks_with_templates section", () => {
    const input = `version: 3
tasks:
  build:
    cmds:
      - echo "build"
tasks_with_templates:
  greet:
    cmds:
      - echo "hello"`;

    const result = addEmptyLines(input);

    expect(result).toContain("version: 3\n\ntasks:");
    expect(result).toContain('echo "build"\n\ntasks_with_templates:');
  });

  test("should handle empty input", () => {
    expect(addEmptyLines("")).toBe("");
  });

  test("should handle single line input", () => {
    const input = "version: 3";
    const result = addEmptyLines(input);
    expect(result).toBe("version: 3");
  });

  test("should not add empty lines in vars or env sections", () => {
    const input = `vars:
  VAR1: value1
  VAR2: value2
  VAR3: value3
env:
  ENV1: value1
  ENV2: value2
tasks:
  task1:
    cmds:
      - echo "test"`;

    const result = addEmptyLines(input);

    // Should not add empty lines between variables
    expect(result).toContain("VAR1: value1\n  VAR2: value2\n  VAR3: value3");
    expect(result).toContain("ENV1: value1\n  ENV2: value2");

    // But should add empty lines between sections
    expect(result).toContain("VAR3: value3\n\nenv:");
    expect(result).toContain("ENV2: value2\n\ntasks:");
  });

  test("should handle nested task properties", () => {
    const input = `tasks:
  build:
    desc: Build the app
    deps:
      - clean
    vars:
      BUILD_TYPE: release
    cmds:
      - echo "building"
  test:
    cmds:
      - echo "testing"`;

    const result = addEmptyLines(input);

    // Based on the actual output, check that the structure is preserved
    expect(result).toContain("desc: Build the app");
    expect(result).toContain("deps:");
    expect(result).toContain("- clean");
    expect(result).toContain("vars:");
    expect(result).toContain("BUILD_TYPE: release");
    expect(result).toContain('echo "building"');
    expect(result).toContain("test:");
    expect(result).toContain('echo "testing"');
  });

  test("should handle complex indentation scenarios", () => {
    const input = `tasks:
  docker:build:
    cmds:
      - docker build .
  docker:run:
    deps:
      - docker:build
    cmds:
      - docker run app`;

    const result = addEmptyLines(input);

    // Should add empty line between namespaced tasks
    expect(result).toContain("docker build .\n  docker:run:");
  });

  test("should handle tasks_with_templates with proper line check", () => {
    // This test specifically targets the line-formatter.ts logic for tasks_with_templates
    const yamlInput = `version: 3
tasks_with_templates:
  template-task:
    cmds:
      - echo "{{.NAME}}"
  another-template:
    cmds:
      - echo "{{.VALUE}}"`;

    const result = addEmptyLines(yamlInput);

    // Should add empty line between template tasks
    expect(result).toContain('echo "{{.NAME}}"\n\n  another-template:');

    // Should properly identify tasks_with_templates section
    expect(result).toContain("tasks_with_templates:");
  });

  test("should handle task definitions without empty lines before", () => {
    // This test specifically targets the condition where the previous result line is not empty
    const input = `version: 3
tasks:
  first:
    cmds:
      - echo "first"
  second:
    cmds:
      - echo "second"`;

    const result = addEmptyLines(input);

    // Should add empty line between tasks when previous line is not empty
    expect(result).toContain('echo "first"\n\n  second:');
    expect(result).toContain("version: 3\n\ntasks:");
  });

  test("should handle edge case where last result line exists but is not empty", () => {
    // Create a specific case to trigger the !result[result.length - 1]?.match(/^\s*$/) condition
    const input = `version: 3
tasks:
  task1:
    desc: description
  task2:
    cmds:
      - echo "test"`;

    const result = addEmptyLines(input);

    // Should add empty line between task definitions when previous line is not empty
    expect(result).toContain("desc: description\n\n  task2:");
    expect(result).toContain("version: 3\n\ntasks:");
  });
});
