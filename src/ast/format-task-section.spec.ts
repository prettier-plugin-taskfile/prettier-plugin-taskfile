import * as yaml from "yaml";
import { formatTaskSection } from "./format-task-section";

describe("formatTaskSection", () => {
  test("ignores entries whose task keys are not string scalars", () => {
    const tasksMap = new yaml.YAMLMap();
    tasksMap.items.push(new yaml.Pair(new yaml.YAMLSeq(), "ignored"));
    tasksMap.items.push(
      new yaml.Pair(
        new yaml.Scalar("build_task"),
        yaml.parseDocument('cmds:\n  - echo "{{ .PROJECT }}"').contents,
      ),
    );

    formatTaskSection(tasksMap);

    expect(tasksMap.items).toHaveLength(2);
    const taskEntry = tasksMap.items.find(
      (item) => yaml.isScalar(item.key) && item.key.value === "build-task",
    );
    expect(taskEntry).toBeDefined();
    if (!taskEntry) {
      throw new Error("task entry not found");
    }
    expect(yaml.isScalar(taskEntry.key) && taskEntry.key.value).toBe(
      "build-task",
    );
    expect(String(taskEntry.value)).toContain("{{.PROJECT}}");
  });
});
