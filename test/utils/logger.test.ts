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
  });

  describe("LogLevel enum", () => {
    it("has correct values", () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
      expect(LogLevel.NONE).toBe(4);
    });
  });

  describe("init", () => {
    it("initializes with default settings", () => {
      logger.init();
      expect(logger.getLevel()).toBeGreaterThanOrEqual(LogLevel.ERROR);
    });

    it("initializes with custom level", () => {
      logger.init({ level: LogLevel.DEBUG });
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });

    it("initializes with development mode", () => {
      logger.init({ isDevelopment: true });
      expect(logger.getLevel()).toBe(LogLevel.DEBUG);
    });
  });

  describe("setLevel", () => {
    it("sets log level", () => {
      logger.setLevel(LogLevel.WARN);
      expect(logger.getLevel()).toBe(LogLevel.WARN);
    });
  });

  describe("error", () => {
    it("logs error when level allows", () => {
      logger.setLevel(LogLevel.ERROR);
      logger.error("test error");
      expect(console.error).toHaveBeenCalled();
    });

    it("does not log when level is too high", () => {
      logger.setLevel(LogLevel.NONE);
      logger.error("test error");
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("warn", () => {
    it("logs warning when level allows", () => {
      logger.setLevel(LogLevel.WARN);
      logger.warn("test warning");
      expect(console.warn).toHaveBeenCalled();
    });

    it("does not log when level is too high", () => {
      logger.setLevel(LogLevel.ERROR);
      logger.warn("test warning");
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe("info", () => {
    it("logs info when level allows", () => {
      logger.setLevel(LogLevel.INFO);
      logger.info("test info");
      expect(console.info).toHaveBeenCalled();
    });

    it("does not log when level is too high", () => {
      logger.setLevel(LogLevel.WARN);
      logger.info("test info");
      expect(console.info).not.toHaveBeenCalled();
    });
  });

  describe("debug", () => {
    it("logs debug when level allows", () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug("test debug");
      expect(console.debug).toHaveBeenCalled();
    });

    it("does not log when level is too high", () => {
      logger.setLevel(LogLevel.INFO);
      logger.debug("test debug");
      expect(console.debug).not.toHaveBeenCalled();
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
  });

  describe("warnWithContext", () => {
    it("logs warning with context", () => {
      logger.setLevel(LogLevel.WARN);
      logger.warnWithContext("test", { component: "TestComponent" });
      expect(console.warn).toHaveBeenCalled();
    });
  });
});
