import { parseDocument } from "yaml";
import { isTaskLikeSection } from "../rules/is-task-like-section";
import { addEmptyLines } from "./add-empty-lines";

describe("syntax-aware section spacing", () => {
  const expectPreserved = (source: string): string => {
    const formatted = addEmptyLines(source);
    const before = parseDocument(source);
    const after = parseDocument(formatted);
    expect(before.errors).toEqual([]);
    expect(after.errors).toEqual([]);
    expect(after.toJS()).toEqual(before.toJS());
    expect(addEmptyLines(formatted)).toBe(formatted);
    return formatted;
  };

  test("separates scalar and empty root sections and namespaced tasks", () => {
    const source = `version: '3'
output: prefixed
silent: true
vars:
dotenv: [.env]
tasks:
  docker:build: echo build
  'docker:run': echo run
`;
    const formatted = expectPreserved(source);
    expect(formatted).toContain("version: '3'\n\noutput: prefixed");
    expect(formatted).toContain("silent: true\n\nvars:\n\ndotenv:");
    expect(formatted).toContain("docker:build: echo build\n\n  'docker:run':");
  });

  test("keeps include namespaces and include properties outside task spacing", () => {
    const source = `includes:
  build_tools:
    taskfile: ./tools.yml
    vars:
      LOCAL_NAME: tool
  'docker:tools': ./docker.yml
tasks:
  build_tools: echo build
  docker:tools:build: echo docker
`;
    const formatted = expectPreserved(source);
    expect(isTaskLikeSection("includes")).toBe(false);
    expect(isTaskLikeSection("tasks_with_templates")).toBe(false);
    expect(isTaskLikeSection("tasks_metadata")).toBe(false);
    expect(formatted).toContain("LOCAL_NAME: tool\n  'docker:tools':");
    expect(formatted).toContain(
      "build_tools: echo build\n\n  docker:tools:build:",
    );
  });

  test.each(["|", "|-", "|+", "|2+", ">", ">-", ">+"])(
    "preserves literal contents and blank paragraphs for %s",
    (header) => {
      const source = `version: 3
tasks:
  script:
    cmd: ${header} # keep script contents
      cat <<'EOF'
      tasks:
        not_a_task: value


      # a shell comment
      EOF
  next: echo next
`;
      const formatted = expectPreserved(source);
      expect(formatted).toContain(
        "not_a_task: value\n\n\n      # a shell comment",
      );
      expect(formatted).toContain("version: 3\n\ntasks:");
      if (!header.includes("+")) {
        expect(formatted).toContain("      EOF\n\n  next:");
      }
    },
  );

  test.each(["|+", ">+"])(
    "does not add content to empty %s scalars",
    (header) => {
      const source = `tasks:
  empty:
    cmd: ${header}
  next: echo next
`;
      expectPreserved(source);
    },
  );

  test("preserves multiline quoted strings and their apparent YAML keys", () => {
    const source = `version: 3
vars:
  MESSAGE: "start


    tasks:
      fake: key
    end"
tasks:
  first: 'one


    second: not a task
    end'
  real: echo real
`;
    const formatted = expectPreserved(source);
    expect(formatted).toContain(
      '"start\n\n\n    tasks:\n      fake: key\n    end"',
    );
    expect(formatted).toContain("'one\n\n\n    second: not a task\n    end'");
    expect(formatted).toContain("    end'\n\n  real:");
  });

  test("preserves paragraph breaks inside multiline plain scalars", () => {
    const source = `vars:
  MESSAGE: first paragraph


    second paragraph
tasks:
  first: echo first
  second: echo second
`;
    const formatted = expectPreserved(source);
    expect(formatted).toContain("first paragraph\n\n\n    second paragraph");
    expect(formatted).toContain("second paragraph\n\ntasks:");
  });

  test("preserves anchors, aliases, inline comments and comment attachment", () => {
    const source = `version: 3 # schema
# global variables
vars: &variables
  MESSAGE: hello
env: *variables
tasks:
  first: &task
    cmd: echo first # shell command
  # second task
  second: *task
# final comment
`;
    const formatted = expectPreserved(source);
    expect(formatted).toContain(
      "version: 3 # schema\n\n# global variables\nvars:",
    );
    expect(formatted).toContain(
      "echo first # shell command\n\n  # second task",
    );
    expect(formatted).toContain("  second: *task\n# final comment\n");
  });

  test("does not split flow mappings or change invalid input", () => {
    expectPreserved("tasks: {first: echo first, second: echo second}\n");
    const invalid = "tasks:\n  - {broken\n";
    expect(addEmptyLines(invalid)).toBe(invalid);
  });

  test("collapses only structural blank lines and retains multiline scalar blanks", () => {
    const source = `\n\nversion: 3


tasks:
  first:
    cmd: |+
      echo hello


  second: echo next
`;
    const formatted = expectPreserved(source);
    expect(formatted.startsWith("version: 3\n\ntasks:")).toBe(true);
    expect(formatted).toContain("      echo hello\n\n\n  second:");
  });
});
