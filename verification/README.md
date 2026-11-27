# Bounded rename verification

This is a **verified design model**, not a proof of the TypeScript formatter.
The production formatter does **not** import the generated JavaScript. Its
analysis, YAML edits, reference discovery, and normalization implementations
remain outside this proof.

## Run

On Linux x64, from the repository root:

```sh
bash verification/setup.sh
bash verification/check.sh
```

Setup downloads the official self-contained
[Dafny 4.11.0 Linux x64 release](https://github.com/dafny-lang/dafny/releases/tag/v4.11.0),
checks the asset's published SHA-256, and installs its JavaScript backend's
`bignumber.js@9.3.1` runtime dependency in `verification/.tools/js`.
It needs `bash`, `curl`, `unzip`, `sha256sum`, Node.js, and npm. The release
includes the .NET runtime and Z3; separate .NET, Z3, and Lean installations are
not needed. No system installation, sudo, or root-package dependency change is
performed. This setup was exercised with Node.js 24.22.3 on Linux x86_64.

`.tools/` and `generated/` are ignored local artifacts. Setup is repeatable and
does not reinstall dependencies already at the pinned versions. Proof checking
does not need network access once setup is complete.

`check.sh` uses Dafny's JavaScript **build with verification enabled**, followed
by Node's tests against that generated code. It fails if verification,
compilation, or any runtime test fails. It does not use `--no-verify`, axioms,
`assume`, bodyless declarations, or disabled verification.

For proof checking alone:

```sh
verification/.tools/dafny/dafny verify verification/RenameModel.dfy
```

For another platform, install the appropriate official Dafny release outside
this script and set `DAFNY` to its executable for `check.sh`. The JavaScript
tests still need `bignumber.js` on `NODE_PATH`. The pinned setup script only
supports Linux x64; availability of platform/native runtime prerequisites is
not proved by this model.

## Model and checked claims

`RenameModel.dfy` describes one finite namespace as a sequence of source names.
Each definition's **sequence index is its identity**. The target sequence is a
complete proposed replacement at those same indices, including definitions
whose names do not change. This makes collisions with an unchanged name
visible, and permits safe simultaneous swaps.

| Contract                                     | Verified property                                                                                                                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Safe` / `Commit`                            | A complete equal-length plan with unique source and target names is accepted; any failed condition preserves the original names.                                                                                           |
| `Find` / `UniqueResolution`                  | A known name in a unique namespace resolves to precisely its definition index.                                                                                                                                             |
| `Rewrite` / `ReferenceResolutionPreserved`   | Each rewritten known reference resolves to the same definition index in the target namespace, including repeated references and swaps.                                                                                     |
| `Apply`                                      | Acceptance requires a safe plan, all finite references known, and an unblocked analyzer flag. Rejection preserves **all** names and references. Acceptance preserves uniqueness, reference count, and each referent index. |
| `CanonicalTable` / `NormalizationIdempotent` | A finite normalization table that explicitly maps every target to itself is idempotent on its domain.                                                                                                                      |

`blocked` models the conservative analyzer's decision about unsupported
constructs, shell environments, reserved names, and task-name observations.
Declaration-time binding availability and template-derived shell executables
are also analyzer inputs, not properties established by the finite model.
The proof checks what the application does with that flag, **not**
whether TypeScript computes it correctly.

Names are opaque Dafny strings compared for exact equality. No regex, casing,
Unicode normalization, collation, colon parsing, or template parsing behavior
is modeled. In particular, `NormalizationIdempotent` does **not** establish
idempotence of `normalizeTaskName` or `normalizeVariableName`: callers must
establish the finite table's fixed-point condition first. The table condition
is a real checked precondition, not an axiom.

## Assumptions and remaining integration gap

- Analysis must enumerate every definition in the relevant namespace,
  including unchanged definitions and scope-qualified identities where needed.
- The finite reference list must contain all reference sites the caller claims
  to preserve. Unknown references cause model rejection; undiscovered sites
  cannot be protected by this proof.
- Definition identity is stable under renaming; associated values are
  abstracted away. Resolution preservation means preservation of sequence
  indices, not a proved Task runtime semantics.
- The source/target/ref sequences and `blocked` flag are immutable model inputs.
  Constructing them from YAML, validating an actual edit plan against mutated
  AST nodes, and applying edits atomically are separate TypeScript obligations.
- Alias, merge, include, interpolation, dynamic references, and multiple
  variable scopes are not modeled. They require correct analysis or
  conservative rejection before this finite contract applies.

The proof's trusted computing base includes Dafny, Boogie/Z3, and their
specification semantics. Generated-code execution additionally trusts Dafny's
JavaScript compiler, Node.js, and `bignumber.js`. Node tests check concrete
compiled-core behavior, not compiler correctness or a refinement relation to
the formatter. The test-only adapter exposes Dafny's generated script objects;
it is not a production integration API.

To use this as more than a design model, production must either call this
generated core through a validated representation adapter, or establish a
separate refinement proof between TypeScript and these contracts. Neither
adapter correctness nor such a refinement proof is provided here.

## Recorded validation

Using the pinned local bundle and generated JavaScript:

- Dafny: **16 verified, 0 errors**.
- `node --test verification/generated-core.test.cjs`: **5 passed, 0 failed**.

The runtime regressions cover simultaneous swaps, collision with an unchanged
name, duplicate sources, incomplete plans, analyzer rejection, unknown
references, empty namespaces, and repeated references. They execute the
generated `Apply` core and use real Node assertions (Dafny's proof-only
assertions are erased during compilation).
