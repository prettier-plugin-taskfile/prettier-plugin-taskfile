import * as yaml from "yaml";
import { analyzeTaskfileRenames } from "./analyze-taskfile-renames";
import { createRenamePlan } from "./create-rename-plan";
import { createNameDefinitionIndex } from "./name-definition-index";

function analysisOf(input: string) {
  const document = yaml.parseDocument(input);
  if (!yaml.isMap(document.contents)) throw new Error("Expected a map");
  return { document, analysis: analyzeTaskfileRenames(document.contents) };
}

describe("ordered name definition resolution", () => {
  test("keeps the first duplicate and normalized binding with its original position", () => {
    const definitions = Object.freeze([
      Object.freeze({
        name: "project_name",
        kind: "variable" as const,
        scope: "root",
        value: "first",
      }),
      Object.freeze({
        name: "project_name",
        kind: "variable" as const,
        scope: "root",
        value: "duplicate",
      }),
      Object.freeze({
        name: "PROJECT_NAME",
        kind: "variable" as const,
        scope: "root",
        value: "already normalized",
      }),
    ]);
    const index = createNameDefinitionIndex(definitions);
    const original = index.resolve("variable", "project_name", "task:build");
    const normalized = index.resolve(
      "variable",
      "PROJECT_NAME",
      "task:build",
      "normalized",
    );
    expect(original?.definition.value).toBe("first");
    expect(normalized).toBe(original);
    expect(normalized?.position).toBe(0);
    expect(
      index.resolve("variable", "PROJECT_NAME", "root")?.definition.value,
    ).toBe("already normalized");
  });

  test("prefers task-local bindings and falls back to root without mixing kinds or scopes", () => {
    const index = createNameDefinitionIndex([
      { name: "project_name", kind: "variable", scope: "root", value: "root" },
      {
        name: "project_name",
        kind: "variable",
        scope: "task:build",
        value: "local",
      },
      {
        name: "project_name",
        kind: "task",
        scope: "root",
        value: "task",
      },
    ]);
    expect(
      index.resolve("variable", "project_name", "task:build")?.definition.value,
    ).toBe("local");
    expect(
      index.resolve("variable", "PROJECT_NAME", "task:build", "normalized")
        ?.definition.value,
    ).toBe("local");
    expect(
      index.resolve("variable", "project_name", "task:other")?.definition.value,
    ).toBe("root");
    expect(
      index.resolve("task", "project_name", "task:build")?.definition.value,
    ).toBe("task");
    expect(index.resolve("variable", "missing", "task:build")).toBeUndefined();
  });

  test("rejects normalized collisions in definition order and retains first-wins reference diagnostics", () => {
    const { analysis } = analysisOf(`tasks:
  build_app: {}
  build-app: {}
  caller:
    deps: [build_app, build-app]`);
    const plan = createRenamePlan(analysis);
    expect(plan.edits).toEqual([]);
    expect(plan.diagnostics.map(({ message }) => message)).toEqual([
      'Name collision at "build-app"; preserving names.',
      'Reference "build-app" would change scope; preserving names.',
    ]);
    expect(() =>
      createRenamePlan(analysis, { taskfileUnsafeRenames: "error" }),
    ).toThrow('Name collision at "build-app"');
  });

  test("preserves existing collision diagnostics for unsupported names with scope delimiters", () => {
    const { analysis } = analysisOf(`tasks:
  a:
    vars: {B/C: value}
  a/B:
    vars: {C: value}
  build_app: {}`);
    const plan = createRenamePlan(analysis);
    expect(plan.edits).toEqual([]);
    expect(plan.diagnostics.map(({ message }) => message)).toEqual([
      "Unsupported variable identifiers require preserving names.",
      'Name collision at "C"; preserving names.',
    ]);
  });

  test.each([
    {
      vars: "  source_name: hello\n  derived_name: '{{.source_name}}'",
      unsafe: false,
    },
    {
      vars: "  derived_name: '{{.source_name}}'\n  source_name: hello",
      unsafe: true,
    },
    { vars: "  source_name: '{{.source_name}}'", unsafe: true },
  ])("preserves initializer availability for $vars", ({ vars, unsafe }) => {
    const { analysis } = analysisOf(`vars:\n${vars}\ntasks: {build_app: {}}`);
    const plan = createRenamePlan(analysis);
    if (unsafe) {
      expect(plan.edits).toEqual([]);
      expect(plan.diagnostics.map(({ message }) => message)).toEqual([
        'Initializer reference "source_name" may read an earlier external binding; preserving names.',
      ]);
    } else {
      expect(plan.diagnostics).toEqual([]);
      expect(plan.edits).toContainEqual(
        expect.objectContaining({
          from: "{{.source_name}}",
          to: "{{.SOURCE_NAME}}",
        }),
      );
    }
  });

  test("does not substitute an available root binding for a forward local initializer binding", () => {
    const { analysis } = analysisOf(`vars: {source_name: root}
tasks:
  build_app:
    vars:
      derived_name: '{{.source_name}}'
      source_name: local`);
    const plan = createRenamePlan(analysis);
    expect(plan.edits).toEqual([]);
    expect(plan.diagnostics.map(({ message }) => message)).toEqual([
      'Initializer reference "source_name" may read an earlier external binding; preserving names.',
    ]);
  });

  test("retains unknown root references that can be supplied by task-local bindings", () => {
    const { analysis } = analysisOf(`vars: {derived_name: '{{.source_name}}'}
tasks:
  build_app:
    vars: {source_name: local}`);
    const plan = createRenamePlan(analysis);
    expect(plan.edits).toEqual([]);
    expect(plan.diagnostics.map(({ message }) => message)).toEqual([
      'Root reference "source_name" may depend on task-local variables; preserving names.',
    ]);
  });

  test("plans against immutable definitions and references without mutating YAML or exposing mutable edits", () => {
    const { document, analysis } = analysisOf(`vars:
  source_name: hello
  derived_name: '{{.source_name}}'
tasks:
  build_app: {deps: [build_app]}`);
    const before = document.toString();
    for (const { node } of [...analysis.definitions, ...analysis.references])
      Object.freeze(node);
    const plan = createRenamePlan(analysis);
    expect(plan.diagnostics).toEqual([]);
    expect(plan.edits.map(({ from, to }) => [from, to])).toEqual([
      ["source_name", "SOURCE_NAME"],
      ["derived_name", "DERIVED_NAME"],
      ["build_app", "build-app"],
      ["build_app", "build-app"],
      ["{{.source_name}}", "{{.SOURCE_NAME}}"],
    ]);
    expect(document.toString()).toBe(before);
    expect(() =>
      (plan.edits as unknown as { to: string }[]).push({ to: "bad" }),
    ).toThrow(TypeError);
    expect(() => {
      (plan.edits[0] as { to: string }).to = "bad";
    }).toThrow(TypeError);
    expect(createRenamePlan(analysis)).toEqual(plan);
  });
});
