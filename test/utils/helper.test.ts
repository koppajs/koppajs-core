import { describe, it, expect } from "vitest";
import {
  bindMethods,
  containsHTML,
  getValueByPath,
  getExpectedPropTypeName,
  setValueByPath,
  isSimplePathExpression,
  bindOnce,
} from "../../src/utils/index.ts";

describe("bindMethods", () => {
  it("binds method correctly to data context", () => {
    const data: any = { x: 5 };
    const methods = {
      add(this: any, y: number) {
        return this.x + y;
      },
    };
    bindMethods(methods, data);
    expect(methods.add(3)).toBe(8);
  });

  it("ignores undefined methods", () => {
    const data: any = {};
    const methods = {
      hello: undefined,
    } as any;
    bindMethods(methods, data);
    expect(methods.hello).toBeUndefined();
  });

  it("does not throw if methods is empty", () => {
    const data: any = {};
    expect(() => bindMethods({}, data)).not.toThrow();
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

describe("isSimplePathExpression", () => {
  it("returns true for simple dot notation", () => {
    expect(isSimplePathExpression("foo")).toBe(true);
    expect(isSimplePathExpression("foo.bar")).toBe(true);
    expect(isSimplePathExpression("foo.bar.baz")).toBe(true);
  });

  it("returns true for bracket notation", () => {
    expect(isSimplePathExpression("foo[0]")).toBe(true);
    expect(isSimplePathExpression("foo[bar]")).toBe(true);
    expect(isSimplePathExpression("foo[0].bar")).toBe(true);
    expect(isSimplePathExpression("foo.bar[0].baz")).toBe(true);
  });

  it("returns false for invalid expressions", () => {
    expect(isSimplePathExpression("")).toBe(false);
    expect(isSimplePathExpression("123")).toBe(false);
    expect(isSimplePathExpression("foo['bar']")).toBe(false);
    expect(isSimplePathExpression("foo.bar()")).toBe(false);
    expect(isSimplePathExpression("foo + bar")).toBe(false);
  });

  it("handles whitespace", () => {
    expect(isSimplePathExpression("  foo.bar  ")).toBe(true);
    expect(isSimplePathExpression("  foo  ")).toBe(true);
  });
});

describe("setValueByPath", () => {
  it("sets value at simple path", () => {
    const obj = { x: 5 };
    setValueByPath(obj, "x", 10);
    expect(obj.x).toBe(10);
  });

  it("sets value at nested path", () => {
    const obj = { a: { b: { c: 42 } } };
    setValueByPath(obj, "a.b.c", 100);
    expect(obj.a.b.c).toBe(100);
  });

  it("sets value at array path", () => {
    const obj = { arr: [{ x: 1 }, { x: 2 }] };
    setValueByPath(obj, "arr[0].x", 10);
    expect(obj.arr[0].x).toBe(10);
  });

  it("throws error for null target", () => {
    expect(() => setValueByPath(null, "x", 10)).toThrow(
      "target must be an object"
    );
  });

  it("throws error for undefined target", () => {
    expect(() => setValueByPath(undefined, "x", 10)).toThrow(
      "target must be an object"
    );
  });

  it("throws error for non-object target", () => {
    expect(() => setValueByPath("string", "x", 10)).toThrow(
      "target must be an object"
    );
  });

  it("throws error for empty path", () => {
    const obj = { x: 5 };
    expect(() => setValueByPath(obj, "", 10)).toThrow(
      "path must be a non-empty string"
    );
  });

  it("throws error for missing segment", () => {
    const obj = { a: {} };
    expect(() => setValueByPath(obj, "a.b.c", 10)).toThrow("Missing segment");
  });

  it("throws error for non-object segment", () => {
    const obj = { a: { b: "string" } };
    expect(() => setValueByPath(obj, "a.b.c", 10)).toThrow("is not an object");
  });

  it("throws error for non-existent final key", () => {
    const obj = { a: { b: {} } };
    expect(() => setValueByPath(obj, "a.b.c", 10)).toThrow("does not exist");
  });

  it("throws error for read-only property", () => {
    const obj: any = {};
    Object.defineProperty(obj, "x", {
      value: 5,
      writable: false,
    });
    expect(() => setValueByPath(obj, "x", 10)).toThrow("read-only");
  });

  it("allows setting property with setter", () => {
    const obj: any = {};
    let value = 5;
    Object.defineProperty(obj, "x", {
      get() {
        return value;
      },
      set(v) {
        value = v;
      },
    });
    setValueByPath(obj, "x", 10);
    expect(obj.x).toBe(10);
  });
});

describe("bindOnce", () => {
  it("binds function to context", () => {
    const context = { x: 5 };
    function fn(this: any) {
      return this.x;
    }
    const bound = bindOnce(fn, context);
    expect(bound()).toBe(5);
  });

  it("only binds once", () => {
    const context1 = { x: 5 };
    const context2 = { x: 10 };
    function fn(this: any) {
      return this.x;
    }
    const bound1 = bindOnce(fn, context1);
    const bound2 = bindOnce(bound1, context2);
    expect(bound2()).toBe(5); // Should still use context1
  });

  it("returns non-function as-is", () => {
    const context = {};
    expect(bindOnce("string" as any, context)).toBe("string");
    expect(bindOnce(42 as any, context)).toBe(42);
  });
});
