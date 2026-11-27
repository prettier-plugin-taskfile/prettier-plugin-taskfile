import { parseDocument, visit } from "yaml";

type SourceRange = readonly [number, number];

export class SerializedYamlContext {
  readonly lines: string[];
  readonly lineOffsets: number[];
  private parsed?: ReturnType<typeof parseDocument>;
  private scalarRanges?: SourceRange[];
  private keepChompRanges?: SourceRange[];

  constructor(readonly text: string) {
    this.lines = text.split("\n");
    this.lineOffsets = [];
    let offset = 0;
    for (const line of this.lines) {
      this.lineOffsets.push(offset);
      offset += line.length + 1;
    }
  }

  get document(): ReturnType<typeof parseDocument> {
    return (this.parsed ??= parseDocument(this.text, {
      keepSourceTokens: true,
    }));
  }

  lineAt(offset: number): number {
    return this.lastBefore(this.lineOffsets, offset, (start) => start);
  }

  insideScalar(line: number): boolean {
    this.indexScalars();
    const offset = this.lineOffsets[line];
    const index = this.lastBefore(
      this.scalarRanges!,
      offset - 1,
      ([start]) => start,
    );
    return index >= 0 && offset < this.scalarRanges![index][1];
  }

  followsKeepChomp(line: number): boolean {
    this.indexScalars();
    const previousEnd =
      this.lineOffsets[line - 1] + this.lines[line - 1].length;
    const index = this.lastBefore(
      this.keepChompRanges!,
      previousEnd,
      ([start]) => start,
    );
    return (
      index >= 0 && this.lineOffsets[line] <= this.keepChompRanges![index][1]
    );
  }

  private indexScalars(): void {
    if (this.scalarRanges) return;
    this.scalarRanges = [];
    this.keepChompRanges = [];
    visit(this.document, {
      Scalar: (_key, scalar) => {
        if (!scalar.range) return;
        const range: SourceRange = [scalar.range[0], scalar.range[1]];
        this.scalarRanges!.push(range);
        if (
          scalar.srcToken?.type === "block-scalar" &&
          scalar.srcToken.props.some(
            (token) =>
              token.type === "block-scalar-header" &&
              token.source.includes("+"),
          )
        ) {
          this.keepChompRanges!.push(range);
        }
      },
    });
    this.scalarRanges.sort((a, b) => a[0] - b[0]);
    this.keepChompRanges.sort((a, b) => a[0] - b[0]);
  }

  private lastBefore<T>(
    values: readonly T[],
    offset: number,
    start: (value: T) => number,
  ): number {
    let low = 0;
    let high = values.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (start(values[middle]) <= offset) low = middle + 1;
      else high = middle;
    }
    return low - 1;
  }
}
