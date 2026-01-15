import { logger, LogLevel } from "../src/utils/logger";

// Set logger to NONE level during tests to suppress expected error messages
logger.setLevel(LogLevel.NONE);
