export type RenderEdit =
  | { start: number; end: number; text?: never }
  | { start: number; end?: never; text: string };

export function applyRenderEdits(
  text: string,
  edits: readonly RenderEdit[],
): string {
  const deletions: { start: number; end: number }[] = [];
  const insertions = new Map<number, string>();
  for (const edit of [...edits].sort((a, b) => a.start - b.start)) {
    if (edit.text !== undefined) {
      insertions.set(
        edit.start,
        (insertions.get(edit.start) ?? "") + edit.text,
      );
    } else {
      const previous = deletions[deletions.length - 1];
      if (previous && edit.start <= previous.end) {
        previous.end = Math.max(previous.end, edit.end);
      } else {
        deletions.push({ start: edit.start, end: edit.end });
      }
    }
  }

  // Every boundary is in the original input, including insertions inside deletions.
  const boundaries = new Set<number>([0, text.length, ...insertions.keys()]);
  for (const deletion of deletions) {
    boundaries.add(deletion.start);
    boundaries.add(deletion.end);
  }
  const offsets = [...boundaries].sort((a, b) => a - b);
  const parts: string[] = [];
  let deletion = 0;
  for (let index = 0; index < offsets.length; index++) {
    const start = offsets[index];
    parts.push(insertions.get(start) ?? "");
    while (deletion < deletions.length && deletions[deletion].end <= start)
      deletion++;
    if (
      index + 1 < offsets.length &&
      (deletion === deletions.length || start < deletions[deletion].start)
    ) {
      parts.push(text.slice(start, offsets[index + 1]));
    }
  }
  return parts.join("");
}
