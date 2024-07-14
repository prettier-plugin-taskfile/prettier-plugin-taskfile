import { describe, test, expect } from "@jest/globals";
import * as prettier from "prettier";

describe("prettier plugin taskfile", () => {
  test("ordering of the main sections", async () => {
    const code = `test0: 'hello'
includes:
test1: 'hello'
version: '3'
test2: 'hello'
env:
test3: 'hello'
tasks:
test4: 'hello'
vars:
test5: 'hello'`;
    const actual = await prettier.format(code, {
      plugins: ["./src"],
      parser: "taskfile",
    });
    const expected = `test0: 'hello'
version: '3'
test1: 'hello'
includes:
test2: 'hello'
vars:
test3: 'hello'
env:
test4: 'hello'
tasks:
test5: 'hello'
`;
    expect(actual).toBe(expected);
  });
});
