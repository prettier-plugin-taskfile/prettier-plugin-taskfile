import type { Scalar } from "yaml";
import type { TaskfileDiagnostic } from "../types";

export interface NameDefinition {
  readonly node: Scalar;
  readonly name: string;
  readonly kind: "task" | "variable";
  readonly scope: string;
}

export interface NameReference {
  readonly node: Scalar;
  readonly text: string;
  readonly name: string;
  readonly kind: "task" | "variable";
  readonly scope: string;
  readonly start: number;
  readonly end: number;
}

export interface RenameAnalysis {
  readonly definitions: readonly NameDefinition[];
  readonly references: readonly NameReference[];
  readonly hazards: readonly string[];
}

export interface ScalarRename {
  readonly node: Scalar;
  readonly from: string;
  readonly to: string;
}

export interface RenamePlan {
  readonly edits: readonly ScalarRename[];
  readonly diagnostics: readonly TaskfileDiagnostic[];
}
