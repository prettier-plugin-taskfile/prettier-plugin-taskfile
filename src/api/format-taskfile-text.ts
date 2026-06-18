import * as crypto from "crypto";
import * as yaml from "yaml";
import { formatTaskfileDocument } from "../ast/format-document";
import { addEmptyLines } from "../render/add-empty-lines";
import { getYamlOptions } from "../render/yaml-options";

interface FoldedBlockInfo {
  header: string;
  source: string;
}

// Folded block (>-) preservation:
//
// yaml's toString() joins folded block newlines into spaces, collapsing them
// into a single line. To prevent this, we use a 3-step approach around stringify:
//
// 1. collectAndReplaceFoldedBlocks: Find BLOCK_FOLDED nodes, save their original
//    source text (with line breaks), and replace them with PLAIN placeholders.
//    Placeholders are emitted as-is by toString() without any line joining.
//
// 2. toString(): Placeholders are output verbatim as plain scalars.
//
// 3. restoreFoldedBlocks: Replace placeholders in the output with the original
//    folded block text, re-indented to match the output's indentation level.

function collectAndReplaceFoldedBlocks(
  node: unknown,
  blocks: Map<string, FoldedBlockInfo>,
): void {
  if (!node) return;
  if (yaml.isScalar(node)) {
    const srcToken = (node as any).srcToken;
    if (node.type === "BLOCK_FOLDED" && srcToken) {
      const id = `__FOLDED_${crypto.randomUUID()}__`;
      const headerProp = srcToken.props?.find(
        (p: any) => p.type === "block-scalar-header",
      );
      blocks.set(id, {
        header: headerProp?.source || ">-",
        source: srcToken.source,
      });
      node.value = id;
      node.type = "PLAIN";
      delete (node as any).srcToken;
    }
    return;
  }
  if (yaml.isSeq(node)) {
    for (const item of node.items) {
      collectAndReplaceFoldedBlocks(item, blocks);
    }
  }
  if (yaml.isMap(node)) {
    for (const pair of node.items) {
      collectAndReplaceFoldedBlocks(pair.key, blocks);
      collectAndReplaceFoldedBlocks(pair.value, blocks);
    }
  }
  if (yaml.isDocument(node)) {
    collectAndReplaceFoldedBlocks(node.contents, blocks);
  }
}

function restoreFoldedBlocks(
  text: string,
  blocks: Map<string, FoldedBlockInfo>,
): string {
  if (blocks.size === 0) return text;

  const lines = text.split("\n");

  for (const [id, block] of blocks) {
    for (let i = 0; i < lines.length; i++) {
      const idx = lines[i].indexOf(id);
      if (idx < 0) continue;

      // Get the text before the placeholder (indentation + "- " etc.)
      const prefix = lines[i].slice(0, idx);
      const contentIndent = " ".repeat(prefix.length);

      const sourceLines = block.source.split("\n");
      if (sourceLines[sourceLines.length - 1] === "") sourceLines.pop();

      // Calculate original indentation and re-indent to match the output position
      const origIndent =
        sourceLines[0].length - sourceLines[0].replace(/^\s+/, "").length;
      const reindentedLines = sourceLines.map(
        (l) => contentIndent + l.slice(origIndent),
      );

      lines[i] = prefix + block.header + "\n" + reindentedLines.join("\n");
      break;
    }
  }

  return lines.join("\n");
}

export function createTaskfileDocument(text: string): yaml.Document {
  return yaml.parseDocument(text, { keepSourceTokens: true });
}

export function printTaskfileDocument(doc: yaml.Document): string {
  const foldedBlocks = new Map<string, FoldedBlockInfo>();
  collectAndReplaceFoldedBlocks(doc, foldedBlocks);

  formatTaskfileDocument(doc);

  let output = addEmptyLines(doc.toString(getYamlOptions()));
  output = restoreFoldedBlocks(output, foldedBlocks);

  return output;
}

export function formatTaskfileText(text: string): string {
  return printTaskfileDocument(createTaskfileDocument(text));
}

export function checkTaskfileFormatting(text: string): boolean {
  return formatTaskfileText(text) === text;
}
