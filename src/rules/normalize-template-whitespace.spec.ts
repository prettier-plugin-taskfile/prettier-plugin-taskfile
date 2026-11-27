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

  test("normalizes standalone identifiers without touching surrounding shell text", () => {
    expect(
      normalizeTemplateWhitespace("  echo '{{ .name_2 }}' {{\t.OTHER\t}}\n"),
    ).toBe("  echo '{{.name_2}}' {{.OTHER}}\n");
  });

  test.each([
    "{{- .NAME }}",
    "{{ .NAME -}}",
    "{{ . NAME }}",
    "{{ .NAME.Field }}",
    "{{ .NAME | quote }}",
    "{{ if .NAME }}",
    "{{ $NAME }}",
    "{{ index .NAME 0 }}",
    "{{ .123 }}",
    "{{ .NAME",
    '{{ printf "{{ .NAME }}" }}',
    '{{ printf "}} {{ .NAME }}" }}',
    '{{ printf "escaped \\"{{ .NAME }}\\"" }}',
    "{{ `{{ .NAME }}` }}",
    "{{ /* {{ .NAME }} */ }}",
  ])(
    "preserves complex, invalid and whitespace-trimming syntax: %s",
    (text) => {
      expect(normalizeTemplateWhitespace(text)).toBe(text);
    },
  );

  test("skips literal references inside actions but normalizes later simple actions", () => {
    const text = '{{ printf "{{ .INNER }}" }} {{ .OUTER }}';
    const result = '{{ printf "{{ .INNER }}" }} {{.OUTER}}';
    expect(normalizeTemplateWhitespace(text)).toBe(result);
    expect(normalizeTemplateWhitespace(result)).toBe(result);
  });
});
