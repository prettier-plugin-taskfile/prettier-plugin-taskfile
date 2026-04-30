function normalizeTaskNamePart(part: string): string {
  return part
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

export function normalizeTaskName(taskName: string): string {
  return taskName.split(":").map(normalizeTaskNamePart).join(":");
}
