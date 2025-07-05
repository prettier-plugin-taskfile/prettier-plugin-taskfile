# prettier-plugin-taskfile

A [Prettier](https://prettier.io/) plugin for formatting [Taskfiles](https://taskfile.dev/) according to the [Taskfile Style Guide](https://taskfile.dev/styleguide/).

## Features

This plugin implements all the formatting rules from the [Taskfile Style Guide](https://taskfile.dev/styleguide/):

- **Ordering of main sections**:
  1. `version`
  2. `includes`
  3. `vars`
  4. `env`
  5. `tasks`
- **Consistent indentation**: Uses two spaces for indentation
- **Proper spacing**: Adds empty lines between main sections and between tasks
- **Variable naming**: Converts variable names to uppercase
- **Task naming**: Converts task names to kebab-case (e.g., `do-something` instead of `do_something`)
- **Template formatting**: Removes whitespace in template variables (e.g., `{{.VAR}}` instead of `{{ .VAR }}`)
- **Namespace preservation**: Preserves task namespace separators with colons (e.g., `docker:build`)
- **YAML formatting**: Preserves YAML formatting while applying all style guide rules
- **Integration**: Works with Prettier's standard YAML formatting

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
npx prettier --write Taskfile.yml

# Format all Taskfiles in your project
npx prettier --write "**/*Taskfile*.{yml,yaml}"
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
includes:
  - ./common.yml
vars:
  PROJECT: myproject
  lowercase_var: should be uppercase
  another_var: value
version: "3"
```

**After (formatted):**

```yaml
version: "3"

includes:
  - ./common.yml

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

## License

MIT
