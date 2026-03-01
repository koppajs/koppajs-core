import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, LogLevel } from "../../src/utils/index.ts";

describe("Logger", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset to default state after each test
    logger.init();
  });

  // ==================== POSITIVE TESTS ====================

  describe("LogLevel enum", () => {
    it("has correct severity order (DEBUG < INFO < WARN < ERROR < NONE)", () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
      expect(LogLevel.NONE).toBe(4);
      expect(LogLevel.DEBUG < LogLevel.INFO).toBe(true);
      expect(LogLevel.INFO < LogLevel.WARN).toBe(true);
      expect(LogLevel.WARN < LogLevel.ERROR).toBe(true);
      expect(LogLevel.ERROR < LogLevel.NONE).toBe(true);
    });
  });

  describe("auto-initialization", () => {
    it("is usable immediately without explicit init() call", () => {
      // Logger should work without calling init() - it auto-initializes on import
      logger.setLevel(LogLevel.ERROR);
      logger.error("test error");
      expect(console.error).toHaveBeenCalled();
    });

    it("has a valid default level after auto-init", () => {
      // After auto-init, level should be set (not undefined)
      const level = logger.getLevel();
      expect(level).toBeGreaterThanOrEqual(LogLevel.DEBUG);
      expect(level).toBeLessThanOrEqual(LogLevel.NONE);
    });
  });

  describe("init", () => {
    it("initializes with default settings (ERROR level in production)", () => {
      logger.init();
      expect(logger.getLevel()).toBeGreaterThanOrEqual(LogLevel.ERROR);
    });

    it("initializes with custom level", () => {
      logger.init({ level: LogLevel.DEBUG });
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it("initializes with development mode (sets DEBUG level)", () => {
      logger.init({ isDevelopment: true });
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it("allows re-initialization to change settings", () => {
      logger.init({ level: LogLevel.ERROR });
      expect(logger.getLevel()).toBe(LogLevel.ERROR);
      logger.init({ level: LogLevel.DEBUG });
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it("explicit level overrides isDevelopment default", () => {
      logger.init({ isDevelopment: true, level: LogLevel.ERROR });
      expect(logger.getLevel()).toBe(LogLevel.ERROR);
    });
  });

  describe("setLevel / getLevel", () => {
    it("sets and gets log level correctly", () => {
      logger.setLevel(LogLevel.WARN);
      expect(logger.getLevel()).toBe(LogLevel.WARN);
    });

    it("can set level to NONE to suppress all logs", () => {
      logger.setLevel(LogLevel.NONE);
      expect(logger.getLevel()).toBe(LogLevel.NONE);
    });

    it("can set level to DEBUG to allow all logs", () => {
      logger.setLevel(LogLevel.DEBUG);
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });
  });

  describe("error", () => {
    it("logs error when level allows", () => {
      logger.setLevel(LogLevel.ERROR);
      logger.error("test error");
      expect(console.error).toHaveBeenCalled();
    });

    it("logs error with additional arguments", () => {
      logger.setLevel(LogLevel.ERROR);
      const extra = { foo: "bar" };
      logger.error("test error", extra);
      expect(console.error).toHaveBeenCalledWith(expect.any(String), extra);
    });
  });

  describe("warn", () => {
    it("logs warning when level allows", () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn("test warning");
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe("info", () => {
    it("logs info when level allows", () => {
      logger.setLevel(LogLevel.INFO);
      logger.info("test info");
      expect(console.info).toHaveBeenCalled();
    });
  });

  describe("debug", () => {
    it("logs debug when level allows", () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug("test debug");
      expect(console.debug).toHaveBeenCalled();
    });
  });

  describe("errorWithContext", () => {
    it("logs error with context", () => {
      logger.setLevel(LogLevel.ERROR);
      logger.errorWithContext("test", { component: "TestComponent" });
      expect(console.error).toHaveBeenCalled();
    });

    it("logs error with error object", () => {
      logger.setLevel(LogLevel.ERROR);
      const error = new Error("test");
      logger.errorWithContext("test", { component: "Test" }, error);
      expect(console.error).toHaveBeenCalled();
    });

    it("includes context in formatted message", () => {
      logger.setLevel(LogLevel.ERROR);
      logger.errorWithContext("test message", {
        component: "MyComp",
        method: "init",
      });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("component: MyComp"),
      );
    });
  });

  describe("warnWithContext", () => {
    it("logs warning with context", () => {
      logger.setLevel(LogLevel.WARN);
      logger.warnWithContext("test", { component: "TestComponent" });
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // ==================== NEGATIVE TESTS ====================

  describe("level filtering (negative cases)", () => {
    it("does not log error when level is NONE", () => {
      logger.setLevel(LogLevel.NONE);
      logger.error("test error");
      expect(console.error).not.toHaveBeenCalled();
    });

    it("does not log warn when level is ERROR", () => {
      logger.setLevel(LogLevel.ERROR);
      logger.warn("test warning");
      expect(console.warn).not.toHaveBeenCalled();
    });

    it("does not log info when level is WARN", () => {
      logger.setLevel(LogLevel.WARN);
      logger.info("test info");
      expect(console.info).not.toHaveBeenCalled();
    });

    it("does not log debug when level is INFO", () => {
      logger.setLevel(LogLevel.INFO);
      logger.debug("test debug");
      expect(console.debug).not.toHaveBeenCalled();
    });

    it("does not log errorWithContext when level is NONE", () => {
      logger.setLevel(LogLevel.NONE);
      logger.errorWithContext("test", { component: "Test" });
      expect(console.error).not.toHaveBeenCalled();
    });

    it("does not log warnWithContext when level is ERROR", () => {
      logger.setLevel(LogLevel.ERROR);
      logger.warnWithContext("test", { component: "Test" });
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  // ==================== EDGE CASE TESTS ====================

  describe("edge cases", () => {
    it("handles empty message string", () => {
      logger.setLevel(LogLevel.ERROR);
      logger.error("");
      expect(console.error).toHaveBeenCalled();
    });

    it("handles empty context object", () => {
      logger.setLevel(LogLevel.ERROR);
      logger.errorWithContext("test", {});
      expect(console.error).toHaveBeenCalled();
    });

    it("handles context with undefined values", () => {
      logger.setLevel(LogLevel.ERROR);
      logger.errorWithContext("test", {
        component: undefined as unknown as string,
      });
      expect(console.error).toHaveBeenCalled();
    });

    it("logs at exact boundary level (ERROR logs at ERROR)", () => {
      logger.setLevel(LogLevel.ERROR);
      logger.error("boundary test");
      expect(console.error).toHaveBeenCalled();
    });

    it("logs at exact boundary level (WARN logs at WARN)", () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn("boundary test");
      expect(console.warn).toHaveBeenCalled();
    });

    it("logs at exact boundary level (INFO logs at INFO)", () => {
      logger.setLevel(LogLevel.INFO);
      logger.info("boundary test");
      expect(console.info).toHaveBeenCalled();
    });

    it("logs at exact boundary level (DEBUG logs at DEBUG)", () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug("boundary test");
      expect(console.debug).toHaveBeenCalled();
    });

    it("multiple rapid level changes work correctly", () => {
      logger.setLevel(LogLevel.NONE);
      logger.error("suppressed");
      expect(console.error).not.toHaveBeenCalled();

      logger.setLevel(LogLevel.ERROR);
      logger.error("visible");
      expect(console.error).toHaveBeenCalledTimes(1);

      logger.setLevel(LogLevel.NONE);
      logger.error("suppressed again");
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it("all log methods work at DEBUG level", () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug("d");
      logger.info("i");
      logger.warn("w");
      logger.error("e");
      expect(console.debug).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it("no log methods work at NONE level", () => {
      logger.setLevel(LogLevel.NONE);
      logger.debug("d");
      logger.info("i");
      logger.warn("w");
      logger.error("e");
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.info).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});
