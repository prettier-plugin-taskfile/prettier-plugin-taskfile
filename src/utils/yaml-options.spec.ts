import { getYamlOptions } from "./yaml-options";
import { DEFAULT_YAML_OPTIONS } from "../constants";

describe("getYamlOptions", () => {
  test("should return default YAML options", () => {
    const options = getYamlOptions();

    expect(options.indent).toBe(2);
    expect(options.lineWidth).toBe(0);
    expect(options.prettyErrors).toBe(true);
    expect(options.blockQuote).toBe(true);
    expect(options.flowLevel).toBe(-1);
    expect(options.defaultType).toBe("BLOCK_LITERAL");
  });

  test("should return a copy of default options", () => {
    const options1 = getYamlOptions();
    const options2 = getYamlOptions();

    // Should be equal but not the same reference
    expect(options1).toEqual(options2);
    expect(options1).not.toBe(options2);

    // Modifying one should not affect the other
    options1.indent = 4;
    expect(options2.indent).toBe(2);
  });

  test("should match DEFAULT_YAML_OPTIONS", () => {
    const options = getYamlOptions();

    expect(options).toEqual(DEFAULT_YAML_OPTIONS);
  });

  test("should have proper indentation setting for Taskfile style guide", () => {
    const options = getYamlOptions();

    // Taskfile style guide specifies 2-space indentation
    expect(options.indent).toBe(2);
  });

  test("should disable line wrapping", () => {
    const options = getYamlOptions();

    // Line wrapping should be disabled (lineWidth: 0)
    expect(options.lineWidth).toBe(0);
  });

  test("should prefer block style over flow style", () => {
    const options = getYamlOptions();

    // Should use block style (flowLevel: -1)
    expect(options.flowLevel).toBe(-1);
  });

  test("should enable pretty errors", () => {
    const options = getYamlOptions();

    expect(options.prettyErrors).toBe(true);
  });

  test("should prefer block quotes for multi-line strings", () => {
    const options = getYamlOptions();

    expect(options.blockQuote).toBe(true);
  });

  test("should prefer literal blocks for multi-line strings", () => {
    const options = getYamlOptions();

    expect(options.defaultType).toBe("BLOCK_LITERAL");
  });

  test("should apply tabWidth from prettier options", () => {
    const options = getYamlOptions({ tabWidth: 4 });

    expect(options.indent).toBe(4);
  });

  test("should apply printWidth from prettier options", () => {
    const options = getYamlOptions({ printWidth: 80 });

    expect(options.lineWidth).toBe(80);
  });

  test("should not apply printWidth when it is Infinity", () => {
    const options = getYamlOptions({ printWidth: Infinity });

    expect(options.lineWidth).toBe(0);
  });

  test("should apply singleQuote from prettier options", () => {
    const options = getYamlOptions({ singleQuote: true });

    expect(options.singleQuote).toBe(true);
  });

  test("should return defaults when prettier options are undefined", () => {
    const options = getYamlOptions(undefined);

    expect(options).toEqual(DEFAULT_YAML_OPTIONS);
  });

  test("should return defaults when prettier options are empty", () => {
    const options = getYamlOptions({});

    expect(options).toEqual(DEFAULT_YAML_OPTIONS);
  });
});
