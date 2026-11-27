import { applyRenderEdits } from "./apply-render-edits";

describe("original-coordinate render edits", () => {
  test("unions overlapping and duplicate removals without swallowing adjacent source", () => {
    expect(
      applyRenderEdits("0123456789", [
        { start: 4, end: 7 },
        { start: 2, end: 5 },
        { start: 2, end: 5 },
        { start: 7, end: 8 },
        { start: 9, text: "\n" },
      ]),
    ).toBe("018\n9");
  });

  test("orders same-position insertions and retains insertions within collapsed spans", () => {
    expect(
      applyRenderEdits("012345", [
        { start: 1, end: 4 },
        { start: 1, text: "before" },
        { start: 2, text: "inside" },
        { start: 1, text: "-" },
        { start: 4, text: "after" },
        { start: 6, text: "end" },
      ]),
    ).toBe("0before-insideafter45end");
  });
});
