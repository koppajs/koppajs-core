import { describe, it, expect } from "vitest";
import {
  isArrowFunction,
  bindMethods,
  containsHTML,
  getValueByPath,
  getExpectedPropTypeName,
} from "../../src/utils/helper";

describe("isArrowFunction", () => {
  it("returns true for arrow functions", () => {
    const arrow = () => {};
    expect(isArrowFunction(arrow)).toBe(true);
  });

  it("returns false for regular functions", () => {
    function regular() {}
    expect(isArrowFunction(regular)).toBe(false);
  });

  it("returns false for non-functions", () => {
    expect(isArrowFunction({} as any)).toBe(false);
  });
});

describe("bindMethods", () => {
  it("binds method correctly to data context", () => {
    const data: any = { x: 5 };
    const methods = {
      add(this: any, y: number) {
        return this.x + y;
      },
    };
    bindMethods(data, methods);
    expect(data.add(3)).toBe(8);
  });

  it("ignores undefined methods", () => {
    const data: any = {};
    const methods = {
      hello: undefined,
    } as any;
    bindMethods(data, methods);
    expect(data.hello).toBeUndefined();
  });

  it("does not throw if methods is empty", () => {
    const data: any = {};
    expect(() => bindMethods(data, {})).not.toThrow();
  });
});

describe("containsHTML", () => {
  it("detects HTML tags", () => {
    expect(containsHTML("<div>test</div>")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(containsHTML("no tags here")).toBe(false);
  });

  it("returns false for malformed tags", () => {
    expect(containsHTML("<notatag")).toBe(false);
  });
});

describe("getValueByPath", () => {
  const obj = { a: { b: { c: 42 } }, arr: [{ x: 1 }] };

  it("retrieves nested value using dot path", () => {
    expect(getValueByPath(obj, "a.b.c")).toBe(42);
  });

  it("retrieves nested array item", () => {
    expect(getValueByPath(obj, "arr[0].x")).toBe(1);
  });

  it("returns undefined for invalid path", () => {
    expect(getValueByPath(obj, "arr[10].x")).toBeUndefined();
  });
});

describe("getExpectedPropTypeName", () => {
  it("returns lowercase string type", () => {
    expect(getExpectedPropTypeName("Number")).toBe("number");
  });

  it("resolves constructor to type name", () => {
    expect(getExpectedPropTypeName(Boolean)).toBe("boolean");
  });

  it("returns unknown for unsupported types", () => {
    expect(getExpectedPropTypeName(Symbol())).toBe("unknown");
  });
});
