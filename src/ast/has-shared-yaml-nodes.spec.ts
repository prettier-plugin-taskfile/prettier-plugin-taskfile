import * as yaml from "yaml";
import { formatRootMap } from "./format-root-map";
import { TaskfileDiagnostic } from "../types";

describe("shared YAML node safety", () => {
  test.each([
    "dir: &directory '{{ .name }}'\nversion: '3'",
    "dir: '{{ .name }}'\nextension: *directory\nversion: '3'",
  ])(
    "preserves root order and templates when sharing is present: %s",
    (source) => {
      const root = yaml.parseDocument(source).contents;
      if (!yaml.isMap(root)) throw new Error("Expected a root map");
      const items = [...root.items];
      const before = root.toString();
      const diagnostics: TaskfileDiagnostic[] = [];

      formatRootMap(root, { taskfileNormalizeNames: false }, diagnostics);

      expect(root.items).toEqual(items);
      expect(root.toString()).toBe(before);
      expect(diagnostics).toEqual([
        {
          code: "unsafe-ordering",
          message: "Preserving root order to keep YAML anchors before aliases.",
        },
      ]);
    },
  );

  test("does not expand sharing detection to custom tags", () => {
    const root = yaml.parseDocument(
      "dir: !directory '{{ .name }}'\nversion: '3'",
    ).contents;
    if (!yaml.isMap(root)) throw new Error("Expected a root map");
    const diagnostics: TaskfileDiagnostic[] = [];

    formatRootMap(root, { taskfileNormalizeNames: false }, diagnostics);

    expect(root.items.map((pair) => String(pair.key))).toEqual([
      "version",
      "dir",
    ]);
    expect(root.get("dir")).toBe("{{.name}}");
    expect(diagnostics).toEqual([]);
  });
});
