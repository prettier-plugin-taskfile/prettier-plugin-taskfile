const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { join } = require("node:path");
const { test } = require("node:test");

const requirePackage = createRequire(join(__dirname, "../package.json"));
const packageName = "prettier-plugin-taskfile";
const publicFunctions = [
  "sortTaskfileKeys",
  "uppercaseVariableNames",
  "kebabCaseTaskNames",
  "removeTemplateWhitespace",
  "processCommands",
  "formatTaskfile",
  "formatTaskfileText",
  "formatTaskfileTextWithDiagnostics",
  "checkTaskfileFormatting",
  "getYamlOptions",
  "addEmptyLines",
];

function checkPlugin(plugin) {
  assert.equal(typeof plugin.parsers["taskfile-yaml"].parse, "function");
  assert.equal(typeof plugin.printers["taskfile-yaml"].print, "function");
  for (const name of publicFunctions)
    assert.equal(typeof plugin[name], "function", name);
  assert.equal(
    plugin.formatTaskfileText(
      "version: '3'\ntasks: {build_app: {cmds: [echo]}}",
    ),
    plugin.formatTaskfileText(
      "version: '3'\ntasks: {build-app: {cmds: [echo]}}",
    ),
  );
}

test("CommonJS resolves this package's compiled default and named exports", () => {
  assert.equal(
    requirePackage.resolve(packageName),
    join(__dirname, "../dist/index.js"),
  );
  const plugin = requirePackage(packageName);
  assert.equal(plugin.default, plugin);
  checkPlugin(plugin);
});

test("the ESM loader exposes the compiled package default and named exports", async () => {
  const namespace = await import(packageName);
  const plugin = requirePackage(packageName);
  assert.equal(namespace.default, plugin);
  for (const name of publicFunctions)
    assert.equal(namespace[name], plugin[name], name);
  checkPlugin(namespace.default);
});
