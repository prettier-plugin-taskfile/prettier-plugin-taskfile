import { normalizeVariableName } from "./normalize-variable-name";

describe("normalizeVariableName", () => {
  test("uppercases variable names", () => {
    expect(normalizeVariableName("project_name")).toBe("PROJECT_NAME");
    expect(normalizeVariableName("mixedCase_Var")).toBe("MIXEDCASE_VAR");
  });
});
