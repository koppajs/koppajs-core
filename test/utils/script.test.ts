import { describe, it, expect } from "vitest";
import { compileCode } from "../../src/utils/index.ts";
import type { ComponentContext } from "../../src/types";

describe("script", () => {
  describe("compileCode", () => {
    it("compiles simple script", () => {
      const script = "{ state: { count: 0 } }";
      const compiled = compileCode(script);
      expect(typeof compiled).toBe("function");
    });

    it("executes compiled script with context", () => {
      const script = "{ state: { value: 42 } }";
      const compiled = compileCode(script);
      const context: ComponentContext = {
        $refs: {},
        $emit: () => {},
        $take: () => {},
      };
      const result = compiled(context);
      expect(result.state.value).toBe(42);
    });

    it("exposes context variables", () => {
      const script = "{ state: { refsCount: Object.keys($refs).length } }";
      const compiled = compileCode(script);
      const context: ComponentContext = {
        $refs: { button: document.createElement("button") },
        $emit: () => {},
        $take: () => {},
      };
      const result = compiled(context);
      expect(result.state.refsCount).toBe(1);
    });

    it("handles $parent in context", () => {
      const script = "{ state: { hasParent: !!$parent } }";
      const compiled = compileCode(script);
      const context: ComponentContext = {
        $refs: {},
        $parent: {} as any,
        $emit: () => {},
        $take: () => {},
      };
      const result = compiled(context);
      expect(result.state.hasParent).toBe(true);
    });

    it("throws on invalid syntax", () => {
      const script = "{ invalid syntax }";
      expect(() => compileCode(script)).toThrow();
    });

    it("handles sanitized code", () => {
      const script = "{ state: { test: 'value' } }";
      const compiled = compileCode(script);
      const context: ComponentContext = {
        $refs: {},
        $emit: () => {},
        $take: () => {},
      };
      const result = compiled(context);
      expect(result.state.test).toBe("value");
    });
  });
});
