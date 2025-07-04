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
        extensions: [".yml", ".yaml"],
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
    expect(result.version).toBe("3");
    expect(result.tasks).toBeDefined();
    expect(result.tasks.build).toBeDefined();
    expect(result.tasks.build.cmds).toEqual(['echo "test"']);
  });

  test("should handle malformed YAML gracefully", () => {
    const parser = plugin.parsers!["taskfile-yaml"];
    const malformedYaml = "version: 3\ntasks:\n  build\n    cmds:"; // Missing colon

    expect(() => {
      parser.parse(malformedYaml, {} as any);
    }).toThrow();
  });

  test("should format simple Taskfile", () => {
    const printer = plugin.printers!["taskfile-yaml"];
    const data = {
      version: "3",
      tasks: {
        build: {
          cmds: ['echo "test"'],
        },
      },
    };

    const mockPath = {
      getValue: () => data,
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
    const printer = plugin.printers!["taskfile-yaml"];
    const data = {};

    const mockPath = {
      getValue: () => data,
    };

    const result = printer.print(mockPath as any, {} as any, {} as any);

    expect(typeof result).toBe("string");
    expect(String(result).trim()).toBe("{}");
  });

  test("should handle parser error correctly", () => {
    const parser = plugin.parsers!["taskfile-yaml"];
    
    // Mock yaml.parse to throw an Error
    const originalParse = require("yaml").parse;
    const mockParse = jest.fn().mockImplementation(() => {
      throw new Error("Test error");
    });
    require("yaml").parse = mockParse;

    expect(() => {
      parser.parse("invalid yaml", {} as any);
    }).toThrow("Invalid YAML: Test error");

    // Restore original function
    require("yaml").parse = originalParse;
  });

  test("should handle parser error with non-Error object", () => {
    const parser = plugin.parsers!["taskfile-yaml"];
    
    // Mock console.log and console.error to avoid output during tests
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalYamlParse = require("yaml").parse;
    
    console.log = jest.fn();
    console.error = jest.fn();
    
    // Mock yaml.parse to throw a non-Error object
    require("yaml").parse = jest.fn(() => {
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
      require("yaml").parse = originalYamlParse;
    }
  });

  test("should handle printer error correctly", () => {
    const printer = plugin.printers!["taskfile-yaml"];
    
    // Create a mock path that throws an error
    const mockPath = {
      getValue: () => {
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
      getValue: () => {
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
    
    // Test that they return 0 (with dummy node argument)
    const dummyNode = {};
    expect(parser.locStart(dummyNode)).toBe(0);
    expect(parser.locEnd(dummyNode)).toBe(0);
  });
});
