import { RenamePlan } from "./rename-types";

export function applyRenamePlan(plan: RenamePlan): void {
  if (plan.edits.some((edit) => edit.node.value !== edit.from))
    throw new Error(
      "Taskfile changed after rename analysis; refusing stale rename plan.",
    );
  for (const edit of plan.edits) edit.node.value = edit.to;
}
