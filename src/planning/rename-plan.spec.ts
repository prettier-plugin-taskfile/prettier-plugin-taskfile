import * as yaml from "yaml";
import {
  formatTaskfileText,
  formatTaskfileTextWithDiagnostics,
} from "../api/format-taskfile-text";
import { plugin } from "../plugin";
import { analyzeTaskfileRenames } from "./analyze-taskfile-renames";
import { createRenamePlan } from "./create-rename-plan";
import { applyRenamePlan } from "./apply-rename-plan";

function formatted(input: string) {
  return yaml.parse(formatTaskfileText(input));
}

describe("safe Taskfile rename planning", () => {
  test("updates the official styleguide variable example without replacing shell text or comments", () => {
    const result = formatTaskfileTextWithDiagnostics(`version: '3'
vars:
  binary_name: myapp
tasks:
  build:
    cmds:
      # binary_name is a variable
      - go build -o {{.binary_name}} . # binary_name
      - echo binary_name`);
    const obj = yaml.parse(result.text);
    expect(obj.vars).toEqual({ BINARY_NAME: "myapp" });
    expect(obj.tasks.build.cmds).toEqual([
      "go build -o {{.BINARY_NAME}} .",
      "echo binary_name",
    ]);
    expect(result.text).toContain("# binary_name is a variable");
    expect(result.text).toContain("# binary_name");
    expect(result.diagnostics).toEqual([]);
  });

  test("updates namespaced task definitions, deps, command tasks and root-prefixed references together", () => {
    const obj = formatted(`tasks:
  docker:build_image:
    cmds: [echo build_image]
  buildProject:
    deps:
      - docker:build_image
      - task: docker:build_image
    cmds:
      - task: ':docker:build_image'
      - task: buildProject
      - defer:
          task: docker:build_image`);
    expect(Object.keys(obj.tasks)).toEqual([
      "docker:build-image",
      "build-project",
    ]);
    expect(obj.tasks["build-project"].deps).toEqual([
      "docker:build-image",
      { task: "docker:build-image" },
    ]);
    expect(obj.tasks["build-project"].cmds).toEqual([
      { task: ":docker:build-image" },
      { task: "build-project" },
      { defer: { task: "docker:build-image" } },
    ]);
    expect(obj.tasks["docker:build-image"].cmds).toEqual(["echo build_image"]);
  });

  test("resolves root and task-local variable scopes, including values and repeated references", () => {
    const obj = formatted(`vars:
  project: demo
  path: '{{.project}}'
tasks:
  build_task:
    vars:
      project: local
      target: '{{.project}}/{{.path}}'
    cmds:
      - echo {{.target}} {{.project}} {{.project}}
  other_task:
    cmds: ['echo {{.project}} {{.path}}']`);
    expect(obj.vars).toEqual({ PROJECT: "demo", PATH: "{{.PROJECT}}" });
    expect(obj.tasks["build-task"].vars).toEqual({
      PROJECT: "local",
      TARGET: "{{.PROJECT}}/{{.PATH}}",
    });
    expect(obj.tasks["build-task"].cmds[0]).toBe(
      "echo {{.TARGET}} {{.PROJECT}} {{.PROJECT}}",
    );
    expect(obj.tasks["other-task"].cmds[0]).toBe("echo {{.PROJECT}} {{.PATH}}");
  });

  test.each([
    `vars: {foo: one, FOO: two}\ntasks: {build_task: {cmds: ['echo {{.foo}}']}}`,
    `tasks: {build_task: {}, build-task: {deps: [build_task]}}`,
    `vars: {foo: root}\ntasks: {build_task: {vars: {FOO: local}, cmds: ['echo {{.foo}}']}}`,
    `vars: {foo: root}\ntasks: {build_task: {cmds: ['echo {{.FOO}}']}}`,
    `vars: {foo: root}\ntasks: {build_task: {vars: {FOO: local}, cmds: [echo]}}`,
    `vars: {path: '{{.local}}'}\ntasks: {build_task: {vars: {local: value}, cmds: [echo]}}`,
  ])(
    "preserves the whole rename group on collisions or changed resolution: %s",
    (input) => {
      const result = formatTaskfileTextWithDiagnostics(input);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(yaml.parse(result.text)).toEqual(yaml.parse(input));
      expect(() =>
        formatTaskfileText(input, { taskfileUnsafeRenames: "error" }),
      ).toThrow("Unsafe Taskfile renames");
    },
  );

  test.each([
    `includes: {tools: ./Taskfile.yml}\nvars: {foo: x}\ntasks: {build_task: {cmds: ['echo {{.foo}}']}}`,
    `vars: &vars {foo: x}\ntasks: {build_task: {vars: *vars}}`,
    `vars: {foo: x}\ntasks: {build_task: {cmds: ['echo {{printf "%s" .foo}}']}}`,
    `vars: {foo: x}\ntasks: {build_task: {cmds: [{task: '{{.foo}}'}]}}`,
    `vars: {foo: x}\ntasks: {build_task: {custom: '{{.foo}}'}}`,
    `vars: {foo: x}\ntasks: {build_task: {cmds: [{task: build_task, vars: {foo: y}}]}}`,
    `vars: {foo: x}\ntasks: {build_task: {aliases: [build], cmds: ['echo {{.foo}}']}}`,
    `vars: {foo: x}\ntasks: {build_task: {deps: [external:build]}}`,
    `vars: {foo: x}\ntasks: {build_task: {cmds: ['task build_task']}}`,
    `tasks: {foo_bar: echo, caller: 'task foo_bar'}`,
    `tasks: {foo_bar: echo, caller: {cmd: 'task foo_bar'}}`,
    `vars: {foo: {sh: 'task foo_bar'}}\ntasks: {foo_bar: echo}`,
    `tasks: {foo_bar: echo, caller: {status: ['task foo_bar'], cmds: [echo]}}`,
    `vars: {foo: value}\ntasks: {build_task: {requires: {vars: [foo]}, cmds: [echo]}}`,
    `vars: {foo: value}\ntasks: {build_task: {cmds: [{for: {var: foo}, cmd: echo}]}}`,
    `vars: {'invalid-name': value}\ntasks: {build_task: {cmds: [echo]}}`,
    `tasks: {foo_bar: echo, caller: {deps: ['foo_*']}}`,
    `vars: {foo: x, bar: {ref: .foo}}\ntasks: {build_task: {cmds: [echo]}}`,
  ])(
    "preserves unsupported scope/reference forms with diagnostics: %s",
    (input) => {
      const result = formatTaskfileTextWithDiagnostics(input);
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(yaml.parse(result.text)).toEqual(yaml.parse(input));
    },
  );

  test("name normalization can be disabled independently of layout, including strict unsafe policy", () => {
    const input =
      "vars: {foo: x, FOO: y}\ntasks: {build_task: {cmds: ['echo {{.foo}}']}}";
    const options = {
      taskfileNormalizeNames: false,
      taskfileUnsafeRenames: "error" as const,
    };
    const result = formatTaskfileTextWithDiagnostics(input, options);
    expect(result.diagnostics).toEqual([]);
    expect(yaml.parse(result.text)).toEqual(yaml.parse(input));
    const parser = plugin.parsers!["taskfile-yaml"];
    const printer = plugin.printers!["taskfile-yaml"];
    const doc = parser.parse(input, {} as any);
    expect(
      yaml.parse(
        String(
          printer.print(
            { getNode: () => doc } as any,
            options as any,
            {} as any,
          ),
        ),
      ),
    ).toEqual(yaml.parse(input));
  });

  test.each([
    "'task' foo_bar",
    '"task" foo_bar',
    "task</dev/null foo_bar",
    "t\\ask foo_bar",
    'ta"sk" foo_bar',
    "ta\\\nsk foo_bar",
    "$runner foo_bar",
    "$(printf task) foo_bar",
    "{{.TASK_EXE}} foo_bar",
    "{{.runner}} foo_bar",
    '"{{.runner}}" foo_bar',
    "true; {{.runner}} foo_bar",
    "env {{.runner}} foo_bar",
    "FLAG=1 {{.runner}} foo_bar",
  ])("preserves unsupported shell command forms: %s", (command) => {
    const input = yaml.stringify({
      version: "3",
      vars: { runner: "task" },
      tasks: {
        foo_bar: { cmds: ["echo target"] },
        caller: { cmds: [command] },
      },
    });
    const result = formatTaskfileTextWithDiagnostics(input);
    expect(yaml.parse(result.text)).toEqual(yaml.parse(input));
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(() =>
      formatTaskfileText(input, { taskfileUnsafeRenames: "error" }),
    ).toThrow("Unsafe Taskfile renames");
  });

  test("preserves the environment of dynamic shell variables", () => {
    const input = `version: '3'
vars:
  input: hello
tasks:
  caller:
    vars:
      result:
        sh: 'echo "$input"'
    cmds:
      - echo "{{.result}}"`;
    const result = formatTaskfileTextWithDiagnostics(input);
    expect(yaml.parse(result.text)).toEqual(yaml.parse(input));
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  test.each([
    "env: {foo: hello}\nvars: {foo: '{{.foo}}'}",
    "env: {later: outer}\nvars: {before: '{{.later}}', later: inner}",
    "vars: {foo: global}\ntasks: {caller: {vars: {foo: '{{.foo}}'}}}",
    "env: {out: '{{.foo}}'}\nvars: {foo: hello}",
  ])("preserves unavailable initializer bindings: %s", (input) => {
    const result = formatTaskfileTextWithDiagnostics(input);
    expect(yaml.parse(result.text)).toEqual(yaml.parse(input));
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(() =>
      formatTaskfileText(input, { taskfileUnsafeRenames: "error" }),
    ).toThrow("Unsafe Taskfile renames");
  });

  test("task environment templates can still read resolved variables", () => {
    const result = formatTaskfileTextWithDiagnostics(
      "vars: {foo: hello}\ntasks: {build_app: {env: {BAR: '{{.foo}}'}, cmds: ['echo {{.foo}}']}}",
    );
    const obj = yaml.parse(result.text);
    expect(obj.vars).toEqual({ FOO: "hello" });
    expect(obj.tasks["build-app"].env).toEqual({ BAR: "{{.FOO}}" });
    expect(result.diagnostics).toEqual([]);
  });

  test.each(["task", "alias", "root_dir", "cli_args", "item", "task_version"])(
    "rejects normalization into Task-owned variable %s",
    (name) => {
      const input = yaml.stringify({
        version: "3",
        vars: { [name]: "payload" },
        tasks: { caller: { cmds: [`echo "{{.${name}}}"`] } },
      });
      const result = formatTaskfileTextWithDiagnostics(input);
      expect(yaml.parse(result.text)).toEqual(yaml.parse(input));
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(() =>
        formatTaskfileText(input, { taskfileUnsafeRenames: "error" }),
      ).toThrow("Unsafe Taskfile renames");
    },
  );

  test.each(["TASK", "ALIAS"])(
    "preserves task names observed by the special variable %s",
    (name) => {
      const input = yaml.stringify({
        version: "3",
        tasks: { build_app: { cmds: [`echo "{{.${name}}}"`] } },
      });
      const result = formatTaskfileTextWithDiagnostics(input);
      expect(yaml.parse(result.text)).toEqual(yaml.parse(input));
      expect(result.diagnostics.length).toBeGreaterThan(0);
    },
  );

  test("protects Task special names in task-local variable scopes too", () => {
    const input =
      "tasks: {caller: {vars: {task: payload}, cmds: ['echo {{.task}}']}}";
    const result = formatTaskfileTextWithDiagnostics(input);
    expect(yaml.parse(result.text)).toEqual(yaml.parse(input));
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  test("does not block task renaming for name-independent special variables", () => {
    const result = formatTaskfileTextWithDiagnostics(
      "tasks: {build_app: {cmds: ['echo {{.TASK_VERSION}}']}}",
    );
    expect(yaml.parse(result.text).tasks["build-app"]).toBeDefined();
    expect(result.diagnostics).toEqual([]);
  });

  test("rejects invalid YAML before any formatting", () => {
    expect(() => formatTaskfileText("tasks: {build: [")).toThrow(
      "Invalid YAML",
    );
    expect(() => formatTaskfileText("vars:\n  foo: one\n  foo: two")).toThrow(
      "Invalid YAML",
    );
  });

  test("preserves root ordering when sorting could move aliases before anchors", () => {
    const input =
      "tasks: &shared {build: {cmds: []}}\nvars: *shared\nversion: '3'";
    const result = formatTaskfileTextWithDiagnostics(input);
    expect(() => yaml.parse(result.text)).not.toThrow();
    expect(yaml.parse(result.text)).toEqual(yaml.parse(input));
    expect(result.text.indexOf("tasks:")).toBeLessThan(
      result.text.indexOf("vars:"),
    );
    expect(result.diagnostics).toContainEqual({
      code: "unsafe-ordering",
      message: "Preserving root order to keep YAML anchors before aliases.",
    });
    const disabled = formatTaskfileTextWithDiagnostics(input, {
      taskfileNormalizeNames: false,
    });
    expect(yaml.parse(disabled.text)).toEqual(yaml.parse(input));
    expect(disabled.diagnostics[0].code).toBe("unsafe-ordering");
  });

  test("normalizes whitespace in recognized fields but preserves unknown object payloads and shared values", () => {
    const obj = formatted(`vars:
  FOO: x
  DERIVED: '{{ .FOO }}'
  OBJECT:
    desc: '{{ .FOO }}'
  LIST:
    - desc: '{{ .FOO }}'
env:
  BAR: '{{ .FOO }}'
tasks:
  build:
    desc: '{{ .FOO }}'
    cmds:
      - cmd: 'echo {{ .FOO }}'
      - defer: 'echo {{ .FOO }}'
    custom: '{{ .FOO }}'`);
    expect(obj.vars.DERIVED).toBe("{{.FOO}}");
    expect(obj.vars.OBJECT.desc).toBe("{{ .FOO }}");
    expect(obj.vars.LIST[0].desc).toBe("{{ .FOO }}");
    expect(obj.env.BAR).toBe("{{.FOO}}");
    expect(obj.tasks.build.desc).toBe("{{.FOO}}");
    expect(obj.tasks.build.cmds).toEqual([
      { cmd: "echo {{.FOO}}" },
      { defer: "echo {{.FOO}}" },
    ]);
    expect(obj.tasks.build.custom).toBe("{{ .FOO }}");
    const shared = formatted(
      "vars: {FOO: &value '{{ .BAR }}'}\ncustom: *value",
    );
    expect(shared.vars.FOO).toBe("{{ .BAR }}");
    expect(shared.custom).toBe("{{ .BAR }}");
  });

  test("analysis and planning do not mutate, plans are frozen, and stale plans fail atomically", () => {
    const doc = yaml.parseDocument(
      "vars: {foo: x}\ntasks: {build_task: {cmds: ['echo {{.foo}}']}}",
    );
    const before = doc.toString();
    const analysis = analyzeTaskfileRenames(doc.contents as yaml.YAMLMap);
    const plan = createRenamePlan(analysis);
    expect(doc.toString()).toBe(before);
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.edits)).toBe(true);
    expect(plan.edits.every(Object.isFrozen)).toBe(true);
    plan.edits[plan.edits.length - 1].node.value = "changed";
    expect(() => applyRenamePlan(plan)).toThrow("stale rename plan");
    expect(plan.edits[0].node.value).toBe(plan.edits[0].from);
  });
});
