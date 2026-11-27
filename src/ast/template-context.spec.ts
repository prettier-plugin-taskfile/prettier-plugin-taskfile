import * as yaml from "yaml";
import { analyzeTaskfileRenames } from "../planning/analyze-taskfile-renames";
import { formatTemplateFields } from "./format-template-fields";

function parseRoot(source: string): yaml.YAMLMap {
  const root = yaml.parseDocument(source).contents;
  if (!yaml.isMap(root)) throw new Error("Expected a root map");
  return root;
}

describe("Taskfile template contexts", () => {
  test.each(["sh", "ref"])(
    "retains the analyzer's entry-field gate for %s without narrowing formatting",
    (field) => {
      const root = parseRoot(
        `vars: {name: demo}\ntasks: {build: {${field}: 'echo {{ .name }}'}}`,
      );
      const nested = parseRoot(
        `vars: {name: demo, expression: {${field}: 'echo {{ .name }}'}}`,
      );

      expect(analyzeTaskfileRenames(root).hazards).toContain(
        "Templates in unknown fields require preserving names.",
      );
      expect(analyzeTaskfileRenames(nested).hazards).not.toContain(
        "Templates in unknown fields require preserving names.",
      );

      formatTemplateFields(root);
      formatTemplateFields(nested);
      expect(root.toJSON().tasks.build[field]).toBe("echo {{.name}}");
      expect(nested.toJSON().vars.expression[field]).toBe("echo {{.name}}");
    },
  );

  test("formats recognized fields without treating variable payloads as task fields", () => {
    const root = parseRoot(`
dir: '{{ .name }}'
label: '{{ .name }}'
vars:
  name: demo
  object:
    cmd: '{{ .name }}'
    sh: 'echo {{ .name }}'
    ref: '{{ .name }}'
  list:
    - '{{ .name }}'
    - sh: 'echo {{ .name }}'
  vars:
    arbitrary: '{{ .name }}'
    list: ['{{ .name }}']
tasks:
  build:
    desc: '{{ .name }}'
    sh: 'echo {{ .name }}'
    ref: '{{ .name }}'
    extension:
      cmds: ['{{ .name }}']
    cmds:
      - cmd: 'echo {{ .name }}'
        extension: '{{ .name }}'
`);

    formatTemplateFields(root);

    expect(root.toJSON()).toEqual({
      dir: "{{.name}}",
      label: "{{ .name }}",
      vars: {
        name: "demo",
        object: {
          cmd: "{{ .name }}",
          sh: "echo {{.name}}",
          ref: "{{.name}}",
        },
        list: ["{{ .name }}", { sh: "echo {{ .name }}" }],
        vars: {
          arbitrary: "{{.name}}",
          list: ["{{ .name }}"],
        },
      },
      tasks: {
        build: {
          desc: "{{.name}}",
          sh: "echo {{.name}}",
          ref: "{{.name}}",
          extension: { cmds: ["{{ .name }}"] },
          cmds: [{ cmd: "echo {{.name}}", extension: "{{ .name }}" }],
        },
      },
    });
  });

  test("inspects unknown keys and payload sequences while retaining recognition gates and order", () => {
    const root = parseRoot(`
vars:
  name: demo
  list:
    - '{{ .payload }}'
    - cmds: ['{{ .nested_payload }}']
extension:
  '{{ .key }}':
    desc: '{{ .unknown }}'
tasks:
  build:
    desc: '{{ .known }}'
    ref: '{{ .task_ref }}'
    extension:
      desc: '{{ .nested_unknown }}'
`);
    const before = root.toString();

    const analysis = analyzeTaskfileRenames(root);

    expect(analysis.references.map(({ name }) => name)).toEqual([
      "known",
      "task_ref",
      "nested_unknown",
      "payload",
      "nested_payload",
      "key",
      "unknown",
    ]);
    expect(analysis.hazards).toEqual([
      "Variable ref expressions require preserving names.",
      "Templates in unknown fields require preserving names.",
    ]);
    expect(root.toString()).toBe(before);
    expect(Object.isFrozen(analysis)).toBe(true);
    expect(analysis.references.every(Object.isFrozen)).toBe(true);
  });
});
