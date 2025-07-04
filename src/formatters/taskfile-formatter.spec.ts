import { formatTaskfile } from "./taskfile-formatter";

describe("formatTaskfile", () => {
  test("should handle null or undefined input", () => {
    expect(formatTaskfile(null as any)).toEqual({});
    expect(formatTaskfile(undefined as any)).toEqual({});
  });

  test("should format a complete Taskfile", () => {
    const input = {
      tasks: {
        build_app: {
          cmds: ['echo "Building {{ .PROJECT }}"'],
        },
        test_suite: {
          cmds: ['echo "Testing {{ .NAME }}"'],
        },
      },
      env: { NODE_ENV: "development" },
      includes: { common: "./common.yml" },
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
      'echo "Building {{.PROJECT}}"',
    );
    expect(result.tasks?.["test-suite"]?.cmds?.[0]).toBe(
      'echo "Testing {{.NAME}}"',
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

    // Check that tasks_with_templates is processed
    expect(result.tasks_with_templates?.["template-task"]).toBeDefined();
    expect(result.tasks_with_templates?.["another-template"]).toBeDefined();

    // Check template formatting
    expect(result.tasks_with_templates?.["template-task"]?.cmds?.[0]).toBe(
      'echo "Hello {{.NAME}}"',
    );
    expect(result.tasks_with_templates?.["another-template"]?.cmds?.[0]).toBe(
      'echo "Value: {{.VALUE}}"',
    );
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

    expect(result.tasks_dev?.["dev-task"]).toBeDefined();
    expect(result.tasks_prod?.["prod-task"]).toBeDefined();
    expect(result.tasks_dev?.["dev-task"]?.cmds?.[0]).toBe(
      'echo "dev {{.ENV}}"',
    );
    expect(result.tasks_prod?.["prod-task"]?.cmds?.[0]).toBe(
      'echo "prod {{.ENV}}"',
    );
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
      },
    };

    const result = formatTaskfile(input);
    const task = result.tasks?.["complex-task"];

    expect(task?.desc).toBe("A complex task");
    expect(task?.deps).toEqual(["other-task"]);
    expect(task?.sources).toEqual(["src/**/*.ts"]);
    expect(task?.generates).toEqual(["dist/app.js"]);
    expect(task?.vars).toEqual({ task_var: "value" });
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

    // Check that only proper object type tasks_ sections are processed
    expect(result.tasks_custom?.["custom-task"]).toBeDefined();
    expect(result.tasks_custom?.["custom-task"]?.cmds?.[0]).toBe(
      'echo "custom {{.VAR}}"',
    );

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

    // Check that both tasks are processed correctly
    expect(result.tasks_special?.["task-with-cmds"]).toBeDefined();
    expect(result.tasks_special?.["task-with-cmds"]?.cmds?.[0]).toBe(
      'echo "has cmds {{.VAR}}"',
    );

    expect(result.tasks_special?.["task-without-cmds"]).toBeDefined();
    expect(result.tasks_special?.["task-without-cmds"]?.desc).toBe("No commands");
    expect(result.tasks_special?.["task-without-cmds"]?.deps).toEqual(["other-task"]);
    expect(result.tasks_special?.["task-without-cmds"]?.cmds).toBeUndefined();
  });
});
