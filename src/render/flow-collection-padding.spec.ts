import * as yaml from "yaml";
import { formatTaskfileText } from "../api/format-taskfile-text";

describe("single-line flow collection padding", () => {
  const input = `version: "3"

vars:
  STAGES: [init, build, deploy]
  OPTIONS: {debug: false, verbose: true}
`;

  test("formats the issue #13 example with unpadded arrays and padded objects", () => {
    expect(formatTaskfileText(input)).toBe(
      input.replace(
        "{debug: false, verbose: true}",
        "{ debug: false, verbose: true }",
      ),
    );
  });

  test.each([
    [false, false, "[init, build, deploy]", "{debug: false, verbose: true}"],
    [false, true, "[init, build, deploy]", "{ debug: false, verbose: true }"],
    [true, false, "[ init, build, deploy ]", "{debug: false, verbose: true}"],
    [true, true, "[ init, build, deploy ]", "{ debug: false, verbose: true }"],
  ])(
    "supports independent array padding %s and bracket spacing %s",
    (taskfileFlowSequencePadding, bracketSpacing, array, object) => {
      const options = { taskfileFlowSequencePadding, bracketSpacing };
      const output = formatTaskfileText(input, options);
      expect(output).toContain(`STAGES: ${array}`);
      expect(output).toContain(`OPTIONS: ${object}`);
      expect(yaml.parse(output)).toEqual(yaml.parse(input));
      expect(formatTaskfileText(output, options)).toBe(output);
    },
  );

  test("changes nested collections without touching scalar contents or comments", () => {
    const source = `vars:
  LIST: ["[ keep ]", "{ keep }", {nested: [one, two]}, [], {}] # [ comment ]
  TEXT: |-
    [ keep ]
    { keep }
  ANCHORED: &items [alpha, beta]
  ALIAS: *items
`;
    const output = formatTaskfileText(source);
    expect(output).toContain(
      'LIST: ["[ keep ]", "{ keep }", { nested: [one, two] }, [], {}] # [ comment ]',
    );
    expect(output).toContain("ANCHORED: &items [alpha, beta]");
    expect(yaml.parse(output)).toEqual(yaml.parse(source));
    expect(formatTaskfileText(output)).toBe(output);
  });

  test("preserves multiline flow comments while formatting nested single-line collections", () => {
    const source = `vars:
  LIST: [
    first, # [ comment ]
    {nested: [one, two]}
  ]
`;
    const output = formatTaskfileText(source, { bracketSpacing: false });
    expect(output).toContain("# [ comment ]");
    expect(output).toContain("{nested: [one, two]}");
    expect(yaml.parse(output)).toEqual(yaml.parse(source));
    expect(formatTaskfileText(output, { bracketSpacing: false })).toBe(output);
  });
});
