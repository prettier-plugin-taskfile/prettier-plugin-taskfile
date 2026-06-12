import * as fs from "node:fs";
import * as path from "node:path";
import { plugin, checkTaskfileFormatting, formatTaskfileText } from "./plugin";

describe("Prettier Plugin", () => {
  test("should have required plugin structure", () => {
    expect(plugin.languages).toBeDefined();
    expect(plugin.parsers).toBeDefined();
  });

  test("should define taskfile-yaml language", () => {
    expect(plugin.languages).toEqual([
      {
        name: "TaskfileYAML",
        extensions: [],
        filenames: [
          "Taskfile.yml",
          "Taskfile.yaml",
          "taskfile.yml",
          "taskfile.yaml",
        ],
        parsers: ["taskfile-yaml"],
      },
    ]);
  });

  test("should define taskfile-yaml parser with yaml astFormat", () => {
    const parser = plugin.parsers!["taskfile-yaml"];

    expect(parser).toBeDefined();
    expect(parser.parse).toBeDefined();
    expect(parser.preprocess).toBeDefined();
    expect(parser.astFormat).toBe("yaml");
  });

  test("should not define custom printers", () => {
    expect(plugin.printers).toBeUndefined();
  });

  test("preprocess should apply taskfile formatting rules", () => {
    const parser = plugin.parsers!["taskfile-yaml"];
    const input = `tasks:
  build_task:
    cmds:
      - echo "test"
vars:
  project_name: demo
version: '3'`;

    const preprocessed = parser.preprocess!(input, {} as any) as string;

    expect(preprocessed).toContain("version:");
    expect(preprocessed).toContain("build-task:");
    expect(preprocessed).toContain("PROJECT_NAME:");
    // version should come before vars, vars before tasks
    const versionIndex = preprocessed.indexOf("version:");
    const varsIndex = preprocessed.indexOf("vars:");
    const tasksIndex = preprocessed.indexOf("tasks:");
    expect(versionIndex).toBeLessThan(varsIndex);
    expect(varsIndex).toBeLessThan(tasksIndex);
  });

  test("should parse preprocessed text using built-in yaml parser", () => {
    const parser = plugin.parsers!["taskfile-yaml"];
    const yaml =
      'version: "3"\ntasks:\n  build:\n    cmds:\n      - echo "test"';

    const result = parser.parse(yaml, {} as any);

    expect(result).toBeDefined();
    expect(result.type).toBe("root");
  });

  test("should have locStart and locEnd functions", () => {
    const parser = plugin.parsers!["taskfile-yaml"];

    expect(parser.locStart).toBeDefined();
    expect(parser.locEnd).toBeDefined();
    expect(typeof parser.locStart).toBe("function");
    expect(typeof parser.locEnd).toBe("function");
  });

  test("should preserve comments during preprocessing", () => {
    const parser = plugin.parsers!["taskfile-yaml"];

    const yamlWithComments = `# Top comment
version: "3"

# Variables comment
vars:
  project_name: myproject # Inline comment

# Tasks comment
tasks:
  build_project: # Task comment
    cmds:
      - echo "test" # Command comment`;

    const preprocessed = parser.preprocess!(
      yamlWithComments,
      {} as any,
    ) as string;

    expect(preprocessed).toContain("# Top comment");
    expect(preprocessed).toContain("# Variables comment");
    expect(preprocessed).toContain("# Inline comment");
    expect(preprocessed).toContain("# Tasks comment");
    expect(preprocessed).toContain("# Task comment");
    expect(preprocessed).toContain("# Command comment");
    expect(preprocessed).toContain("PROJECT_NAME: myproject");
    expect(preprocessed).toContain("build-project:");
  });

  test("should return false for unformatted Taskfile check", () => {
    const unformattedYaml = `tasks:
  build_task:
    cmds:
      - echo "hello"
vars:
  project_name: demo
version: '3'`;

    expect(checkTaskfileFormatting(unformattedYaml)).toBe(false);
  });

  test("should return false for unformatted Taskfile check with root comments", () => {
    const unformattedYamlWithComments = `# Top comment
tasks:
  build_task:
    cmds:
      - echo "hello"

# Vars comment
vars:
  project_name: demo
version: '3'`;

    expect(checkTaskfileFormatting(unformattedYamlWithComments)).toBe(false);
  });

  test("should format commented Taskfile text without throwing", () => {
    const unformattedYamlWithComments = `# Top comment
tasks:
  build_task:
    cmds:
      - echo "hello"

# Vars comment
vars:
  project_name: demo
version: '3'`;

    const formatted = formatTaskfileText(unformattedYamlWithComments);

    const versionIndex = formatted.indexOf("version:");
    const varsIndex = formatted.indexOf("vars:");
    const tasksIndex = formatted.indexOf("tasks:");

    expect(versionIndex).toBeLessThan(varsIndex);
    expect(varsIndex).toBeLessThan(tasksIndex);
    expect(formatted).toContain("# Top comment");
    expect(formatted).toContain("# Vars comment");
  });

  test("should report the example unformatted fixture as needing changes", () => {
    const fixturePath = path.join(
      __dirname,
      "..",
      "examples",
      "example-unformatted.yml",
    );
    const fixture = fs.readFileSync(fixturePath, "utf8");

    expect(checkTaskfileFormatting(fixture)).toBe(false);
  });

  test("should report the example formatted fixture as already formatted", () => {
    const fixturePath = path.join(
      __dirname,
      "..",
      "examples",
      "example-formatted.yml",
    );
    const fixture = fs.readFileSync(fixturePath, "utf8");

    expect(checkTaskfileFormatting(fixture)).toBe(true);
  });

  test("should format task-like sections beyond tasks", () => {
    const input = `version: "3"
tasks_with_templates:
  build_app:
    cmds:
      - echo "{{ .PROJECT_NAME }}"`;

    const formatted = formatTaskfileText(input);

    expect(formatted).toContain("tasks_with_templates:");
    expect(formatted).toContain("build-app:");
    expect(formatted).toContain("{{.PROJECT_NAME}}");
  });

  test("should indent with 2 spaces by default", () => {
    const input = `version: "3"

tasks:
   desc: The task
   cmds:
      - echo 87
`;

    const formatted = formatTaskfileText(input);
    expect(formatted).toEqual(`version: "3"

tasks:
  desc: The task
  cmds:
    - echo 87
`);
  });

  test("should not wrap lines by default", () => {
    const input = `version: "3"

# Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

tasks:
  desc: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
  cmds:
    - echo "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
`;

    const formatted = formatTaskfileText(input);
    expect(formatted).toEqual(input);
  });
});
