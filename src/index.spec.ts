import * as index from "./index";

describe("Index exports", () => {
  test("should export plugin as default", () => {
    expect(index.default).toBeDefined();
    expect(typeof index.default).toBe("object");
    expect(index.default.languages).toBeDefined();
    expect(index.default.parsers).toBeDefined();
    expect(index.default.printers).toBeDefined();
  });

  test("should export all formatter functions", () => {
    expect(index.sortTaskfileKeys).toBeDefined();
    expect(index.uppercaseVariableNames).toBeDefined();
    expect(index.kebabCaseTaskNames).toBeDefined();
    expect(index.removeTemplateWhitespace).toBeDefined();
    expect(index.processCommands).toBeDefined();
    expect(index.formatTaskfile).toBeDefined();
    
    // Test function types
    expect(typeof index.sortTaskfileKeys).toBe("function");
    expect(typeof index.uppercaseVariableNames).toBe("function");
    expect(typeof index.kebabCaseTaskNames).toBe("function");
    expect(typeof index.removeTemplateWhitespace).toBe("function");
    expect(typeof index.processCommands).toBe("function");
    expect(typeof index.formatTaskfile).toBe("function");
  });

  test("should export utility functions", () => {
    expect(index.getYamlOptions).toBeDefined();
    expect(index.addEmptyLines).toBeDefined();
    
    // Test function types
    expect(typeof index.getYamlOptions).toBe("function");
    expect(typeof index.addEmptyLines).toBe("function");
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

  test("should maintain CommonJS compatibility", () => {
    // Test that the default export works in CommonJS style
    const plugin = index.default;
    expect(plugin).toBeDefined();
    expect(plugin.languages).toBeDefined();
  });

  test("should maintain ESM compatibility", () => {
    // Test that named exports work in ESM style
    const { formatTaskfile, sortTaskfileKeys } = index;
    expect(formatTaskfile).toBeDefined();
    expect(sortTaskfileKeys).toBeDefined();
  });

  test("should call all exported formatter functions correctly", () => {
    const testData = {
      version: "3",
      vars: { test_var: "value", another_var: "another_value" },
      tasks: { test_task: { cmds: ["echo test"] }, another_task: { cmds: ["echo another"] } },
    };

    // Test sortTaskfileKeys
    expect(() => index.sortTaskfileKeys(testData)).not.toThrow();
    
    // Test uppercaseVariableNames with vars object
    const testVars = { test_var: "value", another_var: "another_value" };
    expect(() => index.uppercaseVariableNames(testVars)).not.toThrow();
    
    // Test kebabCaseTaskNames with tasks object
    const testTasks = { test_task: { cmds: ["echo test"] }, another_task: { cmds: ["echo another"] } };
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
    const testYaml = "version: '3'\ntasks:\n  test:\n    cmds:\n      - echo test";
    const result = index.addEmptyLines(testYaml);
    expect(typeof result).toBe("string");
    expect(result).toContain("version:");
  });

  test("should set CommonJS module.exports properties correctly", () => {
    // In this test environment, we're testing the imported module
    // The CommonJS assignment is executed during import, so we test 
    // that the module can be used in a CommonJS context
    
    // Test that the main plugin export is accessible
    expect(index.default).toBeDefined();
    
    // Test that all function exports are accessible
    expect(index.sortTaskfileKeys).toBeDefined();
    expect(index.uppercaseVariableNames).toBeDefined();
    expect(index.kebabCaseTaskNames).toBeDefined();
    expect(index.removeTemplateWhitespace).toBeDefined();
    expect(index.processCommands).toBeDefined();
    expect(index.formatTaskfile).toBeDefined();
    expect(index.getYamlOptions).toBeDefined();
    expect(index.addEmptyLines).toBeDefined();
    
    // Test that they are actual functions
    expect(typeof index.sortTaskfileKeys).toBe("function");
    expect(typeof index.uppercaseVariableNames).toBe("function");
    expect(typeof index.kebabCaseTaskNames).toBe("function");
    expect(typeof index.removeTemplateWhitespace).toBe("function");
    expect(typeof index.processCommands).toBe("function");
    expect(typeof index.formatTaskfile).toBe("function");
    expect(typeof index.getYamlOptions).toBe("function");
    expect(typeof index.addEmptyLines).toBe("function");
  });
});
