import * as yaml from "yaml";
import { formatTaskfileDocument } from "./document-formatter";

describe("Document Formatter", () => {
  test("should preserve comments while formatting", () => {
    const yamlWithComments = `# Top level comment
version: "3"

# Variables section
vars:
  project_name: myproject # Inline comment
  env: development

# Tasks section
tasks:
  # Build task comment
  build_project:
    desc: Build the project
    cmds:
      - echo "Building {{   .PROJECT_NAME   }}" # Command comment`;

    const doc = yaml.parseDocument(yamlWithComments);
    const result = formatTaskfileDocument(doc, yamlWithComments);

    const formattedYaml = result.toString();

    // Check that comments are preserved
    expect(formattedYaml).toContain("# Top level comment");
    expect(formattedYaml).toContain("# Variables section");
    expect(formattedYaml).toContain("# Inline comment");
    expect(formattedYaml).toContain("# Tasks section");
    expect(formattedYaml).toContain("# Build task comment");
    expect(formattedYaml).toContain("# Command comment");

    // Check that formatting is applied
    expect(formattedYaml).toContain("PROJECT_NAME: myproject"); // Variable name uppercased
    expect(formattedYaml).toContain("ENV: development");
    expect(formattedYaml).toContain("build-project:"); // Task name kebab-cased
    expect(formattedYaml).toContain("{{.PROJECT_NAME}}"); // Template whitespace removed
  });

  test("should sort keys according to priority", () => {
    const yamlText = `tasks:
  build:
    cmds:
      - echo "test"
vars:
  PROJECT: myproject
version: "3"`;

    const doc = yaml.parseDocument(yamlText);
    const result = formatTaskfileDocument(doc, yamlText);
    const formattedYaml = result.toString();

    // Check that keys are in the correct order
    const versionIndex = formattedYaml.indexOf("version:");
    const varsIndex = formattedYaml.indexOf("vars:");
    const tasksIndex = formattedYaml.indexOf("tasks:");

    expect(versionIndex).toBeLessThan(varsIndex);
    expect(varsIndex).toBeLessThan(tasksIndex);
  });

  test("should handle empty or invalid documents", () => {
    // Test with empty document
    const emptyDoc = yaml.parseDocument("{}");
    const result1 = formatTaskfileDocument(emptyDoc, "{}");
    expect(result1.toString().trim()).toBe("{}");

    // Test with non-map document
    const scalarDoc = yaml.parseDocument('"just a string"');
    const result2 = formatTaskfileDocument(scalarDoc, '"just a string"');
    expect(result2.toString().trim()).toBe('"just a string"');
  });

  test("should format variable names to uppercase", () => {
    const yamlText = `vars:
  lowercase_var: value1
  mixedCase_Var: value2
  ALREADY_UPPER: value3`;

    const doc = yaml.parseDocument(yamlText);
    const result = formatTaskfileDocument(doc, yamlText);
    const formattedYaml = result.toString();

    expect(formattedYaml).toContain("LOWERCASE_VAR: value1");
    expect(formattedYaml).toContain("MIXEDCASE_VAR: value2");
    expect(formattedYaml).toContain("ALREADY_UPPER: value3");
  });

  test("should format task names to kebab-case", () => {
    const yamlText = `tasks:
  build_project:
    cmds:
      - echo "build"
  testSuite:
    cmds:
      - echo "test"
  already-kebab:
    cmds:
      - echo "already"`;

    const doc = yaml.parseDocument(yamlText);
    const result = formatTaskfileDocument(doc, yamlText);
    const formattedYaml = result.toString();

    expect(formattedYaml).toContain("build-project:");
    expect(formattedYaml).toContain("test-suite:");
    expect(formattedYaml).toContain("already-kebab:");
  });

  test("should format template variables in commands", () => {
    const yamlText = `tasks:
  build:
    cmds:
      - echo "{{   .PROJECT_NAME   }}"
      - echo "{{.ALREADY_FORMATTED}}"
      - echo "{{ .WITH_SPACES }}"`;

    const doc = yaml.parseDocument(yamlText);
    const result = formatTaskfileDocument(doc, yamlText);
    const formattedYaml = result.toString();

    expect(formattedYaml).toContain('echo "{{.PROJECT_NAME}}"');
    expect(formattedYaml).toContain('echo "{{.ALREADY_FORMATTED}}"');
    expect(formattedYaml).toContain('echo "{{.WITH_SPACES}}"');
  });

  test("should handle complex nested structures with comments", () => {
    const yamlWithComments = `# Configuration
version: "3"

# Global variables
vars:
  project_name: myapp # Project identifier
  build_env: production

# Task definitions
tasks:
  # Development tasks
  build_app: # Main build task
    desc: Build the application
    deps:
      - clean_build # Clean first
    cmds:
      - echo "Building {{   .PROJECT_NAME   }}..." # Start message
      - npm run build
    vars:
      local_var: value # Task-specific variable`;

    const doc = yaml.parseDocument(yamlWithComments);
    const result = formatTaskfileDocument(doc, yamlWithComments);
    const formattedYaml = result.toString();

    // Verify comments are preserved
    expect(formattedYaml).toContain("# Configuration");
    expect(formattedYaml).toContain("# Global variables");
    expect(formattedYaml).toContain("# Project identifier");
    expect(formattedYaml).toContain("# Task definitions");
    expect(formattedYaml).toContain("# Development tasks");
    expect(formattedYaml).toContain("# Main build task");
    expect(formattedYaml).toContain("# Clean first");
    expect(formattedYaml).toContain("# Start message");
    expect(formattedYaml).toContain("# Task-specific variable");

    // Verify formatting is applied
    expect(formattedYaml).toContain("PROJECT_NAME: myapp");
    expect(formattedYaml).toContain("BUILD_ENV: production");
    expect(formattedYaml).toContain("build-app:");
    expect(formattedYaml).toContain("clean_build"); // deps is not formatted by current implementation
    expect(formattedYaml).toContain("{{.PROJECT_NAME}}");
  });

  test("should throw error when keys are out of order with comments", () => {
    const yamlWithComments = `# Variables section
vars:
  PROJECT: myproject

# Version comment
version: "3"

# Tasks section
tasks:
  build:
    cmds:
      - echo "test"`;

    const doc = yaml.parseDocument(yamlWithComments);

    expect(() => {
      formatTaskfileDocument(doc, yamlWithComments);
    }).toThrow(
      /Key "version" appears after "vars", but should come before it\./,
    );
  });

  test("should validate key order when comments are present", () => {
    const yamlWithComments = `# Version comment
version: "3"

# Variables comment
vars:
  PROJECT: myproject

# Tasks comment
tasks:
  build:
    cmds:
      - echo "test"`;

    const doc = yaml.parseDocument(yamlWithComments);

    // Should not throw error because keys are in correct order
    expect(() => {
      formatTaskfileDocument(doc, yamlWithComments);
    }).not.toThrow();

    const result = formatTaskfileDocument(doc, yamlWithComments);
    const formattedYaml = result.toString();

    // Verify comments are preserved
    expect(formattedYaml).toContain("# Version comment");
    expect(formattedYaml).toContain("# Variables comment");
    expect(formattedYaml).toContain("# Tasks comment");

    // Formatting should still be applied
    expect(formattedYaml).toContain("PROJECT: myproject");
    expect(formattedYaml).toContain("build:");
  });

  test("should not sort when comments are present at root level", () => {
    const yamlWithComments = `# Top comment
version: "3"
# Middle comment
tasks:
  build:
    cmds:
      - echo "test"
# Bottom comment
vars:
  PROJECT: myproject`;

    const doc = yaml.parseDocument(yamlWithComments);

    // This should throw because vars is after tasks with comments present
    expect(() => {
      formatTaskfileDocument(doc, yamlWithComments);
    }).toThrow(/appears after "tasks", but should come before it/);
  });

  test("should sort without comments when key order is wrong but no comments exist", () => {
    const yamlText = `tasks:
  build:
    cmds:
      - echo "test"
vars:
  PROJECT: myproject
version: "3"`;

    const doc = yaml.parseDocument(yamlText);
    const result = formatTaskfileDocument(doc, yamlText);
    const formattedYaml = result.toString();

    // Check that keys are sorted correctly
    const versionIndex = formattedYaml.indexOf("version:");
    const varsIndex = formattedYaml.indexOf("vars:");
    const tasksIndex = formattedYaml.indexOf("tasks:");

    expect(versionIndex).toBeLessThan(varsIndex);
    expect(varsIndex).toBeLessThan(tasksIndex);
  });

  test("should include location information in errors", () => {
    const yamlWithComments = `# This file has comments
tasks:
  build:
    cmds:
      - echo "test"

# Variables
vars:
  PROJECT: test

# Version (wrong position)
version: "3"`;

    const doc = yaml.parseDocument(yamlWithComments);

    try {
      formatTaskfileDocument(doc, yamlWithComments);
      fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      // Check that error has location information
      const err = error as any;
      // The error should have start and end position information from the key's range
      expect(typeof err.start).toBe("number");
      expect(typeof err.end).toBe("number");
      expect(err.start).toBeGreaterThanOrEqual(0);
      expect(err.end).toBeGreaterThan(err.start);
      expect(err.loc).toBeDefined();
      expect(err.loc.start).toBeDefined();
      expect(err.loc.end).toBeDefined();
      expect(err.loc.start.line).toBe(0);
      expect(typeof err.loc.start.column).toBe("number");
      expect(typeof err.loc.end.column).toBe("number");
    }
  });

  test("should auto-sort when only inline comments are present (no root-level comments)", () => {
    // Inline comments (key: value # comment) do not affect sort detection,
    // so the formatter should sort automatically without throwing an error.
    const yamlWithInlineOnly = `vars:
  PROJECT: test # inline comment

version: "3" # inline comment

tasks:
  build:
    cmds:
      - echo "test" # inline comment`;

    const doc = yaml.parseDocument(yamlWithInlineOnly);

    // Should NOT throw - inline comments don't block auto-sort
    expect(() => {
      formatTaskfileDocument(doc, yamlWithInlineOnly);
    }).not.toThrow();

    const result = formatTaskfileDocument(doc, yamlWithInlineOnly);
    const formattedYaml = result.toString();

    // Keys should be auto-sorted into correct order
    const versionIndex = formattedYaml.indexOf("version:");
    const varsIndex = formattedYaml.indexOf("vars:");
    const tasksIndex = formattedYaml.indexOf("tasks:");
    expect(versionIndex).toBeLessThan(varsIndex);
    expect(varsIndex).toBeLessThan(tasksIndex);

    // Inline comments should be preserved
    expect(formattedYaml).toContain("# inline comment");
  });

  test("should throw error when root-level comment and inline comment are mixed and keys are out of order", () => {
    // Even if some comments are inline, a root-level comment disables auto-sort
    const yamlMixed = `# Root comment
vars:
  PROJECT: test # inline comment

version: "3" # inline comment`;

    const doc = yaml.parseDocument(yamlMixed);

    expect(() => {
      formatTaskfileDocument(doc, yamlMixed);
    }).toThrow(
      /Key "version" appears after "vars", but should come before it\./,
    );
  });
});
