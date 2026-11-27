# prettier-plugin-taskfile

A [Prettier](https://prettier.io/) plugin for formatting [Taskfiles](https://taskfile.dev/) according to the [official Taskfile Style Guide](https://taskfile.dev/docs/styleguide).

## Features

This plugin applies the automatable rules from the [Taskfile Style Guide](https://taskfile.dev/docs/styleguide):

- **Ordering of main sections**:
  1. `version`
  2. `includes`
  3. Optional configuration (`output`, `silent`, `method`, `run`, etc.)
  4. `vars`
  5. `env`, followed or replaced by `dotenv`
  6. `tasks`
- **Consistent indentation**: Uses two spaces for indentation
- **Proper spacing**: Adds empty lines between main sections and between tasks
- **Variable naming**: Converts variable names and recognized references to uppercase when safe
- **Task naming**: Converts task names and recognized calls to kebab-case when safe (e.g., `do-something` instead of `do_something`)
- **Template formatting**: Removes whitespace in simple template variables (e.g., `{{.VAR}}` instead of `{{ .VAR }}`), preserving complex templates and trim markers
- **Namespace preservation**: Preserves task namespace separators with colons (e.g., `docker:build`)
- **YAML preservation**: Retains comments and scalar values while formatting
- **Integration**: Provides a dedicated Prettier parser and printer for Taskfiles

The external-script recommendation is not automated: formatting never creates
scripts or extracts multiline commands.

## Installation

```bash
npm install --save-dev prettier prettier-plugin-taskfile
# or
yarn add --dev prettier prettier-plugin-taskfile
```

## Usage

### Command Line

```bash
# Format a single Taskfile
npx prettier --write Taskfile.yml --plugin=prettier-plugin-taskfile

# Format all Taskfiles in your project
npx prettier --write "**/*Taskfile*.{yml,yaml}" --plugin=prettier-plugin-taskfile
```

### Configuration

Add the plugin to your Prettier configuration (`.prettierrc`, `.prettierrc.json`, etc.):

```json
{
  "plugins": ["prettier-plugin-taskfile"]
}
```

### Editor Integration

This plugin works with all editor integrations that use Prettier. Once installed, it will automatically be used when formatting Taskfiles.

### Safety options

| Option                             | Default      | Behavior                                                                                                                                 |
| ---------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `taskfileNormalizeNames`           | `true`       | Plan and apply names and recognized references together. Set `false` for layout/template-spacing changes without renaming.               |
| `taskfileAllowRenamesWithIncludes` | `false`      | Allow local renaming despite includes, without checking or rewriting external Taskfiles. Other safety checks still apply.                |
| `taskfileUnsafeRenames`            | `"preserve"` | Preserve all names when safe renaming cannot be established. Set `"error"` to fail instead. Ignored when name normalization is disabled. |

For example, opt out of renaming to keep public task names and externally supplied
variable names stable:

```json
{
  "plugins": ["prettier-plugin-taskfile"],
  "taskfileNormalizeNames": false
}
```

To normalize local names even when this file includes other Taskfiles:

```json
{
  "plugins": ["prettier-plugin-taskfile"],
  "taskfileAllowRenamesWithIncludes": true
}
```

This opt-in leaves include namespace keys, namespace aliases, included files,
and recognized external task references unchanged. Static references such as
`tools:build_image` and `:tools:build_image` are recognized by the declared
namespace or namespace alias; the external task's existence is not checked.
Calls using just the namespace or alias (an included default task) are also
left unchanged.
Non-map or unsupported include declarations, unresolved references, and other
existing safety guards still preserve all names or fail in `"error"` mode.
Unqualified references to flattened includes are not resolved: they must name
a known local task to pass the existing reference check.

Renaming with this option produces an `unchecked-includes` diagnostic because
external callers and variable bindings might be affected. Included files are
neither loaded nor updated, so whole-project equivalence is **not guaranteed**.
The diagnostic is not an error, even in `"error"` mode, and Prettier does not
print it automatically. If names are already normalized, or
`taskfileNormalizeNames` is `false`, no such diagnostic is emitted.

Renaming is planned before any edits. The planner checks same-scope collisions,
variable scope capture, and recognized task references. Root and task-local
`vars`, simple `{{.variable}}` references, and static `deps`/command task calls
are supported. Namespace colons are preserved.

When renaming would be needed, nonempty `includes` (unless explicitly allowed),
YAML anchors/aliases/merges,
task aliases, call-site variable overrides, complex/dynamic templates, shell
expressions (`sh`), shell Task invocations (including quoted/escaped forms),
dynamic shell expansions, or other unsupported forms conservatively preserve **all**
names in that document. Unknown fields, including custom `tasks_*` sections,
are not treated as task schema. Invalid YAML is rejected. YAML reference
dependencies can also require preserving section order instead of enforcing
the suggested order.

Normalization into documented Task special-variable names is rejected.
References to `{{.TASK}}` or `{{.ALIAS}}` also preserve the entire rename group
when any task name would change, since those values expose task names.
Template-derived shell executable names are also preserved, including after
command separators and common shell wrappers. Variable initializer references
to their own or later definitions are preserved when those names would change,
rather than treating an earlier environment binding as the new variable.

Use the diagnostic API to inspect why names were preserved:

```js
const {
  formatTaskfileTextWithDiagnostics,
} = require("prettier-plugin-taskfile");

const { text, diagnostics } = formatTaskfileTextWithDiagnostics(source, {
  taskfileUnsafeRenames: "preserve",
});
for (const diagnostic of diagnostics) {
  console.warn(diagnostic.message);
}
```

The string-returning `formatTaskfileText`, `checkTaskfileFormatting`, and
object-returning `formatTaskfile` accept the same options. Prettier's default
preserve mode does not print warnings; use the diagnostic API or `"error"` when
you need unsafe normalization to be visible.

This is not a whole-project refactoring tool. External CLI invocations, caller
supplied variables, and external files are not rewritten or proven equivalent.
Disable renaming when those names are part of a public interface.

## Example

**Before (unformatted):**

```yaml
tasks:
  build:
    cmds:
      - echo "Building..."
  test_suite:
    cmds:
      - echo "Testing..."
  docker_stuff:
    cmds:
      - echo "Docker stuff"
env:
  NODE_ENV: development
includes: {}
vars:
  PROJECT: myproject
  lowercase_var: should be uppercase
  another_var: value
version: "3"
```

**After (formatted):**

```yaml
version: "3"

includes: {}

vars:
  PROJECT: myproject
  LOWERCASE_VAR: should be uppercase
  ANOTHER_VAR: value

env:
  NODE_ENV: development

tasks:
  build:
    cmds:
      - echo "Building..."

  test-suite:
    cmds:
      - echo "Testing..."

  docker-stuff:
    cmds:
      - echo "Docker stuff"
```

Notice the following changes:

- Top-level keys are sorted according to the style guide
- Empty lines are added between main sections and between tasks
- Variable names are converted to uppercase (`lowercase_var` → `LOWERCASE_VAR`)
- Task names are converted to kebab-case (`test_suite` → `test-suite`)
- Two-space indentation is used consistently

## Correctness checks

The implementation has one-way dependencies:
API/object facades → AST transformations → rename planning → normalization rules.
Rename analysis is read-only; plans are frozen and checked for stale scalar
values before applying any edits.

```sh
npm ci
npm run build
npm run check:dependencies
npm test -- --runInBand
npm run format:check
npm run test:task
npm run verify:setup
npm run verify:rename
```

The dependency check rejects reverse-layer imports and module cycles.
Jest covers specification examples and safety regressions. Seeded `fast-check`
properties exercise definition/reference consistency, collision preservation,
scalar/unknown-field preservation, and repeated-format stability. `test:task`
requires the Task CLI and compares actual execution of controlled local
Taskfiles before and after formatting.

The Dafny check proves a **bounded rename design model**, then tests its generated
JavaScript. It does not prove the TypeScript analyzer, YAML library, or complete
Task runtime semantics; production does not currently use that generated core.
See [the verified contracts and trust boundary](verification/README.md).

The verification setup installs a checksum-pinned self-contained Dafny bundle
locally on Linux x64, including its .NET runtime and Z3. No separate Lean, .NET,
or Z3 installation is required. For other platforms see the verification guide.

## License

MIT
