const rootFields = new Set(["vars", "env", "dir"]);
const taskFields = new Set([
  "vars",
  "env",
  "cmds",
  "cmd",
  "defer",
  "desc",
  "summary",
  "dir",
  "sources",
  "generates",
  "status",
  "preconditions",
  "if",
  "msg",
  "label",
  "prefix",
]);

export type TaskfileTemplateContext =
  // Entry fields are gated separately from nested task-like maps.
  | { readonly kind: "root" | "task-definition" | "task" | "variable-value" }
  | {
      readonly kind: "variable-map";
      // A variable named vars/env can itself contain a variable-map payload.
      readonly value: "field" | "variable-payload";
    };

interface TemplateClassification {
  readonly recognized: boolean;
  readonly context: TaskfileTemplateContext;
}

function isVariablePayload(context: TaskfileTemplateContext): boolean {
  return (
    context.kind === "variable-value" ||
    (context.kind === "variable-map" && context.value === "variable-payload")
  );
}

export function classifyTaskfileTemplateField(
  key: string,
  context: TaskfileTemplateContext,
): TemplateClassification {
  const variables = context.kind === "variable-map";
  const recognized =
    context.kind === "root"
      ? rootFields.has(key)
      : context.kind === "task-definition"
        ? taskFields.has(key)
        : variables ||
          (!isVariablePayload(context) && taskFields.has(key)) ||
          key === "sh" ||
          key === "ref";

  return {
    recognized,
    context:
      key === "vars" || key === "env"
        ? {
            kind: "variable-map",
            value: variables ? "variable-payload" : "field",
          }
        : { kind: variables ? "variable-value" : "task" },
  };
}

export function classifyTaskfileTemplateSequence(
  context: TaskfileTemplateContext,
): TemplateClassification {
  const payload = isVariablePayload(context);
  return {
    recognized: !payload,
    context: { kind: payload ? "variable-value" : "task" },
  };
}
