import yaml = require("yaml");
import { formatTaskfileText } from "../api/format-taskfile-text";
import { addEmptyLines, planEmptyLines } from "./add-empty-lines";
import { applyRenderEdits } from "./apply-render-edits";
import {
  formatFlowCollectionPadding,
  planFlowCollectionPadding,
} from "./flow-collection-padding";
import { renderTaskfileDocument } from "./render-taskfile-document";
import { SerializedYamlContext } from "./serialized-yaml-context";
import { getYamlOptions } from "./yaml-options";

describe("shared serialized YAML rendering", () => {
  afterEach(() => jest.restoreAllMocks());

  test.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    "uses one source-token parse with sequence padding %s and map spacing %s",
    (taskfileFlowSequencePadding, bracketSpacing) => {
      const source = `version: "3"
vars:
  LIST: [ one, { nested: [ two, three ] }, [], {} ] # collection comment
tasks:
  first: echo first
  # second task
  second: echo second
`;
      const document = yaml.parseDocument(source);
      const options = { taskfileFlowSequencePadding, bracketSpacing };
      const serialized = document.toString(getYamlOptions());
      const expected = addEmptyLines(
        formatFlowCollectionPadding(serialized, options),
      );
      const parse = jest.spyOn(yaml, "parseDocument");
      const output = renderTaskfileDocument(document, options);
      expect(parse).toHaveBeenCalledTimes(1);
      expect(parse).toHaveBeenCalledWith(serialized, {
        keepSourceTokens: true,
      });
      parse.mockRestore();
      expect(output).toBe(expected);
      expect(yaml.parse(output)).toEqual(yaml.parse(source));
      expect(renderTaskfileDocument(yaml.parseDocument(output), options)).toBe(
        output,
      );
    },
  );

  test.each(["|+", ">+"])(
    "coordinates padding, comment attachment, blank collapse and %s scalar ranges",
    (header) => {
      const source = `\n\nversion: "3"
vars: { LIST: [ one, { nested: [ two, three ] } ] } # [ keep ]


# unknown section
unknown: [ four, five ]
tasks:
  first:
    cmd: ${header}
      [ scalar content ]


  # second task
  second: [ six, seven ]


  third: echo third
`;
      const options = { bracketSpacing: false };
      const render = (text: string): string => {
        const context = new SerializedYamlContext(text);
        return applyRenderEdits(text, [
          ...planFlowCollectionPadding(context, options),
          ...planEmptyLines(context),
        ]);
      };
      const output = render(source);
      expect(output).toBe(`version: "3"

vars: {LIST: [one, {nested: [two, three]}]} # [ keep ]

# unknown section
unknown: [four, five]

tasks:
  first:
    cmd: ${header}
      [ scalar content ]


  # second task
  second: [six, seven]

  third: echo third
`);
      expect(yaml.parse(output)).toEqual(yaml.parse(source));
      expect(render(output)).toBe(output);
      const integrated = formatTaskfileText(source, options);
      expect(yaml.parse(integrated)).toEqual(yaml.parse(source));
      expect(formatTaskfileText(integrated, options)).toBe(integrated);
    },
  );

  test("retains standalone padding's parse-free skip and invalid/nonmap paths", () => {
    const parse = jest.spyOn(yaml, "parseDocument");
    const invalid = "tasks: [ unfinished\n";
    expect(
      formatFlowCollectionPadding(invalid, {
        taskfileFlowSequencePadding: true,
      }),
    ).toBe(invalid);
    expect(parse).not.toHaveBeenCalled();
    expect(formatFlowCollectionPadding(invalid)).toBe(invalid);
    expect(addEmptyLines(invalid)).toBe(invalid);
    expect(addEmptyLines("\n\n[ one, two ]\n")).toBe("\n\n[ one, two ]\n");
    expect(renderTaskfileDocument(yaml.parseDocument(""))).toBe("null\n");
    expect(renderTaskfileDocument(yaml.parseDocument("[ one, two ]\n"))).toBe(
      "[one, two]\n",
    );
  });
});
