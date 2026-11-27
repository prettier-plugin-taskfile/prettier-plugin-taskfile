const assert = require("node:assert/strict");
const { isBuiltin } = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const allowedDependencies = {
  "index.ts": ["plugin.ts", "formatters", "utils", "types.ts"],
  "plugin.ts": ["api", "types.ts", "constants.ts"],
  api: ["ast", "render", "types.ts"],
  formatters: ["ast", "rules", "types.ts"],
  utils: ["render"],
  ast: ["planning", "rules", "types.ts"],
  planning: ["rules", "types.ts"],
  render: ["rules", "types.ts", "constants.ts"],
  rules: ["constants.ts"],
  "types.ts": [],
  "constants.ts": [],
};

const sourceExtensions = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
];
const isTestSource = (name) =>
  /(^|\/)(__tests__|__fixtures__|tests?|fixtures?)(\/|$)/.test(name) ||
  /\.(spec|test|fixtures?)\.[^/]+$/.test(name);
const isWithin = (directory, file) => {
  const relative = path.relative(directory, file);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
};

// Inspect literal imports (including type imports, reexports and require) and
// source references with TypeScript; computed runtime imports are not analyzed.
function checkDependencyDirection({
  root = path.resolve(__dirname, ".."),
  host = ts.sys,
} = {}) {
  const canonical = (file) =>
    path.resolve(host.realpath ? host.realpath(file) : file);
  root = canonical(root);
  const sourceRoot = canonical(path.join(root, "src"));
  const config = ts.readConfigFile(
    path.join(root, "tsconfig.json"),
    host.readFile,
  );
  assert.equal(config.error, undefined, "Cannot read tsconfig.json");
  const { options, errors } = ts.parseJsonConfigFileContent(
    config.config,
    host,
    root,
  );
  assert.equal(
    errors.length,
    0,
    errors
      .map((error) => ts.flattenDiagnosticMessageText(error.messageText, "\n"))
      .join("\n"),
  );
  const relative = (file) =>
    path.relative(sourceRoot, file).split(path.sep).join("/");
  const owner = (file) => {
    const name = relative(file);
    const nameOwner = name.includes("/") ? name.split("/")[0] : name;
    assert.ok(
      Object.hasOwn(allowedDependencies, nameOwner),
      `Declare the dependency owner for ${name}`,
    );
    return nameOwner;
  };
  const files = host
    .readDirectory(sourceRoot, sourceExtensions)
    .filter((file) => !isTestSource(relative(file)))
    .map(canonical);
  const graph = new Map();

  function inspect(file) {
    if (graph.has(file)) return;
    assert.ok(
      isWithin(sourceRoot, file),
      `Source dependency escapes src: ${file}`,
    );
    const fileOwner = owner(file);
    const text = host.readFile(file);
    assert.notEqual(text, undefined, `Cannot read ${relative(file)}`);
    const dependencies = [];
    graph.set(file, dependencies);
    const preprocessed = ts.preProcessFile(text, true, true);
    const imports = [
      ...preprocessed.importedFiles,
      ...preprocessed.referencedFiles.map((reference) => ({
        fileName: path.resolve(path.dirname(file), reference.fileName),
      })),
    ];
    for (const imported of imports) {
      const specifier = imported.fileName;
      const resolved = ts.resolveModuleName(
        specifier,
        file,
        options,
        host,
      ).resolvedModule;
      if (!resolved && isBuiltin(specifier)) continue;
      assert.ok(resolved, `Cannot resolve ${specifier} in ${relative(file)}`);
      const dependency = canonical(resolved.resolvedFileName);
      // Only actual third-party resolutions may bypass the internal policy.
      // Canonical paths also prevent a node_modules symlink hiding a src edge.
      if (
        !specifier.startsWith(".") &&
        !path.isAbsolute(specifier) &&
        !isWithin(sourceRoot, dependency) &&
        resolved.isExternalLibraryImport &&
        dependency.split(path.sep).includes("node_modules")
      ) {
        continue;
      }
      assert.ok(
        !isTestSource(relative(dependency)),
        `Production dependency on test/fixture: ${relative(file)} -> ${relative(dependency)}`,
      );
      assert.ok(
        isWithin(sourceRoot, dependency),
        `Source dependency escapes src: ${relative(file)} -> ${dependency}`,
      );
      const dependencyOwner = owner(dependency);
      assert.ok(
        fileOwner === dependencyOwner ||
          allowedDependencies[fileOwner].includes(dependencyOwner),
        `Forbidden dependency: ${relative(file)} -> ${relative(dependency)}`,
      );
      dependencies.push(dependency);
      inspect(dependency);
    }
  }
  for (const file of files) inspect(file);

  const visited = new Set();
  const active = new Set();
  function visit(file, stack) {
    assert.ok(
      !active.has(file),
      `Dependency cycle: ${[...stack, file].map(relative).join(" -> ")}`,
    );
    if (visited.has(file)) return;
    active.add(file);
    for (const dependency of graph.get(file)) {
      visit(dependency, [...stack, file]);
    }
    active.delete(file);
    visited.add(file);
  }
  for (const file of graph.keys()) visit(file, []);
  return graph.size;
}

module.exports = { checkDependencyDirection };

if (require.main === module) {
  const count = checkDependencyDirection();
  console.log(`Checked dependency direction and cycles in ${count} modules.`);
}
