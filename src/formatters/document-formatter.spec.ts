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
    const result = formatTaskfileDocument(doc);

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
    const result = formatTaskfileDocument(doc);
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
    const result1 = formatTaskfileDocument(emptyDoc);
    expect(result1.toString().trim()).toBe("{}");

    // Test with non-map document
    const scalarDoc = yaml.parseDocument('"just a string"');
    const result2 = formatTaskfileDocument(scalarDoc);
    expect(result2.toString().trim()).toBe('"just a string"');
  });

  test("should format variable names to uppercase", () => {
    const yamlText = `vars:
  lowercase_var: value1
  mixedCase_Var: value2
  ALREADY_UPPER: value3`;

    const doc = yaml.parseDocument(yamlText);
    const result = formatTaskfileDocument(doc);
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
    const result = formatTaskfileDocument(doc);
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
    const result = formatTaskfileDocument(doc);
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
    const result = formatTaskfileDocument(doc);
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
});
