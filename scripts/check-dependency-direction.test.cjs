const assert = require("node:assert/strict");
const path = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");
const {
  checkDependencyDirection,
} = require("./check-dependency-direction.cjs");

function checkSources(sources, compilerOptions = {}, realpaths = {}) {
  const root = path.resolve(__dirname, ".dependency-checker-memory");
  const files = new Map(
    Object.entries({
      "tsconfig.json": JSON.stringify({
        compilerOptions: { moduleResolution: "node", ...compilerOptions },
        include: ["src/**/*"],
      }),
      ...sources,
    }).map(([name, text]) => [path.resolve(root, name), text]),
  );
  const directories = new Set();
  for (const file of files.keys()) {
    for (
      let directory = path.dirname(file);
      ;
      directory = path.dirname(directory)
    ) {
      directories.add(directory);
      if (directory === path.dirname(directory)) break;
    }
  }
  const host = {
    ...ts.sys,
    getCurrentDirectory: () => root,
    fileExists: (file) => files.has(path.resolve(file)),
    readFile: (file) => files.get(path.resolve(file)),
    directoryExists: (directory) => directories.has(path.resolve(directory)),
    getDirectories: (directory) =>
      [...directories].filter((entry) => path.dirname(entry) === directory),
    readDirectory: (directory, extensions) =>
      [...files.keys()].filter(
        (file) =>
          file.startsWith(`${directory}${path.sep}`) &&
          (!extensions ||
            extensions.some((extension) => file.endsWith(extension))),
      ),
    realpath: (file) => {
      const name = path.relative(root, file).split(path.sep).join("/");
      return realpaths[name] ? path.resolve(root, realpaths[name]) : file;
    },
  };
  return checkDependencyDirection({ root, host });
}

test("accepts the public, orchestration, compatibility and domain boundaries", () => {
  assert.equal(
    checkSources({
      "src/index.ts":
        'export * from "./plugin"; export * from "./formatters/compat"; export * from "./utils/compat"; export type { Options } from "./types";',
      "src/plugin.ts":
        'import "./api/format"; import "./constants"; import type { Options } from "./types";',
      "src/api/format.ts":
        'import "../ast/format"; import "../render/render"; import "../types";',
      "src/formatters/compat.ts":
        'import "../ast/format"; import "../rules/classify"; import "../types";',
      "src/utils/compat.ts": 'export * from "../render/render";',
      "src/ast/format.ts":
        'import "../planning/plan"; import "../rules/classify"; import "../types"; import "./safety";',
      "src/ast/safety.ts": "",
      "src/planning/plan.ts": 'import "../rules/classify"; import "../types";',
      "src/render/render.ts":
        'import "../rules/classify"; import "../constants"; import "../types";',
      "src/rules/classify.ts": 'import "../constants";',
      "src/types.ts": "export interface Options {}",
      "src/constants.ts": "",
    }),
    12,
  );
});

test("rejects formerly allowed same-layer and arbitrary lower-layer edges", () => {
  for (const [from, to] of [
    ["api", "formatters"],
    ["formatters", "api"],
    ["utils", "formatters"],
    ["api", "rules"],
    ["ast", "render"],
    ["planning", "constants.ts"],
    ["types.ts", "constants.ts"],
  ]) {
    const fromFile = from.endsWith(".ts") ? from : `${from}/source.ts`;
    const toFile = to.endsWith(".ts") ? to : `${to}/target.ts`;
    const specifier = path.posix.relative(path.posix.dirname(fromFile), toFile);
    assert.throws(
      () =>
        checkSources({
          [`src/${fromFile}`]: `export * from "${specifier.startsWith(".") ? specifier : `./${specifier}`}";`,
          [`src/${toFile}`]: "",
        }),
      /Forbidden dependency/,
      `${from} -> ${to}`,
    );
  }
});

test("detects cycles within an owner, including self-imports", () => {
  assert.throws(
    () =>
      checkSources({
        "src/ast/a.ts": 'import "./b";',
        "src/ast/b.ts": 'export * from "./a";',
      }),
    /Dependency cycle: ast\/a.ts -> ast\/b.ts -> ast\/a.ts/,
  );
  assert.throws(
    () => checkSources({ "src/ast/a.ts": 'import "./a";' }),
    /Dependency cycle/,
  );
});

test("rejects unknown owners even in unreferenced or empty modules", () => {
  for (const name of [
    "unowned.ts",
    "unowned/module.ts",
    "toString/module.ts",
  ]) {
    assert.throws(
      () => checkSources({ [`src/${name}`]: "" }),
      /Declare the dependency owner/,
    );
  }
});

test("rejects unresolved relative and nonrelative imports", () => {
  for (const specifier of [
    "./missing",
    "@internal/missing",
    "missing-package",
  ]) {
    assert.throws(
      () => checkSources({ "src/api/a.ts": `import "${specifier}";` }),
      /Cannot resolve/,
    );
  }
});

