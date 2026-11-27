import * as index from "./index";

describe("Index exports", () => {
  test("should export plugin as default", () => {
    expect(index.default).toBeDefined();
    expect(typeof index.default).toBe("object");
    expect(index.default.languages).toBeDefined();
    expect(index.default.parsers).toBeDefined();
    expect(index.default.printers).toBeDefined();
  });

  test.each([
    "sortTaskfileKeys",
    "uppercaseVariableNames",
    "kebabCaseTaskNames",
    "removeTemplateWhitespace",
    "processCommands",
    "formatTaskfile",
    "formatTaskfileText",
    "formatTaskfileTextWithDiagnostics",
    "checkTaskfileFormatting",
    "getYamlOptions",
    "addEmptyLines",
  ] as const)("exports the public function %s", (name) => {
    expect(typeof index[name]).toBe("function");
  });

  test("should be able to use exported functions", () => {
    // Test that the functions work correctly
    const testData = {
      version: "3",
      vars: { test_var: "value" },
      tasks: { test_task: { cmds: ["echo test"] } },
    };

    expect(() => {
      index.formatTaskfile(testData);
    }).not.toThrow();
  });

  test("exports the diagnostic API for preserved unsafe names", () => {
    const result = index.formatTaskfileTextWithDiagnostics(
      "vars: {foo: one, FOO: two}",
    );
    expect(result.text).toContain("foo:");
    expect(result.diagnostics[0].code).toBe("unsafe-rename");
  });

  test("should call all exported formatter functions correctly", () => {
    const testData = {
      version: "3",
      vars: { test_var: "value", another_var: "another_value" },
      tasks: {
        test_task: { cmds: ["echo test"] },
        another_task: { cmds: ["echo another"] },
      },
    };

    // Test sortTaskfileKeys
    expect(() => index.sortTaskfileKeys(testData)).not.toThrow();

    // Test uppercaseVariableNames with vars object
    const testVars = { test_var: "value", another_var: "another_value" };
    expect(() => index.uppercaseVariableNames(testVars)).not.toThrow();

    // Test kebabCaseTaskNames with tasks object
    const testTasks = {
      test_task: { cmds: ["echo test"] },
      another_task: { cmds: ["echo another"] },
    };
    expect(() => index.kebabCaseTaskNames(testTasks)).not.toThrow();

    // Test removeTemplateWhitespace with string
    const testString = "echo {{ .VAR }}";
    expect(() => index.removeTemplateWhitespace(testString)).not.toThrow();

    // Test processCommands with array
    const testCommands = ["echo {{ .VAR }}", "echo test"];
    expect(() => index.processCommands(testCommands)).not.toThrow();

    // Test formatTaskfile (already tested above but ensuring coverage)
    expect(() => index.formatTaskfile(testData)).not.toThrow();
  });

  test("should call all exported utility functions correctly", () => {
    // Test getYamlOptions
    const yamlOptions = index.getYamlOptions();
    expect(yamlOptions).toBeDefined();
    expect(typeof yamlOptions).toBe("object");

    // Test addEmptyLines
    const testYaml =
      "version: '3'\ntasks:\n  test:\n    cmds:\n      - echo test";
    const result = index.addEmptyLines(testYaml);
    expect(typeof result).toBe("string");
    expect(result).toContain("version:");
  });
});
