const assert = require("node:assert/strict");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "src");
const config = ts.readConfigFile(
  path.join(root, "tsconfig.json"),
  ts.sys.readFile,
);
assert.equal(config.error, undefined, "Cannot read tsconfig.json");
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const layers = {
  "index.ts": 7,
  "plugin.ts": 6,
  api: 5,
  formatters: 5,
  utils: 5,
  ast: 4,
  planning: 3,
  render: 2,
  rules: 1,
  "types.ts": 0,
  "constants.ts": 0,
};
const files = ts.sys
  .readDirectory(sourceRoot, [".ts"], ["**/*.spec.ts"])
  .map((file) => path.resolve(file));
const graph = new Map();
const relative = (file) =>
  path.relative(sourceRoot, file).split(path.sep).join("/");
const layer = (file) => {
  const name = relative(file);
  const rank = layers[name] ?? layers[name.split("/")[0]];
  assert.notEqual(rank, undefined, `Declare the dependency layer for ${name}`);
  return rank;
};

for (const file of files) {
  const dependencies = [];
  const imports = ts.preProcessFile(
    ts.sys.readFile(file),
    true,
    true,
  ).importedFiles;
  for (const imported of imports) {
    if (!imported.fileName.startsWith(".")) continue;
    const resolved = ts.resolveModuleName(
      imported.fileName,
      file,
      options,
      ts.sys,
    ).resolvedModule;
    assert.ok(
      resolved,
      `Cannot resolve ${imported.fileName} in ${relative(file)}`,
    );
    const dependency = path.resolve(resolved.resolvedFileName);
    assert.ok(
      dependency.startsWith(`${sourceRoot}${path.sep}`),
      `Source dependency escapes src: ${relative(file)} -> ${dependency}`,
    );
    assert.ok(
      layer(file) >= layer(dependency),
      `Reverse dependency: ${relative(file)} -> ${relative(dependency)}`,
    );
    dependencies.push(dependency);
  }
  graph.set(file, dependencies);
}

const visited = new Set();
function visit(file, stack) {
  assert.ok(
    !stack.includes(file),
    `Dependency cycle: ${[...stack, file].map(relative).join(" -> ")}`,
  );
  if (visited.has(file)) return;
  for (const dependency of graph.get(file) ?? []) {
    visit(dependency, [...stack, file]);
  }
  visited.add(file);
}
for (const file of files) visit(file, []);
console.log(
  `Checked dependency direction and cycles in ${files.length} modules.`,
);
