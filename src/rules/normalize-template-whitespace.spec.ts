import {
  normalizeCommand,
  normalizeTemplateWhitespace,
} from "./normalize-template-whitespace";

describe("normalizeTemplateWhitespace", () => {
  test("removes whitespace inside template expressions", () => {
    expect(normalizeTemplateWhitespace('echo "{{ .PROJECT_NAME }}"')).toBe(
      'echo "{{.PROJECT_NAME}}"',
    );
  });

  test("leaves non-string commands untouched", () => {
    const command = { task: "build" };
    expect(normalizeCommand(command)).toBe(command);
  });
});
