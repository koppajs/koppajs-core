import { logger, LogLevel } from '../src/utils/logger'

// Set logger to NONE level during tests to suppress expected error messages
logger.setLevel(LogLevel.NONE)

/**
 * Flushes pending microtasks by awaiting a queueMicrotask.
 * Use this after state changes to allow observers to be notified.
 */
export function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve))
}
