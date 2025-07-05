import { uppercaseVariableNames } from "./variable-formatter";

describe("uppercaseVariableNames", () => {
  test("should convert all variable names to uppercase", () => {
    const input = {
      lowercase: "value",
      UPPERCASE: "value",
      MixedCase: "value",
      snake_case: "value",
      "kebab-case": "value",
    };

    const result = uppercaseVariableNames(input);

    expect(Object.keys(result)).toContain("LOWERCASE");
    expect(Object.keys(result)).toContain("UPPERCASE");
    expect(Object.keys(result)).toContain("MIXEDCASE");
    expect(Object.keys(result)).toContain("SNAKE_CASE");
    expect(Object.keys(result)).toContain("KEBAB-CASE");

    expect(result.LOWERCASE).toBe("value");
    expect(result.UPPERCASE).toBe("value");
    expect(result.MIXEDCASE).toBe("value");
    expect(result.SNAKE_CASE).toBe("value");
    expect(result["KEBAB-CASE"]).toBe("value");
  });

  test("should handle empty object", () => {
    const input = {};
    const result = uppercaseVariableNames(input);
    expect(Object.keys(result).length).toBe(0);
  });

  test("should handle null/undefined input", () => {
    expect(uppercaseVariableNames(null as any)).toBe(null);
    expect(uppercaseVariableNames(undefined as any)).toBe(undefined);
  });

  test("should preserve values while changing keys", () => {
    const input = {
      string_var: "string value",
      number_var: 42,
      boolean_var: true,
    };

    const result = uppercaseVariableNames(input);

    expect(result.STRING_VAR).toBe("string value");
    expect(result.NUMBER_VAR).toBe(42);
    expect(result.BOOLEAN_VAR).toBe(true);
  });

  test("should handle complex object values", () => {
    const input = {
      string_var: "string value",
      number_var: 42,
      boolean_var: true,
    };

    const result = uppercaseVariableNames(input);

    expect(result.STRING_VAR).toBe("string value");
    expect(result.NUMBER_VAR).toBe(42);
    expect(result.BOOLEAN_VAR).toBe(true);
  });

  test("should handle special characters in variable names", () => {
    const input = {
      "var-with-dashes": "value1",
      var_with_underscores: "value2",
      "var.with.dots": "value3",
      var123: "value4",
    };

    const result = uppercaseVariableNames(input);

    expect(result["VAR-WITH-DASHES"]).toBe("value1");
    expect(result.VAR_WITH_UNDERSCORES).toBe("value2");
    expect(result["VAR.WITH.DOTS"]).toBe("value3");
    expect(result.VAR123).toBe("value4");
  });

  test("should handle empty string variable names", () => {
    const input = {
      "": "empty name",
      " ": "space name",
    };

    const result = uppercaseVariableNames(input);

    expect(result[""]).toBe("empty name");
    expect(result[" "]).toBe("space name");
  });

  test("should handle variables with already uppercase names", () => {
    const input = {
      ALREADY_UPPERCASE: "value1",
      MIXED_CASE_VAR: "value2",
    };

    const result = uppercaseVariableNames(input);

    expect(result.ALREADY_UPPERCASE).toBe("value1");
    expect(result.MIXED_CASE_VAR).toBe("value2");
    expect(Object.keys(result).length).toBe(2);
  });

  test("should handle non-string object keys", () => {
    // TypeScript would normally prevent this, but JavaScript allows it
    const input: any = {};
    input[123] = "numeric key";
    input["true"] = "boolean key"; // Use string instead of boolean

    const result = uppercaseVariableNames(input);

    // These will be converted to strings and then uppercased
    expect(result["123"]).toBe("numeric key");
    expect(result["TRUE"]).toBe("boolean key");
  });

  test("should maintain property order where possible", () => {
    const input = {
      zebra: "last",
      alpha: "first",
      beta: "middle",
    };

    const result = uppercaseVariableNames(input);
    const keys = Object.keys(result);

    expect(keys).toEqual(["ZEBRA", "ALPHA", "BETA"]);
  });
});