test("rejects relative and aliased escapes, including src-prefix siblings", () => {
  assert.throws(
    () =>
      checkSources({
        "src/api/a.ts": 'import "../../src-other/outside";',
        "src-other/outside.ts": "",
      }),
    /Source dependency escapes src/,
  );
  assert.throws(
    () =>
      checkSources(
        {
          "src/api/a.ts": 'import "@outside";',
          "outside.ts": "",
        },
        { baseUrl: ".", paths: { "@outside": ["outside.ts"] } },
      ),
    /Source dependency escapes src/,
  );
});

test("excludes test/fixture entry points but rejects production references to them", () => {
  const testSources = [
    "ast/a.spec.ts",
    "ast/a.test.ts",
    "ast/a.test.d.ts",
    "ast/a.fixture.ts",
    "ast/__tests__/a.ts",
    "ast/__fixtures__/a.ts",
    "fixtures/a.ts",
    "tests/a.ts",
  ];
  for (const name of testSources) {
    const sources = {
      "src/api/a.ts": "",
      [`src/${name}`]: 'import "../../index";',
    };
    assert.equal(checkSources(sources), 1);
    const specifier = path.posix.relative("api", name);
    assert.throws(
      () =>
        checkSources({
          ...sources,
          "src/api/a.ts": `import "${specifier}";`,
        }),
      /Production dependency on test\/fixture/,
      name,
    );
  }
  assert.throws(
    () =>
      checkSources({
        "src/api/a.ts": 'import "../../fixtures/input";',
        "fixtures/input.ts": "",
      }),
    /Production dependency on test\/fixture/,
  );
});

test("resolves nonrelative aliases and baseUrl imports before applying the policy", () => {
  const options = {
    baseUrl: ".",
    paths: { "@internal/*": ["src/*"] },
  };
  assert.equal(
    checkSources(
      {
        "src/api/a.ts": 'export * from "@internal/ast/b";',
        "src/ast/b.ts": "",
      },
      options,
    ),
    2,
  );
  for (const specifier of ["@internal/formatters/b", "src/formatters/b"]) {
    assert.throws(
      () =>
        checkSources(
          {
            "src/api/a.ts": `import type { T } from "${specifier}";`,
            "src/formatters/b.ts": "export type T = string;",
          },
          options,
        ),
      /Forbidden dependency/,
    );
  }
  assert.throws(
    () =>
      checkSources(
        {
          "src/api/a.ts": 'import "@internal/ast/b.test";',
          "src/ast/b.test.ts": "",
        },
        options,
      ),
    /Production dependency on test\/fixture/,
  );
});

test("inspects package self-references resolved by TypeScript exports", () => {
  assert.throws(
    () =>
      checkSources(
        {
          "package.json": JSON.stringify({
            name: "checker-self",
            exports: { "./compat": "./src/formatters/b.ts" },
          }),
          "src/api/a.ts": 'import "checker-self/compat";',
          "src/formatters/b.ts": "",
        },
        { module: "node16", moduleResolution: "node16" },
      ),
    /Forbidden dependency/,
  );
});

test("does not treat a node_modules symlink to source as an external package", () => {
  assert.throws(
    () =>
      checkSources(
        {
          "src/api/a.ts": 'import "internal-link";',
          "src/formatters/b.ts": "",
          "node_modules/internal-link/index.d.ts": "",
        },
        {},
        { "node_modules/internal-link/index.d.ts": "src/formatters/b.ts" },
      ),
    /Forbidden dependency/,
  );
});

test("accepts actual external packages and Node builtins", () => {
  assert.equal(
    checkSources({
      "src/api/a.ts": 'import "yaml"; import "node:fs"; import "path";',
      "node_modules/yaml/index.d.ts": "",
    }),
    1,
  );
});

test("does not let builtin names hide internal alias dependencies", () => {
  assert.throws(
    () =>
      checkSources(
        {
          "src/api/a.ts": 'import "path";',
          "src/formatters/b.ts": "",
        },
        { baseUrl: ".", paths: { path: ["src/formatters/b.ts"] } },
      ),
    /Forbidden dependency/,
  );
});

test("inspects import types, CommonJS require and literal dynamic imports", () => {
  for (const source of [
    'type T = import("../formatters/b").T;',
    'import b = require("../formatters/b");',
    'const b = require("../formatters/b");',
    'import("../formatters/b");',
    'export type { T } from "../formatters/b";',
  ]) {
    assert.throws(
      () =>
        checkSources({
          "src/api/a.ts": source,
          "src/formatters/b.ts": "export type T = string;",
        }),
      /Forbidden dependency/,
      source,
    );
  }
});

test("rejects production triple-slash source references to fixtures", () => {
  assert.throws(
    () =>
      checkSources({
        "src/api/a.ts": '/// <reference path="../../fixtures/input.ts" />',
        "fixtures/input.ts": "",
      }),
    /Production dependency on test\/fixture/,
  );
});

test("preserves TypeScript extension substitution for JavaScript specifiers", () => {
  assert.equal(
    checkSources({
      "src/api/a.ts": 'import "../ast/b.js";',
      "src/ast/b.ts": "",
    }),
    2,
  );
});
