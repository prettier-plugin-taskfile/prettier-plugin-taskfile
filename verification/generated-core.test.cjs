const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { test } = require("node:test");

const source = readFileSync(
  join(__dirname, "generated", "rename-model.js"),
  "utf8",
);
// Dafny emits a script, not CommonJS exports. This adapter is test-only.
const { RenameModel, _dafny } = new Function(
  "require",
  "process",
  `${source}\nreturn { RenameModel, _dafny };`,
)(require, { argv: [], stdout: { write() {} } });
const core = RenameModel.__default;
const sequence = (names) =>
  _dafny.Seq.of(...names.map((name) => _dafny.Seq.UnicodeFromString(name)));
const strings = (names) =>
  Array.from(names, (name) => name.toVerbatimString(false));
const apply = (sourceNames, targetNames, refs, blocked = false) => {
  const [accepted, names, rewritten] = core.Apply(
    sequence(sourceNames),
    sequence(targetNames),
    sequence(refs),
    blocked,
  );
  return { accepted, names: strings(names), refs: strings(rewritten) };
};

test("generated core preserves referents across a simultaneous swap", () => {
  assert.deepEqual(apply(["a", "b"], ["b", "a"], ["a", "b", "a"]), {
    accepted: true,
    names: ["b", "a"],
    refs: ["b", "a", "b"],
  });
});

test("collisions with unchanged names preserve every name and reference", () => {
  assert.deepEqual(
    apply(["buildApp", "build-app"], ["build-app", "build-app"], ["buildApp"]),
    {
      accepted: false,
      names: ["buildApp", "build-app"],
      refs: ["buildApp"],
    },
  );
});

test("duplicate sources and incomplete plans reject atomically", () => {
  assert.deepEqual(apply(["a", "a"], ["b", "c"], ["a"]), {
    accepted: false,
    names: ["a", "a"],
    refs: ["a"],
  });
  assert.deepEqual(apply(["a"], [], ["a"]), {
    accepted: false,
    names: ["a"],
    refs: ["a"],
  });
});

test("analyzer hazards and unknown references preserve the entire input", () => {
  assert.deepEqual(apply(["a"], ["b"], ["a"], true), {
    accepted: false,
    names: ["a"],
    refs: ["a"],
  });
  assert.deepEqual(apply(["a"], ["b"], ["unknown"]), {
    accepted: false,
    names: ["a"],
    refs: ["unknown"],
  });
});

test("empty namespace and repeated references are valid", () => {
  assert.deepEqual(apply([], [], []), {
    accepted: true,
    names: [],
    refs: [],
  });
  assert.deepEqual(apply(["X"], ["x"], ["X", "X"]), {
    accepted: true,
    names: ["x"],
    refs: ["x", "x"],
  });
});
