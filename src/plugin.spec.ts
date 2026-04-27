import { plugin } from "./plugin";

describe("Prettier Plugin", () => {
  test("should have required plugin structure", () => {
    expect(plugin.languages).toBeDefined();
    expect(plugin.parsers).toBeDefined();
    expect(plugin.printers).toBeDefined();
  });

  test("should define taskfile-yaml language", () => {
    expect(plugin.languages).toEqual([
      {
        name: "TaskfileYAML",
        extensions: [],
        filenames: [
          "Taskfile.yml",
          "Taskfile.yaml",
          "taskfile.yml",
          "taskfile.yaml",
        ],
        parsers: ["taskfile-yaml"],
      },
    ]);
  });

  test("should define taskfile-yaml parser", () => {
    const parser = plugin.parsers!["taskfile-yaml"];

    expect(parser).toBeDefined();
    expect(parser.parse).toBeDefined();
    expect(parser.astFormat).toBe("taskfile-yaml");
  });

  test("should define taskfile-yaml printer", () => {
    const printer = plugin.printers!["taskfile-yaml"];

    expect(printer).toBeDefined();
    expect(printer.print).toBeDefined();
  });

  test("should parse YAML correctly", () => {
    const parser = plugin.parsers!["taskfile-yaml"];
    const yaml =
      'version: "3"\ntasks:\n  build:\n    cmds:\n      - echo "test"';

    const result = parser.parse(yaml, {} as any);

    expect(result).toBeDefined();
    // The parser now returns a Document, so we need to get the JS object
    const jsObject = result.toJS();
    expect(jsObject.version).toBe("3");
    expect(jsObject.tasks).toBeDefined();
    expect(jsObject.tasks.build).toBeDefined();
    expect(jsObject.tasks.build.cmds).toEqual(['echo "test"']);
  });

  test("should handle malformed YAML gracefully", () => {
    const parser = plugin.parsers!["taskfile-yaml"];

    // Test with a more severely malformed YAML that should cause an error
    const malformedYaml = "\t\t\tversion: {\n  invalid"; // Invalid structure

    // Since yaml.parseDocument is very tolerant, we test that it at least doesn't crash
    expect(() => {
      const result = parser.parse(malformedYaml, {} as any);
      // If parsing succeeds, the result should be defined
      expect(result).toBeDefined();
    }).not.toThrow();
  });

  test("should format simple Taskfile", () => {
    const parser = plugin.parsers!["taskfile-yaml"];
    const printer = plugin.printers!["taskfile-yaml"];

    const yaml =
      'version: "3"\ntasks:\n  build:\n    cmds:\n      - echo "test"';
    const doc = parser.parse(yaml, {} as any);

    const mockPath = {
      getNode: () => doc,
    };

    const result = printer.print(mockPath as any, {} as any, {} as any);

    expect(typeof result).toBe("string");
    expect(String(result)).toContain('version: "3"');
    expect(String(result)).toContain("tasks:");
    expect(String(result)).toContain("build:");
    expect(String(result)).toContain("cmds:");
    expect(String(result)).toContain('- echo "test"');
  });

  test("should handle empty Taskfile", () => {
    const parser = plugin.parsers!["taskfile-yaml"];
    const printer = plugin.printers!["taskfile-yaml"];

    const yaml = "{}";
    const doc = parser.parse(yaml, {} as any);

    const mockPath = {
      getNode: () => doc,
    };

    const result = printer.print(mockPath as any, {} as any, {} as any);

    expect(typeof result).toBe("string");
    expect(String(result).trim()).toBe("{}");
  });

  test("should handle parser error correctly", () => {
    const parser = plugin.parsers!["taskfile-yaml"];

    // Mock yaml.parseDocument to throw an Error
    const originalParseDocument = require("yaml").parseDocument;
    const mockParseDocument = jest.fn().mockImplementation(() => {
      throw new Error("Test error");
    });
    require("yaml").parseDocument = mockParseDocument;

    expect(() => {
      parser.parse("invalid yaml", {} as any);
    }).toThrow("Invalid YAML: Test error");

    // Restore original function
    require("yaml").parseDocument = originalParseDocument;
  });

  test("should handle parser error with non-Error object", () => {
    const parser = plugin.parsers!["taskfile-yaml"];

    // Mock console.log and console.error to avoid output during tests
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalYamlParseDocument = require("yaml").parseDocument;

    console.log = jest.fn();
    console.error = jest.fn();

    // Mock yaml.parseDocument to throw a non-Error object
    require("yaml").parseDocument = jest.fn(() => {
      throw "String error"; // Non-Error object
    });

    try {
      expect(() => {
        parser.parse("some yaml", { filepath: "test.yml" } as any);
      }).toThrow("Invalid YAML: Unknown error");
    } finally {
      // Restore all original functions
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      require("yaml").parseDocument = originalYamlParseDocument;
    }
  });

  test("should handle printer error correctly", () => {
    const printer = plugin.printers!["taskfile-yaml"];

    // Create a mock path that throws an error
    const mockPath = {
      getNode: () => {
        throw new Error("Test error");
      },
    };

    expect(() => {
      printer.print(mockPath as any, {} as any, {} as any);
    }).toThrow("Formatting failed: Test error");
  });

  test("should handle printer error with non-Error object", () => {
    const printer = plugin.printers!["taskfile-yaml"];

    // Create a mock path that throws a non-Error object
    const mockPath = {
      getNode: () => {
        throw "String error"; // Non-Error object
      },
    };

    expect(() => {
      printer.print(mockPath as any, {} as any, {} as any);
    }).toThrow("Formatting failed: Unknown error");
  });

  test("should have locStart and locEnd functions", () => {
    const parser = plugin.parsers!["taskfile-yaml"];

    expect(parser.locStart).toBeDefined();
    expect(parser.locEnd).toBeDefined();
    expect(typeof parser.locStart).toBe("function");
    expect(typeof parser.locEnd).toBe("function");

    // Fallback: returns 0 for empty node
    const dummyNode = {};
    expect(parser.locStart(dummyNode)).toBe(0);
    expect(parser.locEnd(dummyNode)).toBe(0);

    // Returns range[0] / range[1] when node has range array
    const nodeWithRange = { range: [10, 20] };
    expect(parser.locStart(nodeWithRange)).toBe(10);
    expect(parser.locEnd(nodeWithRange)).toBe(20);

    // Returns start / end when node has explicit position properties
    const nodeWithStartEnd = { start: 5, end: 15 };
    expect(parser.locStart(nodeWithStartEnd)).toBe(5);
    expect(parser.locEnd(nodeWithStartEnd)).toBe(15);

    // start/end takes precedence over range when both exist
    const nodeWithBoth = { start: 3, end: 7, range: [10, 20] };
    expect(parser.locStart(nodeWithBoth)).toBe(3);
    expect(parser.locEnd(nodeWithBoth)).toBe(7);
  });

  test("should preserve comments during formatting", () => {
    const parser = plugin.parsers!["taskfile-yaml"];
    const printer = plugin.printers!["taskfile-yaml"];

    const yamlWithComments = `# Top comment
version: "3"

# Variables comment
vars:
  project_name: myproject # Inline comment

# Tasks comment
tasks:
  build_project: # Task comment
    cmds:
      - echo "test" # Command comment`;

    const doc = parser.parse(yamlWithComments, {} as any);
    const mockPath = {
      getNode: () => doc,
    };

    const result = printer.print(mockPath as any, {} as any, {} as any);

    expect(typeof result).toBe("string");

    // Check that comments are preserved
    expect(result).toContain("# Top comment");
    expect(result).toContain("# Variables comment");
    expect(result).toContain("# Inline comment");
    expect(result).toContain("# Tasks comment");
    expect(result).toContain("# Task comment");
    expect(result).toContain("# Command comment");

    // Check that formatting is still applied
    expect(result).toContain("PROJECT_NAME: myproject");
    expect(result).toContain("build-project:");
  });
});
