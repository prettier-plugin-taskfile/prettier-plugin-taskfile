export function isTaskLikeSection(key: string): boolean {
  return key === "tasks" || key.startsWith("tasks_");
}
