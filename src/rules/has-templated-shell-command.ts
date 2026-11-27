const commandPrefixes = new Set([
  "if",
  "then",
  "else",
  "elif",
  "while",
  "until",
  "do",
  "!",
]);
const commandWrappers = new Set([
  "env",
  "command",
  "exec",
  "eval",
  "sudo",
  "sh",
  "bash",
  "dash",
  "zsh",
  "xargs",
]);

export function hasTemplatedShellCommand(command: string): boolean {
  if (!command.includes("{{")) return false;
  // Redirections can precede the executable or attach to surrounding words.
  if (/[<>]/.test(command)) return true;
  const marker = "__TASKFILE_TEMPLATE_COMMAND__";
  const substituted = command
    .replace(/\{\{[\s\S]*?\}\}/g, marker)
    .replace(/\\\r?\n/g, "")
    .replace(/['"\\]/g, "");

  // Conservatively inspect command positions, not full shell syntax.
  for (const segment of substituted.split(/[;&|\n(){}]/)) {
    const words = segment.trim().split(/\s+/);
    while (
      commandPrefixes.has(words[0]) ||
      /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0] ?? "")
    )
      words.shift();
    if (!words[0]) continue;
    if (words[0].includes(marker)) return true;
    const executable = words[0].split("/").pop()!;
    if (
      commandWrappers.has(executable) &&
      words.some((word) => word.includes(marker))
    )
      return true;
  }
  return false;
}
