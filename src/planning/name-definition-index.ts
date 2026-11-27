import { normalizeTaskName } from "../rules/normalize-task-name";
import { normalizeVariableName } from "../rules/normalize-variable-name";
import type { NameDefinition } from "./rename-types";

type DefinitionName = Pick<NameDefinition, "name" | "kind" | "scope">;
type NameForm = "original" | "normalized";

export interface IndexedNameDefinition<D extends DefinitionName> {
  readonly definition: D;
  readonly normalizedName: string;
  readonly position: number;
  readonly normalizedCollision: boolean;
}

// Build only after the caller's definition collection is complete.
export function createNameDefinitionIndex<D extends DefinitionName>(
  definitions: readonly D[],
) {
  type Entry = IndexedNameDefinition<D>;
  type Lookup = Map<DefinitionName["kind"], Map<string, Map<string, Entry>>>;
  const original: Lookup = new Map();
  const normalized: Lookup = new Map();
  const occupiedNormalizedKeys = new Set<string>();
  const renamedLocalVariables = new Set<string>();
  const lookup = (
    kind: DefinitionName["kind"],
    name: string,
    scope: string,
    form: NameForm = "original",
  ): Entry | undefined =>
    (form === "original" ? original : normalized)
      .get(kind)
      ?.get(scope)
      ?.get(name);
  const insert = (map: Lookup, name: string, entry: Entry) => {
    const { kind, scope } = entry.definition;
    let scopes = map.get(kind);
    if (!scopes) map.set(kind, (scopes = new Map()));
    let names = scopes.get(scope);
    if (!names) scopes.set(scope, (names = new Map()));
    if (!names.has(name)) names.set(name, entry);
  };
  const entries = Object.freeze(
    definitions.map((definition, position): Entry => {
      const normalizedName =
        definition.kind === "task"
          ? normalizeTaskName(definition.name)
          : normalizeVariableName(definition.name);
      // Retain collision diagnostics even for unsupported names containing "/".
      const collisionKey = `${definition.kind}/${definition.scope}/${normalizedName}`;
      const entry = Object.freeze({
        definition,
        normalizedName,
        position,
        normalizedCollision: occupiedNormalizedKeys.has(collisionKey),
      });
      occupiedNormalizedKeys.add(collisionKey);
      insert(original, definition.name, entry);
      insert(normalized, normalizedName, entry);
      if (
        definition.kind === "variable" &&
        definition.scope !== "root" &&
        normalizedName !== definition.name
      )
        renamedLocalVariables.add(definition.name);
      return entry;
    }),
  );
  return Object.freeze({
    entries,
    lookup,
    resolve: (
      kind: DefinitionName["kind"],
      name: string,
      scope: string,
      form: NameForm = "original",
    ): Entry | undefined =>
      lookup(kind, name, scope, form) ?? lookup(kind, name, "root", form),
    hasRenamedLocalVariable: (name: string): boolean =>
      renamedLocalVariables.has(name),
  });
}
