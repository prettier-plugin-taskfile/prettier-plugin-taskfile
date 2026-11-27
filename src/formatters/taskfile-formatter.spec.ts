import { formatTaskfile } from "./taskfile-formatter";

describe("formatTaskfile", () => {
  test("the object API can opt into local renaming with included tasks", () => {
    const input = {
      version: "3",
      includes: { tools: "./tools.yml" },
      tasks: {
        build_app: { deps: ["tools:foreign_task"], cmds: ["echo local"] },
      },
    };
    const result = formatTaskfile(input, {
      taskfileAllowRenamesWithIncludes: true,
    });
    expect(result.tasks?.["build-app"]?.deps).toEqual(["tools:foreign_task"]);
    expect(result.includes).toEqual(input.includes);
    expect(input.tasks.build_app).toBeDefined();
  });

  test("should handle null or undefined input", () => {
    expect(formatTaskfile(null as any)).toEqual({});
    expect(formatTaskfile(undefined as any)).toEqual({});
  });

  test("should format a complete Taskfile", () => {
    const input = {
      tasks: {
        build_app: {
          cmds: ['echo "Building {{ .project_name }}"'],
        },
        test_suite: {
          cmds: ['echo "Testing {{ .debug_mode }}"'],
        },
      },
      env: { NODE_ENV: "development" },
      includes: {},
      vars: {
        project_name: "my-project",
        debug_mode: true,
      },
      version: "3",
    };

    const result = formatTaskfile(input);

    // Check key ordering
    const keys = Object.keys(result);
    expect(keys[0]).toBe("version");
    expect(keys[1]).toBe("includes");
    expect(keys[2]).toBe("vars");
    expect(keys[3]).toBe("env");
    expect(keys[4]).toBe("tasks");

    // Check variable formatting
    expect(result.vars?.PROJECT_NAME).toBe("my-project");
    expect(result.vars?.DEBUG_MODE).toBe(true);

    // Check task formatting
    expect(result.tasks?.["build-app"]).toBeDefined();
    expect(result.tasks?.["test-suite"]).toBeDefined();
    expect(result.tasks?.build_app).toBeUndefined();
    expect(result.tasks?.test_suite).toBeUndefined();

    // Check template formatting in commands
    expect(result.tasks?.["build-app"]?.cmds?.[0]).toBe(
      'echo "Building {{.PROJECT_NAME}}"',
    );
    expect(result.tasks?.["test-suite"]?.cmds?.[0]).toBe(
      'echo "Testing {{.DEBUG_MODE}}"',
    );
  });

  test("should handle tasks_with_templates sections", () => {
    const input = {
      version: "3",
      tasks: {
        normal_task: {
          cmds: ['echo "normal"'],
        },
      },
      tasks_with_templates: {
        template_task: {
          cmds: ['echo "Hello {{ .NAME }}"'],
        },
        another_template: {
          cmds: ['echo "Value: {{ .VALUE }}"'],
        },
      },
    };

    const result = formatTaskfile(input);

    expect(result.tasks_with_templates).toEqual(input.tasks_with_templates);
  });

  test("should handle multiple task-like sections", () => {
    const input = {
      version: "3",
      tasks_dev: {
        dev_task: {
          cmds: ['echo "dev {{ .ENV }}"'],
        },
      },
      tasks_prod: {
        prod_task: {
          cmds: ['echo "prod {{ .ENV }}"'],
        },
      },
    };

    const result = formatTaskfile(input);

    expect(result.tasks_dev).toEqual(input.tasks_dev);
    expect(result.tasks_prod).toEqual(input.tasks_prod);
  });

  test("should preserve task properties while formatting", () => {
    const input = {
      version: "3",
      tasks: {
        complex_task: {
          desc: "A complex task",
          deps: ["other-task"],
          sources: ["src/**/*.ts"],
          generates: ["dist/app.js"],
          vars: {
            task_var: "value",
          },
          env: {
            TASK_ENV: "test",
          },
          cmds: [
            'echo "Building {{ .PROJECT }}"',
            { cmd: "npm run build", silent: true },
          ],
          silent: false,
          interactive: true,
        },
        "other-task": { cmds: [] },
      },
    };

    const result = formatTaskfile(input);
    const task = result.tasks?.["complex-task"];

    expect(task?.desc).toBe("A complex task");
    expect(task?.deps).toEqual(["other-task"]);
    expect(task?.sources).toEqual(["src/**/*.ts"]);
    expect(task?.generates).toEqual(["dist/app.js"]);
    expect(task?.vars).toEqual({ TASK_VAR: "value" });
    expect(task?.env).toEqual({ TASK_ENV: "test" });
    expect(task?.silent).toBe(false);
    expect(task?.interactive).toBe(true);

    // Check command formatting
    expect(task?.cmds?.[0]).toBe('echo "Building {{.PROJECT}}"');
    expect(task?.cmds?.[1]).toEqual({ cmd: "npm run build", silent: true });
  });

  test("should only process vars if they exist", () => {
    const input = {
      version: "3",
      tasks: {
        test_task: {
          cmds: ['echo "test"'],
        },
      },
    };

    const result = formatTaskfile(input);

    expect(result.vars).toBeUndefined();
    expect(result.tasks?.["test-task"]).toBeDefined();
  });

  test("should only process tasks if they exist", () => {
    const input = {
      version: "3",
      vars: {
        test_var: "value",
      },
    };

    const result = formatTaskfile(input);

    expect(result.vars?.TEST_VAR).toBe("value");
    expect(result.tasks).toBeUndefined();
  });

  test("should handle tasks without commands", () => {
    const input = {
      version: "3",
      tasks: {
        task_without_cmds: {
          desc: "A task without commands",
          deps: ["other-task"],
        },
        task_with_empty_cmds: {
          desc: "A task with empty commands",
          cmds: [],
        },
        "other-task": { cmds: [] },
      },
    };

    const result = formatTaskfile(input);

    const taskWithoutCmds = result.tasks?.["task-without-cmds"];
    expect(taskWithoutCmds?.desc).toBe("A task without commands");
    expect(taskWithoutCmds?.deps).toEqual(["other-task"]);
    expect(taskWithoutCmds?.cmds).toBeUndefined();

    const taskWithEmptyCmds = result.tasks?.["task-with-empty-cmds"];
    expect(taskWithEmptyCmds?.desc).toBe("A task with empty commands");
    expect(taskWithEmptyCmds?.cmds).toEqual([]);
  });

  test("should handle tasks_custom section with proper object type check", () => {
    const input = {
      version: "3",
      tasks_custom: {
        custom_task: {
          cmds: ['echo "custom {{ .VAR }}"'],
        },
      },
      tasks_invalid: "not an object", // This should be ignored
    };

    const result = formatTaskfile(input);

    expect(result.tasks_custom).toEqual(input.tasks_custom);

    // Invalid tasks_ section should be preserved as-is
    expect((result as any).tasks_invalid).toBe("not an object");
  });

  test("should handle tasks_ sections with tasks without cmds", () => {
    const input = {
      version: "3",
      tasks_special: {
        task_with_cmds: {
          cmds: ['echo "has cmds {{ .VAR }}"'],
        },
        task_without_cmds: {
          desc: "No commands",
          deps: ["other-task"],
        },
      },
    };

    const result = formatTaskfile(input);

    expect(result.tasks_special).toEqual(input.tasks_special);
  });

  test("should preserve null task entries without trying to process commands", () => {
    const input = {
      version: "3",
      tasks_special: {
        skipped_task: null,
      },
    };

    const result = formatTaskfile(input as any);

    expect(result.tasks_special?.skipped_task).toBeNull();
  });

  test("uses the same collision policy without mutating the input object", () => {
    const input = {
      version: "3",
      tasks: {
        build_app: { cmds: ["echo first"] },
        "build-app": { cmds: ["echo second"] },
      },
    };
    const snapshot = JSON.parse(JSON.stringify(input));
    expect(formatTaskfile(input).tasks).toEqual(input.tasks);
    expect(input).toEqual(snapshot);
    expect(() =>
      formatTaskfile(input, { taskfileUnsafeRenames: "error" }),
    ).toThrow();
  });
});
