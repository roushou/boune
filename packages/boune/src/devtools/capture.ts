import type { DevToolsEvent, EventType } from "./types.ts";
import { DevToolsStorage, type StorageOptions } from "./storage.ts";
import type { MiddlewareHandler } from "../types/handlers.ts";

let sharedStorage: DevToolsStorage | null = null;

/**
 * Get or create the shared storage instance
 */
function getStorage(options?: StorageOptions): DevToolsStorage {
  if (!sharedStorage) {
    sharedStorage = DevToolsStorage.create(options);
  }
  return sharedStorage;
}

/**
 * Write an event to storage
 */
function writeEvent(
  type: EventType,
  data: Record<string, unknown>,
  storageOptions?: StorageOptions,
): DevToolsEvent {
  const storage = getStorage(storageOptions);
  const event: DevToolsEvent = {
    id: crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    data,
  };
  storage.insert(event);
  return event;
}

/**
 * Create a middleware that captures command execution events
 * and writes them to SQLite storage for the devtools dashboard
 *
 * @example
 * ```typescript
 * import { defineCli } from "boune";
 * import { createCaptureMiddleware } from "boune/devtools";
 *
 * const cli = defineCli({
 *   name: "myapp",
 *   commands: { ... },
 *   middleware: [
 *     createCaptureMiddleware(), // Captures to .boune/devtools.db
 *   ],
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With custom options
 * createCaptureMiddleware({
 *   dbPath: ".myapp/events.db",
 *   devOnly: true,
 *   metadata: { version: "1.0.0" },
 * })
 * ```
 */
export function createCaptureMiddleware(
  options: {
    dbPath?: string;
    devOnly?: boolean;
    captureStart?: boolean;
    captureEnd?: boolean;
    captureErrors?: boolean;
    metadata?: Record<string, unknown>;
  } = {},
): MiddlewareHandler {
  const {
    dbPath,
    devOnly = true,
    captureStart = true,
    captureEnd = true,
    captureErrors = true,
    metadata = {},
  } = options;

  const storageOptions: StorageOptions | undefined = dbPath ? { path: dbPath } : undefined;

  return async (ctx, next) => {
    // Skip if devOnly and not in development
    if (devOnly && process.env.NODE_ENV === "production") {
      return next();
    }

    const commandName = ctx.command.name;
    const startTime = Date.now();

    const baseData = {
      command: commandName,
      args: ctx.args,
      options: ctx.options,
      ...metadata,
    };

    // Capture command start
    if (captureStart) {
      writeEvent("command:start", baseData, storageOptions);
    }

    try {
      await next();

      // Capture command end
      if (captureEnd) {
        writeEvent(
          "command:end",
          {
            ...baseData,
            duration: Date.now() - startTime,
          },
          storageOptions,
        );
      }
    } catch (error) {
      // Capture command error
      if (captureErrors) {
        writeEvent(
          "command:error",
          {
            ...baseData,
            duration: Date.now() - startTime,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          },
          storageOptions,
        );
      }

      // Re-throw to let normal error handling continue
      throw error;
    }
  };
}

/**
 * Create a logger that writes log events to devtools storage
 *
 * @example
 * ```typescript
 * import { createDevToolsLogger } from "boune/devtools";
 *
 * const logger = createDevToolsLogger();
 *
 * logger.info("Server started", { port: 3000 });
 * logger.warn("Deprecated API used");
 * logger.error("Failed to connect", { error: err.message });
 * ```
 */
export function createDevToolsLogger(options: { dbPath?: string } = {}) {
  const storageOptions: StorageOptions | undefined = options.dbPath
    ? { path: options.dbPath }
    : undefined;

  return {
    info(message: string, data: Record<string, unknown> = {}) {
      writeEvent("log:info", { message, ...data }, storageOptions);
    },
    warn(message: string, data: Record<string, unknown> = {}) {
      writeEvent("log:warn", { message, ...data }, storageOptions);
    },
    error(message: string, data: Record<string, unknown> = {}) {
      writeEvent("log:error", { message, ...data }, storageOptions);
    },
  };
}

/**
 * Capture a custom event to devtools storage
 *
 * @example
 * ```typescript
 * import { captureEvent } from "boune/devtools";
 *
 * // Capture an incoming request
 * captureEvent("request:in", { method: "POST", url: "/api/users" });
 *
 * // Capture an outgoing response
 * captureEvent("request:out", { status: 200, duration: 45 });
 * ```
 */
export function captureEvent(
  type: EventType,
  data: Record<string, unknown> = {},
  options: { dbPath?: string } = {},
): DevToolsEvent {
  const storageOptions: StorageOptions | undefined = options.dbPath
    ? { path: options.dbPath }
    : undefined;
  return writeEvent(type, data, storageOptions);
}

/**
 * Get the shared storage instance for direct access
 *
 * @example
 * ```typescript
 * import { getSharedStorage } from "boune/devtools";
 *
 * const storage = getSharedStorage();
 * const events = storage.query({ types: ["command:error"], limit: 10 });
 * ```
 */
export function getSharedStorage(options?: StorageOptions): DevToolsStorage {
  return getStorage(options);
}
