import * as fc from "fast-check";
import * as yaml from "yaml";
import { formatTaskfileText } from "./format-taskfile-text";

const identifierSuffix = fc
  .array(fc.constantFrom("a", "b", "c", "x", "y", "z"), {
    minLength: 1,
    maxLength: 12,
  })
  .map((characters) => characters.join(""));

const propertyOptions = { seed: 20261127, numRuns: 100 };

describe("Taskfile formatting contracts", () => {
  test("normalizes definitions and references together and reaches a fixed point", () => {
    fc.assert(
      fc.property(identifierSuffix, (suffix) => {
        const variable = `value_${suffix}`;
        const task = `build_${suffix}`;
        const input = yaml.stringify({
          tasks: {
            [task]: { cmds: [`echo "{{ .${variable} }}"`] },
            caller: {
              deps: [task],
              cmds: [{ task }],
            },
          },
          vars: { [variable]: suffix },
          version: "3",
        });

        const output = formatTaskfileText(input);
        const parsed = yaml.parse(output);
        const normalizedTask = `build-${suffix}`;
        expect(parsed.vars).toEqual({ [variable.toUpperCase()]: suffix });
        expect(parsed.tasks[normalizedTask].cmds).toEqual([
          `echo "{{.${variable.toUpperCase()}}}"`,
        ]);
        expect(parsed.tasks.caller.deps).toEqual([normalizedTask]);
        expect(parsed.tasks.caller.cmds).toEqual([{ task: normalizedTask }]);
        expect(formatTaskfileText(output)).toBe(output);
      }),
      propertyOptions,
    );
  });

  test("preserves colliding definitions without dropping data", () => {
    fc.assert(
      fc.property(identifierSuffix, (suffix) => {
        const tasks = {
          [`build_${suffix}`]: { cmds: ["echo first"] },
          [`build-${suffix}`]: { cmds: ["echo second"] },
        };
        const input = yaml.stringify({ version: "3", tasks });
        const output = formatTaskfileText(input);
        expect(yaml.parse(output).tasks).toEqual(tasks);
        expect(formatTaskfileText(output)).toBe(output);
        expect(() =>
          formatTaskfileText(input, { taskfileUnsafeRenames: "error" }),
        ).toThrow();
      }),
      propertyOptions,
    );
  });

  test("preserves scalar contents and unknown structures when names are disabled", () => {
    const scalar = fc
      .array(
        fc.constantFrom("a", " ", "\n", "#", ":", "'", '"', "-", "|", "\t"),
        { maxLength: 100 },
      )
      .map((characters) => characters.join(""));

    fc.assert(
      fc.property(scalar, (value) => {
        const document = {
          version: "3",
          vars: { lower_name: value },
          tasks: { task_name: { cmds: [value] } },
          custom: {
            task_name: value,
            literal: "{{ .lower_name }}",
          },
        };
        const options = { taskfileNormalizeNames: false };
        const output = formatTaskfileText(yaml.stringify(document), options);
        const parsed = yaml.parseDocument(output);
        expect(parsed.errors).toEqual([]);
        expect(parsed.toJS()).toEqual(document);
        expect(formatTaskfileText(output, options)).toBe(output);
      }),
      propertyOptions,
    );
  });
});
