import * as yaml from "yaml";
import { formatTaskfileDocument } from "./format-document";

describe("formatTaskfileDocument", () => {
  test("formats the document through AST-oriented modules", () => {
    const input = `# Top comment
tasks:
  build_project:
    cmds:
      - echo "{{ .PROJECT_NAME }}"
vars:
  project_name: demo
version: "3"`;

    const document = yaml.parseDocument(input);
    const result = formatTaskfileDocument(document).toString();

    expect(result).toContain("# Top comment");
    expect(result.indexOf("version:")).toBeLessThan(result.indexOf("vars:"));
    expect(result.indexOf("vars:")).toBeLessThan(result.indexOf("tasks:"));
    expect(result).toContain("PROJECT_NAME: demo");
    expect(result).toContain("build-project:");
    expect(result).toContain('{{.PROJECT_NAME}}');
  });
});
