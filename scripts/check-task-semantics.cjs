const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { test } = require("node:test");
const {
  formatTaskfileText,
  formatTaskfileTextWithDiagnostics,
} = require("../dist/index.js");

const fixtures = [
  {
    name: "task calls and dependencies retain the rendered command values",
    text: `version: "3"
vars:
  binary_name: myapp
tasks:
  build_project:
    cmds:
      - echo "{{.binary_name}}"
  caller:
    deps: [build_project]
    cmds:
      - task: build_project
      - echo caller
`,
  },
  {
    name: "task-local variables and call arguments preserve scope",
    text: `version: "3"
vars:
  message: root
tasks:
  print_message:
    vars:
      message: local
    cmds:
      - echo "{{.message}}"
  caller:
    cmds:
      - task: print_message
        vars:
          message: passed
`,
  },
  {
    name: "namespace separators preserve task resolution",
    text: `version: "3"
tasks:
  docker:build_image:
    cmds:
      - echo namespaced
  caller:
    cmds:
      - task: docker:build_image
`,
  },
  {
    name: "complex templates preserve their runtime meaning",
    text: `version: "3"
vars:
  binary_name: myapp
tasks:
  caller:
    cmds:
      - echo '{{ printf "%s" .binary_name }}'
`,
  },
  {
    name: "dynamic variables retain previously resolved shell environment values",
    expected: "hello\n",
    text: `version: "3"
vars:
  input: hello
tasks:
  caller:
    vars:
      result:
        sh: 'echo "$input"'
    cmds:
      - echo "{{.result}}"
`,
  },
  {
    name: "user variables cannot be renamed into Task-owned special variables",
    preserveNames: true,
    expected: "payload/payload-dir\n",
    text: `version: "3"
vars:
  task: payload
  root_dir: payload-dir
tasks:
  caller:
    cmds:
      - echo "{{.task}}/{{.root_dir}}"
`,
  },
  ...["TASK", "ALIAS"].map((name) => ({
    name: `${name} observations retain the original task name`,
    expected: "build_app\n",
    text: `version: "3"
tasks:
  build_app:
    cmds:
      - echo "{{.${name}}}"
  caller:
    cmds:
      - task: build_app
`,
  })),
  ...["'task' foo_bar", '"task" foo_bar', "task</dev/null foo_bar"].map(
    (command) => ({
      name: `shell task calls remain resolvable: ${command}`,
      expected: "target\n",
      text: `version: "3"
tasks:
  foo_bar:
    cmds:
      - echo target
  caller:
    cmds:
      - ${JSON.stringify(command)}
`,
    }),
  ),
  {
    name: "template-derived executable names retain shell task references",
    expected: "target\n",
    text: `version: "3"
vars:
  runner: task
tasks:
  foo_bar:
    cmds:
      - echo target
  caller:
    cmds:
      - "{{.runner}} foo_bar"
`,
  },
  {
    name: "self-named initializers retain root environment bindings",
    expected: "hello\n",
    text: `version: "3"
env:
  foo: hello
vars:
  foo: "{{.foo}}"
tasks:
  caller:
    cmds:
      - echo "{{.foo}}"
`,
  },
  {
    name: "forward initializer references retain earlier environment bindings",
    expected: "outer/inner\n",
    text: `version: "3"
env:
  later: outer
vars:
  before: "{{.later}}"
  later: inner
tasks:
  caller:
    cmds:
      - echo "{{.before}}/{{.later}}"
`,
  },
];

for (const fixture of fixtures) {
  test(fixture.name, () => {
    const directory = mkdtempSync(join(tmpdir(), "taskfile-semantics-"));
    try {
      const taskfile = join(directory, "Taskfile.yml");

      const run = (text) => {
        writeFileSync(taskfile, text);
        const result = spawnSync(
          "task",
          ["--offline", "--silent", "--taskfile", taskfile, "caller"],
          {
            cwd: directory,
            env: { PATH: process.env.PATH, HOME: directory },
            encoding: "utf8",
            timeout: 10000,
          },
        );
        if (result.error) throw result.error;
        assert.equal(result.status, 0, result.stderr);
        return result.stdout;
      };
      const before = run(fixture.text);
      if (fixture.expected !== undefined)
        assert.equal(before, fixture.expected);
      if (fixture.preserveNames) {
        const result = formatTaskfileTextWithDiagnostics(fixture.text);
        assert.ok(result.diagnostics.length > 0);
        assert.ok(result.text.includes("task: payload"));
        assert.ok(result.text.includes("root_dir: payload-dir"));
      }
      assert.equal(run(formatTaskfileText(fixture.text)), before);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
