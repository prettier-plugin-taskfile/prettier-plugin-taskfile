import * as yaml from "yaml";
import type { TaskfileDiagnostic } from "../types";
import {
  createTaskfileDocument,
  formatTaskfileText,
  printTaskfileDocument,
} from "./format-taskfile-text";

describe("Taskfile printer contracts", () => {
  test("mutates the supplied document when normalizing names and references", () => {
    const document = createTaskfileDocument(`tasks:
  build_app:
    cmds: ['echo {{.project_name}}']
  caller:
    deps: [build_app]
vars:
  project_name: demo
version: '3'
`);
    const before = document.toJS();

    const output = printTaskfileDocument(document);

    expect(before.vars).toEqual({ project_name: "demo" });
    expect(document.toJS()).toEqual({
      version: "3",
      vars: { PROJECT_NAME: "demo" },
      tasks: {
        "build-app": { cmds: ["echo {{.PROJECT_NAME}}"] },
        caller: { deps: ["build-app"] },
      },
    });
    expect(yaml.parse(output)).toEqual(document.toJS());
  });

  test("appends diagnostics without replacing existing entries in the supplied array", () => {
    const document = createTaskfileDocument(`includes:
  tools: ./tools.yml
tasks:
  build_app: echo build
`);
    const existing: TaskfileDiagnostic = {
      code: "unsafe-ordering",
      message: "Existing diagnostic",
    };
    const diagnostics = [existing];

    const output = printTaskfileDocument(document, {}, diagnostics);

    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0]).toBe(existing);
    expect(diagnostics[1]).toEqual(
      expect.objectContaining({ code: "unsafe-rename" }),
    );
    expect(yaml.parse(output).tasks).toEqual({ build_app: "echo build" });
  });

  test.each(["|+", ">+"])(
    "preserves later block values and comments after removing flow padding with %s",
    (header) => {
      const source = `version: '3' # schema
vars:
  PAYLOAD: [ { text: "[ keep ]", nested: [ one, two ] }, {}, [] ] # flow comment
  TEXT: |- # variable block
    { keep }
    tasks:
      not_a_task: value
tasks:
  first:
    cmd: ${header} # keep trailing paragraphs
      echo first


  # next task
  second:
    cmd: |- # later block
      [ keep ]

      # shell comment
      echo second
# final comment
`;
      const options = {
        taskfileNormalizeNames: false,
        bracketSpacing: false,
      };

      const output = formatTaskfileText(source, options);
      const parsed = yaml.parseDocument(output);

      expect(parsed.errors).toEqual([]);
      expect(parsed.toJS()).toEqual(yaml.parse(source));
      expect(output).toContain(
        'PAYLOAD: [{text: "[ keep ]", nested: [one, two]}, {}, []] # flow comment',
      );
      for (const comment of [
        "# schema",
        "# variable block",
        "# keep trailing paragraphs",
        "# next task\n  second:",
        "# later block",
        "# shell comment",
        "# final comment",
      ]) {
        expect(output).toContain(comment);
      }
      expect(formatTaskfileText(output, options)).toBe(output);
    },
  );
});
