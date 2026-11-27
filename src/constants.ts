/**
 * Constants used throughout the Taskfile prettier plugin
 */

/**
 * Priority order for Taskfile top-level keys according to the style guide
 *
 * https://taskfile.dev/docs/styleguide#use-the-suggested-ordering-of-the-main-sections
 */
export const TASKFILE_KEY_PRIORITY = [
  "version",
  "includes",
  // Optional configurations precede vars, env and dotenv.
  "output",
  "silent",
  "method",
  "run",
  "interval",
  "set",
  "shopt",
  "use_gitignore",
  // end of "optional configurations"
  "vars",
  "env",
  "dotenv",
  "tasks",
] as const;

/**
 * Default YAML stringify options for Taskfile formatting
 *
 * @see https://eemeli.org/yaml/#tostring-options
 */
export const DEFAULT_YAML_OPTIONS = {
  indent: 2, // Use two spaces for indentation
  lineWidth: 0, // Disable line wrapping
  prettyErrors: true,
  blockQuote: true, // Prefer block quotes for multi-line strings
  flowLevel: -1, // Use block style instead of flow style
  defaultType: "BLOCK_LITERAL", // Prefer literal blocks for multi-line strings
} as const;

/**
 * Supported filenames for Taskfiles
 */
export const TASKFILE_FILENAMES = [
  "Taskfile.yml",
  "Taskfile.yaml",
  "taskfile.yml",
  "taskfile.yaml",
] as const;

/**
 * Regular expressions used for formatting
 */
export const REGEX_PATTERNS = {
  // Template variable pattern: {{ .VAR }} -> {{.VAR}}
  TEMPLATE_WHITESPACE: /^\{\{\s*(\.[A-Za-z_][A-Za-z0-9_]*)\s*\}\}$/,

  // Main section pattern
  MAIN_SECTION: /^[a-z_][a-z0-9_:-]*:$/i,

  // Task definition pattern (2-space indented keys ending with colon)
  TASK_DEFINITION: /^  [a-zA-Z0-9_-]+:(\s|$)/,

  // Multiple consecutive empty lines
  MULTIPLE_EMPTY_LINES: /\n\n\n+/g,

  // Underscore followed by lowercase letter (for kebab-case conversion)
  UNDERSCORE_LOWERCASE: /_([a-z])/g,
} as const;
