import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createHookRegistry,
  hookOn,
  hookOff,
  hookEmit,
  hookClear,
} from "../../src/utils/index.ts";
import type { LifecycleHook } from "../../src/types";

describe("hook-registry", () => {
  let registry: ReturnType<typeof createHookRegistry>;

  beforeEach(() => {
    registry = createHookRegistry();
  });

  describe("createHookRegistry", () => {
    it("creates empty registry", () => {
      const reg = createHookRegistry();
      expect(reg).toBeInstanceOf(Map);
      expect(reg.size).toBe(0);
    });
  });

  describe("hookOn", () => {
    it("registers callback for hook", async () => {
      const callback = vi.fn();
      hookOn(registry, "created", callback);
      expect(registry.has("created")).toBe(true);
      expect(registry.get("created")?.has(callback)).toBe(true);
    });

    it("registers multiple callbacks for same hook", () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      hookOn(registry, "created", callback1);
      hookOn(registry, "created", callback2);
      expect(registry.get("created")?.size).toBe(2);
    });

    it("works with global registry", () => {
      const callback = vi.fn();
      hookOn("global", "mounted", callback);
      hookEmit("global", "mounted");
      expect(callback).toHaveBeenCalled();
    });
  });

  describe("hookOff", () => {
    it("unregisters callback", () => {
      const callback = vi.fn();
      hookOn(registry, "created", callback);
      hookOff(registry, "created", callback);
      expect(registry.get("created")?.has(callback)).toBe(false);
    });

    it("handles non-existent hook gracefully", () => {
      expect(() =>
        hookOff(registry, "nonexistent" as LifecycleHook, vi.fn()),
      ).not.toThrow();
    });
  });

  describe("hookEmit", () => {
    it("calls all registered callbacks", async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      hookOn(registry, "created", callback1);
      hookOn(registry, "created", callback2);
      await hookEmit(registry, "created");
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("passes context to callbacks", async () => {
      const callback = vi.fn();
      const context = { test: "value" };
      hookOn(registry, "created", callback);
      await hookEmit(registry, "created", context);
      expect(callback).toHaveBeenCalledWith(context);
    });

    it("handles async callbacks", async () => {
      const callback = vi.fn().mockResolvedValue(undefined);
      hookOn(registry, "created", callback);
      await hookEmit(registry, "created");
      expect(callback).toHaveBeenCalled();
    });

    it("handles callback errors gracefully", async () => {
      const errorCallback = vi.fn().mockRejectedValue(new Error("test"));
      const goodCallback = vi.fn();
      hookOn(registry, "created", errorCallback);
      hookOn(registry, "created", goodCallback);
      await hookEmit(registry, "created");
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  describe("hookClear", () => {
    it("clears all hooks", () => {
      hookOn(registry, "created", vi.fn());
      hookOn(registry, "mounted", vi.fn());
      hookClear(registry);
      expect(registry.size).toBe(0);
    });
  });
});
