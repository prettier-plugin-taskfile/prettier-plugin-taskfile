const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, writeFileSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { test } = require("node:test");
const prettier = require("prettier");
const yaml = require("yaml");
const plugin = require("../dist/index.js");
const { formatTaskfileText, formatTaskfileTextWithDiagnostics } = plugin;

const fixtures = [
  {
    name: "includes opt-in renames local definitions while external tasks and namespace aliases remain callable",
    options: {
      taskfileAllowRenamesWithIncludes: true,
      taskfileUnsafeRenames: "error",
    },
    expected: "local\nexternal\nexternal\nexternal-default\n",
    renamedTask: "build-project",
    includedTaskfiles: {
      "tools.yml": `version: "3"
tasks:
  default:
    cmds: [echo external-default]
  foreign_task:
    cmds: [echo external]
`,
    },
    text: `version: "3"
includes:
  tools_ns:
    taskfile: ./tools.yml
    aliases: [tools_alias]
vars:
  project_name: local
tasks:
  build_project:
    cmds:
      - echo "{{.project_name}}"
  caller:
    cmds:
      - task: build_project
      - task: tools_ns:foreign_task
      - task: tools_alias:foreign_task
      - task: tools_alias
`,
  },
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
  ...[
    ["< /dev/null {{.runner}} foo_bar", "target\n"],
    [">/dev/null {{.runner}} foo_bar", ""],
  ].map(([command, expected]) => ({
    name: `redirections cannot hide template-derived task calls: ${command}`,
    expected,
    preservedTask: "foo_bar",
    text: `version: "3"
vars:
  runner: task
tasks:
  foo_bar:
    cmds: [echo target]
  caller:
    cmds:
      - ${JSON.stringify(command)}
`,
  })),
  ...[
    ["hello; task foo_bar", "echo {{.message}}", "hello\ntarget\n"],
    ["$(task foo_bar)", 'echo "{{.message}}"', "target\n"],
  ].map(([message, command, expected]) => ({
    name: `interpolated argument values cannot hide task calls: ${message}`,
    expected,
    preservedTask: "foo_bar",
    text: `version: "3"
vars:
  message: ${JSON.stringify(message)}
tasks:
  foo_bar:
    cmds: [echo target]
  caller:
    cmds:
      - ${JSON.stringify(command)}
`,
  })),
  {
    name: "safe scalar initializer chains retain root and task-local bindings",
    expected: "local/root\n",
    renamedTask: "foo-bar",
    text: `version: "3"
vars:
  project: root
  path: "{{.project}}"
tasks:
  foo_bar:
    vars:
      project: local
      target: "{{.project}}/{{.path}}"
    cmds:
      - echo "{{.target}}"
  caller:
    cmds:
      - task: foo_bar
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
      for (const [name, text] of Object.entries(
        fixture.includedTaskfiles ?? {},
      ))
        writeFileSync(join(directory, name), text);

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
        const result = formatTaskfileTextWithDiagnostics(
          fixture.text,
          fixture.options,
        );
        assert.ok(result.diagnostics.length > 0);
        assert.ok(result.text.includes("task: payload"));
        assert.ok(result.text.includes("root_dir: payload-dir"));
      }
      const formatted = formatTaskfileText(fixture.text, fixture.options);
      if (fixture.preservedTask) {
        assert.ok(yaml.parse(formatted).tasks[fixture.preservedTask]);
        assert.ok(
          formatTaskfileTextWithDiagnostics(
            fixture.text,
            fixture.options,
          ).diagnostics.some(
            (diagnostic) => diagnostic.code === "unsafe-rename",
          ),
        );
      }
      if (fixture.renamedTask) {
        assert.ok(yaml.parse(formatted).tasks[fixture.renamedTask]);
        if (fixture.includedTaskfiles)
          assert.equal(
            formatTaskfileTextWithDiagnostics(fixture.text, fixture.options)
              .diagnostics[0].code,
            "unchecked-includes",
          );
      }
      assert.equal(run(formatted), before);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

test("Prettier accepts and forwards the includes rename option", async () => {
  const text =
    "includes: {tools: ./tools.yml}\ntasks: {build_app: {deps: ['tools:foreign_task'], cmds: [echo]}}";
  const options = { parser: "taskfile-yaml", plugins: [plugin] };
  const formatted = await prettier.format(text, {
    ...options,
    taskfileAllowRenamesWithIncludes: true,
    taskfileUnsafeRenames: "error",
  });
  assert.deepEqual(yaml.parse(formatted).tasks["build-app"].deps, [
    "tools:foreign_task",
  ]);
  const preserved = await prettier.format(text, options);
  assert.ok(yaml.parse(preserved).tasks.build_app);
});

test("Prettier formats issue #13 and forwards independent padding options", async () => {
  const text = `version: "3"
vars:
  STAGES: [init, build, deploy]
  OPTIONS: {debug: false, verbose: true}
`;
  const options = { parser: "taskfile-yaml", plugins: [plugin] };
  const formatted = await prettier.format(text, options);
  assert.ok(formatted.includes("STAGES: [init, build, deploy]"));
  assert.ok(formatted.includes("OPTIONS: { debug: false, verbose: true }"));
  const customized = await prettier.format(text, {
    ...options,
    taskfileFlowSequencePadding: true,
    bracketSpacing: false,
  });
  assert.ok(customized.includes("STAGES: [ init, build, deploy ]"));
  assert.ok(customized.includes("OPTIONS: {debug: false, verbose: true}"));
  assert.deepEqual(yaml.parse(customized), yaml.parse(text));
  assert.equal(
    await prettier.format(customized, {
      ...options,
      taskfileFlowSequencePadding: true,
      bracketSpacing: false,
    }),
    customized,
  );
});
