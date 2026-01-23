/**
 * Logging system with configurable log levels and emoji indicators.
 * Supports different configurations for development and production.
 */

/**
 * Log levels in order of severity.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

const EMOJIS = {
  ERROR: '❌',
  WARN: '⚠️',
  INFO: 'ℹ️',
  DEBUG: '🔍',
} as const

type LogContext = {
  component?: string
  method?: string
  [key: string]: unknown
}

/**
 * Logger class for consistent logging across the framework.
 */
class Logger {
  private level: LogLevel = LogLevel.ERROR
  private isDevelopment: boolean = false

  /**
   * Initialize logger with environment detection.
   * @param options - Logger configuration options
   * @param options.level - Minimum log level (defaults based on environment)
   * @param options.isDevelopment - Whether in development mode
   */
  init(options?: { level?: LogLevel; isDevelopment?: boolean }): void {
    this.isDevelopment =
      options?.isDevelopment ??
      (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ??
      false

    // Default: ERROR in production, DEBUG in development
    this.level = options?.level ?? (this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR)
  }

  /**
   * Set the minimum log level.
   * @param level - Minimum log level to display
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * Get current log level.
   * @returns Current minimum log level
   */
  getLevel(): LogLevel {
    return this.level
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level
  }

  private formatMessage(emoji: string, message: string, context?: LogContext): string {
    const parts = [emoji, message]

    if (context) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')
      if (contextStr) {
        parts.push(`[${contextStr}]`)
      }
    }

    return parts.join(' ')
  }

  /**
   * Log an error message.
   * @param message - Error message
   * @param args - Additional arguments to log
   */
  error(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return
    console.error(this.formatMessage(EMOJIS.ERROR, message), ...args)
  }

  /**
   * Log a warning message.
   * @param message - Warning message
   * @param args - Additional arguments to log
   */
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return
    console.warn(this.formatMessage(EMOJIS.WARN, message), ...args)
  }

  /**
   * Log an info message.
   * @param message - Info message
   * @param args - Additional arguments to log
   */
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return
    console.info(this.formatMessage(EMOJIS.INFO, message), ...args)
  }

  /**
   * Log a debug message.
   * @param message - Debug message
   * @param args - Additional arguments to log
   */
  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return
    console.debug(this.formatMessage(EMOJIS.DEBUG, message), ...args)
  }

  /**
   * Log an error with context information.
   * @param message - Error message
   * @param context - Context object with additional information
   * @param error - Optional error object
   */
  errorWithContext(message: string, context: LogContext, error?: Error | unknown): void {
    if (!this.shouldLog(LogLevel.ERROR)) return
    const formatted = this.formatMessage(EMOJIS.ERROR, message, context)
    if (error) {
      console.error(formatted, error)
    } else {
      console.error(formatted)
    }
  }

  /**
   * Log a warning with context information.
   * @param message - Warning message
   * @param context - Context object with additional information
   */
  warnWithContext(message: string, context: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return
    console.warn(this.formatMessage(EMOJIS.WARN, message, context))
  }
}

// Singleton instance
export const logger = new Logger()

// Auto-initialize on import
logger.init()
