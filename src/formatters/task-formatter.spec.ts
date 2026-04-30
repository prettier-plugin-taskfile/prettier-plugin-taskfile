import { kebabCaseTaskNames } from "./task-formatter";

describe("kebabCaseTaskNames", () => {
  test("should convert snake_case to kebab-case", () => {
    const input = {
      task_name: { cmds: ["echo test"] },
      another_task_name: { cmds: ["echo test"] },
    };

    const result = kebabCaseTaskNames(input);

    expect(Object.keys(result)).toContain("task-name");
    expect(Object.keys(result)).toContain("another-task-name");
    expect(result["task-name"]).toEqual({ cmds: ["echo test"] });
    expect(result["another-task-name"]).toEqual({ cmds: ["echo test"] });
  });

  test("should preserve namespace separators", () => {
    const input = {
      "namespace:task_name": { cmds: ["echo test"] },
      "ns:another_task": { cmds: ["echo test"] },
    };

    const result = kebabCaseTaskNames(input);

    expect(Object.keys(result)).toContain("namespace:task-name");
    expect(Object.keys(result)).toContain("ns:another-task");
  });

  test("should handle multiple namespace levels", () => {
    const input = {
      "ns1:ns2:task_name": { cmds: ["echo test"] },
    };

    const result = kebabCaseTaskNames(input);

    expect(Object.keys(result)).toContain("ns1:ns2:task-name");
  });

  test("should handle already kebab-case names", () => {
    const input = {
      "task-name": { cmds: ["echo test"] },
    };

    const result = kebabCaseTaskNames(input);

    expect(Object.keys(result)).toContain("task-name");
  });

  test("should handle empty tasks object", () => {
    const input = {};
    const result = kebabCaseTaskNames(input);
    expect(Object.keys(result).length).toBe(0);
  });

  test("should handle null/undefined input", () => {
    expect(kebabCaseTaskNames(null as any)).toBe(null);
    expect(kebabCaseTaskNames(undefined as any)).toBe(undefined);
  });

  test("should preserve task properties", () => {
    const input = {
      build_app: {
        desc: "Build the application",
        deps: ["clean"],
        sources: ["src/**/*.ts"],
        generates: ["dist/app.js"],
        cmds: ["npm run build"],
        env: { NODE_ENV: "production" },
        vars: { BUILD_TYPE: "release" },
        silent: true,
      },
    };

    const result = kebabCaseTaskNames(input);
    const task = result["build-app"];

    expect(task.desc).toBe("Build the application");
    expect(task.deps).toEqual(["clean"]);
    expect(task.sources).toEqual(["src/**/*.ts"]);
    expect(task.generates).toEqual(["dist/app.js"]);
    expect(task.cmds).toEqual(["npm run build"]);
    expect(task.env).toEqual({ NODE_ENV: "production" });
    expect(task.vars).toEqual({ BUILD_TYPE: "release" });
    expect(task.silent).toBe(true);
  });

  test("should handle mixed case with underscores", () => {
    const input = {
      Build_app: { cmds: ["echo build"] }, // only 'a' after underscore is lowercase
      TEST_suite: { cmds: ["echo test"] }, // only 's' after underscore is lowercase
      deploy_production: { cmds: ["echo deploy"] }, // 'p' after underscore is lowercase
    };

    const result = kebabCaseTaskNames(input);

    expect(result["build-app"]).toBeDefined();
    expect(result["test-suite"]).toBeDefined();
    expect(result["deploy-production"]).toBeDefined();
  });

  test("should normalize task names consistently", () => {
    const input = {
      task_A: { cmds: ["echo test"] },
      task_a: { cmds: ["echo test"] },
      TASK_B: { cmds: ["echo test"] },
      TASK_b: { cmds: ["echo test"] },
    };

    const result = kebabCaseTaskNames(input);

    expect(result["task-a"]).toBeDefined();
    expect(result["task-b"]).toBeDefined();
  });

  test("should handle numbers in task names", () => {
    const input = {
      task_1: { cmds: ["echo test"] },
      build_v2: { cmds: ["echo test"] },
      test_3_suite: { cmds: ["echo test"] }, // 's' is lowercase, so converts
    };

    const result = kebabCaseTaskNames(input);

    expect(result["task-1"]).toBeDefined();
    expect(result["build-v2"]).toBeDefined();
    expect(result["test-3-suite"]).toBeDefined();
  });
});
