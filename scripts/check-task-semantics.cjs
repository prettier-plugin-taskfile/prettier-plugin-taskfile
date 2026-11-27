const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { test } = require("node:test");
const { formatTaskfileText } = require("../dist/index.js");

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
];

for (const fixture of fixtures) {
  test(fixture.name, () => {
    const directory = mkdtempSync(join(tmpdir(), "taskfile-semantics-"));
    try {
      const before = join(directory, "before.yml");
      const after = join(directory, "after.yml");
      writeFileSync(before, fixture.text);
      writeFileSync(after, formatTaskfileText(fixture.text));

      const run = (taskfile) => {
        const result = spawnSync(
          "task",
          ["--offline", "--silent", "--taskfile", taskfile, "caller"],
          { cwd: directory, encoding: "utf8", timeout: 10000 },
        );
        if (result.error) throw result.error;
        assert.equal(result.status, 0, result.stderr);
        return result.stdout;
      };
      assert.equal(run(after), run(before));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
