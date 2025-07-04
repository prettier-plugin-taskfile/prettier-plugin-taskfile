import {
  removeTemplateWhitespace,
  processCommands,
} from "./template-formatter";

describe("removeTemplateWhitespace", () => {
  test("should remove whitespace in template variables", () => {
    const input = "Hello {{ .NAME }} and {{ .WORLD }}";
    const result = removeTemplateWhitespace(input);

    expect(result).toBe("Hello {{.NAME}} and {{.WORLD}}");
  });

  test("should handle multiple template variables in one line", () => {
    const input = "Hello {{ .NAME }} and {{ .WORLD }} and {{ .FOO }}";
    const result = removeTemplateWhitespace(input);

    expect(result).toBe("Hello {{.NAME}} and {{.WORLD}} and {{.FOO}}");
  });

  test("should handle template variables with different whitespace patterns", () => {
    const input = "Hello {{.NAME}} and {{ .WORLD}} and {{  .FOO  }}";
    const result = removeTemplateWhitespace(input);

    expect(result).toBe("Hello {{.NAME}} and {{.WORLD}} and {{.FOO}}");
  });

  test("should not modify text without template variables", () => {
    const input = "Hello world";
    const result = removeTemplateWhitespace(input);

    expect(result).toBe("Hello world");
  });

  test("should handle edge cases with whitespace variations", () => {
    const testCases = [
      { input: "{{.VAR}}", expected: "{{.VAR}}" }, // Already correct
      { input: "{{ .VAR }}", expected: "{{.VAR}}" }, // Standard case
      { input: "{{  .VAR  }}", expected: "{{.VAR}}" }, // Multiple spaces
      { input: "{{\t.VAR\t}}", expected: "{{.VAR}}" }, // Tabs
      { input: "{{\n.VAR\n}}", expected: "{{.VAR}}" }, // Newlines
      { input: "{{ \t .VAR \t }}", expected: "{{.VAR}}" }, // Mixed whitespace
    ];

    testCases.forEach(({ input, expected }) => {
      expect(removeTemplateWhitespace(input)).toBe(expected);
    });
  });

  test("should handle variables with underscores and numbers", () => {
    const input = "Value: {{ .MY_VAR_123 }} and {{ .ANOTHER_VAR }}";
    const result = removeTemplateWhitespace(input);

    expect(result).toBe("Value: {{.MY_VAR_123}} and {{.ANOTHER_VAR}}");
  });

  test("should not affect other curly braces", () => {
    const input = "Template: {{ .VAR }} but not { regular } or {{{ weird }}}";
    const result = removeTemplateWhitespace(input);

    expect(result).toBe(
      "Template: {{.VAR}} but not { regular } or {{{ weird }}}",
    );
  });

  test("should handle empty string", () => {
    expect(removeTemplateWhitespace("")).toBe("");
  });

  test("should handle complex multi-line strings", () => {
    const input = `
      echo "Building {{ .PROJECT_NAME }}"
      docker build -t {{ .IMAGE_TAG }} .
      echo "Version: {{ .VERSION }}"
    `;
    const result = removeTemplateWhitespace(input);

    expect(result).toContain("{{.PROJECT_NAME}}");
    expect(result).toContain("{{.IMAGE_TAG}}");
    expect(result).toContain("{{.VERSION}}");
    expect(result).not.toContain("{{ .");
  });
});

describe("processCommands", () => {
  test("should process template variables in commands", () => {
    const input = [
      'echo "Hello {{ .NAME }}"',
      'echo "Project: {{ .PROJECT }}"',
    ];

    const result = processCommands(input);

    expect(result[0]).toBe('echo "Hello {{.NAME}}"');
    expect(result[1]).toBe('echo "Project: {{.PROJECT}}"');
  });

  test("should handle non-string commands", () => {
    const input = [
      'echo "Hello {{ .NAME }}"',
      { sh: 'echo "Hello {{ .NAME }}"' },
    ];

    const result = processCommands(input);

    expect(result[0]).toBe('echo "Hello {{.NAME}}"');
    expect(result[1]).toEqual({ sh: 'echo "Hello {{ .NAME }}"' }); // Non-string should be unchanged
  });

  test("should handle empty array", () => {
    const input: string[] = [];
    const result = processCommands(input);
    expect(result.length).toBe(0);
  });

  test("should handle null/undefined input", () => {
    expect(processCommands(null as any)).toBe(null);
    expect(processCommands(undefined as any)).toBe(undefined);
  });

  test("should handle mixed command types", () => {
    const input = [
      'echo "Template: {{ .VAR }}"',
      { cmd: "build", silent: true },
      { task: "other-task" },
      "ls -la {{ .DIR }}",
      42, // Edge case: number
      null, // Edge case: null
    ];

    const result = processCommands(input);

    expect(result[0]).toBe('echo "Template: {{.VAR}}"');
    expect(result[1]).toEqual({ cmd: "build", silent: true });
    expect(result[2]).toEqual({ task: "other-task" });
    expect(result[3]).toBe("ls -la {{.DIR}}");
    expect(result[4]).toBe(42);
    expect(result[5]).toBe(null);
  });

  test("should handle complex command structures", () => {
    const input = [
      "docker run -e NODE_ENV={{ .ENV }} app",
      {
        cmd: "custom command",
        vars: { VAR: "value" },
        env: { ENV: "test" },
      },
      'echo "Multi {{ .VAR1 }} and {{ .VAR2 }}"',
    ];

    const result = processCommands(input);

    expect(result[0]).toBe("docker run -e NODE_ENV={{.ENV}} app");
    expect(result[1]).toEqual({
      cmd: "custom command",
      vars: { VAR: "value" },
      env: { ENV: "test" },
    });
    expect(result[2]).toBe('echo "Multi {{.VAR1}} and {{.VAR2}}"');
  });

  test("should handle commands with special characters", () => {
    const input = [
      'grep "{{ .PATTERN }}" file.txt',
      'sed "s/{{ .OLD }}/{{ .NEW }}/g" file.txt',
      "awk '{ print \"{{ .VAR }}\" }' file.txt",
    ];

    const result = processCommands(input);

    expect(result[0]).toBe('grep "{{.PATTERN}}" file.txt');
    expect(result[1]).toBe('sed "s/{{.OLD}}/{{.NEW}}/g" file.txt');
    expect(result[2]).toBe("awk '{ print \"{{.VAR}}\" }' file.txt");
  });

  test("should preserve array structure", () => {
    const input = ["cmd1", "cmd2", "cmd3"];
    const result = processCommands(input);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
  });
});
