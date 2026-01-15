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
      expect(result.state!.value).toBe(42);
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
      expect(result.state!.refsCount).toBe(1);
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
      expect(result.state!.hasParent).toBe(true);
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
      expect(result.state!.test).toBe("value");
    });
  });

  describe("compileCode with deps injection", () => {
    it("injects resolved dependencies as local variables", () => {
      const script = "{ state: { nav: DOC_NAV } }";
      const resolvedDeps = { DOC_NAV: ["Home", "About", "Contact"] };
      const compiled = compileCode(script, resolvedDeps);
      const context: ComponentContext = {
        $refs: {},
        $emit: () => {},
        $take: () => {},
      };
      const result = compiled(context);
      expect(result.state!.nav).toEqual(["Home", "About", "Contact"]);
    });

    it("injects multiple dependencies", () => {
      const script = "{ state: { config: CONFIG, utils: UTILS } }";
      const resolvedDeps = {
        CONFIG: { api: "https://api.example.com" },
        UTILS: { format: (x: number) => x.toFixed(2) },
      };
      const compiled = compileCode(script, resolvedDeps);
      const context: ComponentContext = {
        $refs: {},
        $emit: () => {},
        $take: () => {},
      };
      const result = compiled(context);
      expect(result.state!.config.api).toBe("https://api.example.com");
      expect(typeof result.state!.utils.format).toBe("function");
    });

    it("allows using dependencies in methods", () => {
      const script = `{
        state: { value: 0 },
        methods: {
          getValue() { return CONSTANT; }
        }
      }`;
      const resolvedDeps = { CONSTANT: 42 };
      const compiled = compileCode(script, resolvedDeps);
      const context: ComponentContext = {
        $refs: {},
        $emit: () => {},
        $take: () => {},
      };
      const result = compiled(context);
      expect(result.methods!.getValue()).toBe(42);
    });

    it("allows user script to shadow injected dependency (var redeclaration)", () => {
      // Note: The Vite plugin strips import declarations, so in normal usage
      // there won't be redeclarations. This test documents the behavior if
      // a user explicitly redeclares a variable with the same name.
      // var redeclaration is valid JavaScript and shadows the injected value.
      const script =
        "(() => { var DOC_NAV = 'local'; return { state: { nav: DOC_NAV } }; })()";
      const resolvedDeps = { DOC_NAV: ["Home", "About"] };
      const compiled = compileCode(script, resolvedDeps);
      const context: ComponentContext = {
        $refs: {},
        $emit: () => {},
        $take: () => {},
      };
      // The local var shadows the injected value
      const result = compiled(context);
      expect(result.state!.nav).toBe("local");
    });

    it("works without deps (backward compatible)", () => {
      const script = "{ state: { count: 0 } }";
      const compiled = compileCode(script);
      const context: ComponentContext = {
        $refs: {},
        $emit: () => {},
        $take: () => {},
      };
      const result = compiled(context);
      expect(result.state!.count).toBe(0);
    });

    it("works with empty deps object", () => {
      const script = "{ state: { count: 0 } }";
      const compiled = compileCode(script, {});
      const context: ComponentContext = {
        $refs: {},
        $emit: () => {},
        $take: () => {},
      };
      const result = compiled(context);
      expect(result.state!.count).toBe(0);
    });
  });
});
