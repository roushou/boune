import type { DevToolsEvent, EventType } from "./types.ts";
import { SQL } from "bun";
import { mkdirSync } from "node:fs";

const DEFAULT_DB_PATH = ".boune/devtools.db";

export type StorageOptions = {
  /** Path to SQLite database file (default: .boune/devtools.db) */
  path?: string;
  /** Auto-create directory if it doesn't exist (default: true) */
  autoCreate?: boolean;
};

export type EventFilter = {
  /** Filter by event types */
  types?: EventType[];
  /** Filter events after this timestamp */
  after?: number;
  /** Filter events before this timestamp */
  before?: number;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Order by timestamp (default: desc) */
  order?: "asc" | "desc";
};

type EventRow = {
  id: string;
  type: EventType;
  timestamp: number;
  data: string;
};

/**
 * SQLite storage for devtools events using Bun's SQL API
 *
 * @example
 * ```typescript
 * import { DevToolsStorage } from "boune/devtools";
 *
 * const storage = await DevToolsStorage.create();
 *
 * // Write events from CLI
 * await storage.insert({
 *   id: crypto.randomUUID(),
 *   type: "command:start",
 *   timestamp: Date.now(),
 *   data: { command: "build" },
 * });
 *
 * // Read events in devtools server
 * const events = await storage.query({ limit: 100 });
 * ```
 */
export class DevToolsStorage {
  private db: SQL;
  private path: string;

  private constructor(db: SQL, path: string) {
    this.db = db;
    this.path = path;
  }

  /**
   * Create a new storage instance
   */
  static async create(options: StorageOptions = {}): Promise<DevToolsStorage> {
    const { path = DEFAULT_DB_PATH, autoCreate = true } = options;

    if (autoCreate) {
      const dir = path.substring(0, path.lastIndexOf("/"));
      if (dir) {
        mkdirSync(dir, { recursive: true });
      }
    }

    const db = new SQL(path);
    const storage = new DevToolsStorage(db, path);
    await storage.init();
    return storage;
  }

  /**
   * Initialize the database schema
   */
  private async init(): Promise<void> {
    await this.db`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch('now') * 1000)
      )
    `;
    await this.db`CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)`;
    await this.db`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC)`;
  }

  /**
   * Insert a single event
   */
  async insert(event: DevToolsEvent): Promise<void> {
    const data = JSON.stringify(event.data);
    await this.db`
      INSERT OR REPLACE INTO events (id, type, timestamp, data)
      VALUES (${event.id}, ${event.type}, ${event.timestamp}, ${data})
    `;
  }

  /**
   * Insert multiple events in a transaction
   */
  async insertMany(events: DevToolsEvent[]): Promise<void> {
    for (const event of events) {
      await this.insert(event);
    }
  }

  /**
   * Query events with filters
   */
  async query(filter: EventFilter = {}): Promise<DevToolsEvent[]> {
    const { types, after, before, limit = 1000, offset = 0, order = "desc" } = filter;

    let rows: EventRow[];

    // Simple query without type filtering (most common case)
    if (!types || types.length === 0) {
      if (after !== undefined && before !== undefined) {
        rows =
          order === "asc"
            ? await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE timestamp > ${after} AND timestamp < ${before}
                ORDER BY timestamp ASC LIMIT ${limit} OFFSET ${offset}
              `
            : await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE timestamp > ${after} AND timestamp < ${before}
                ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}
              `;
      } else if (after !== undefined) {
        rows =
          order === "asc"
            ? await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE timestamp > ${after}
                ORDER BY timestamp ASC LIMIT ${limit} OFFSET ${offset}
              `
            : await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE timestamp > ${after}
                ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}
              `;
      } else if (before !== undefined) {
        rows =
          order === "asc"
            ? await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE timestamp < ${before}
                ORDER BY timestamp ASC LIMIT ${limit} OFFSET ${offset}
              `
            : await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE timestamp < ${before}
                ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}
              `;
      } else {
        rows =
          order === "asc"
            ? await this.db`
                SELECT id, type, timestamp, data FROM events
                ORDER BY timestamp ASC LIMIT ${limit} OFFSET ${offset}
              `
            : await this.db`
                SELECT id, type, timestamp, data FROM events
                ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}
              `;
      }
    } else {
      // Query with type filtering - use IN clause with array
      if (after !== undefined && before !== undefined) {
        rows =
          order === "asc"
            ? await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE type IN (${types}) AND timestamp > ${after} AND timestamp < ${before}
                ORDER BY timestamp ASC LIMIT ${limit} OFFSET ${offset}
              `
            : await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE type IN (${types}) AND timestamp > ${after} AND timestamp < ${before}
                ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}
              `;
      } else if (after !== undefined) {
        rows =
          order === "asc"
            ? await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE type IN (${types}) AND timestamp > ${after}
                ORDER BY timestamp ASC LIMIT ${limit} OFFSET ${offset}
              `
            : await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE type IN (${types}) AND timestamp > ${after}
                ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}
              `;
      } else if (before !== undefined) {
        rows =
          order === "asc"
            ? await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE type IN (${types}) AND timestamp < ${before}
                ORDER BY timestamp ASC LIMIT ${limit} OFFSET ${offset}
              `
            : await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE type IN (${types}) AND timestamp < ${before}
                ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}
              `;
      } else {
        rows =
          order === "asc"
            ? await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE type IN (${types})
                ORDER BY timestamp ASC LIMIT ${limit} OFFSET ${offset}
              `
            : await this.db`
                SELECT id, type, timestamp, data FROM events
                WHERE type IN (${types})
                ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}
              `;
      }
    }

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      timestamp: row.timestamp,
      data: JSON.parse(row.data) as Record<string, unknown>,
    }));
  }

  /**
   * Get all events (alias for query with no filters)
   */
  async all(options: { limit?: number; order?: "asc" | "desc" } = {}): Promise<DevToolsEvent[]> {
    return this.query(options);
  }

  /**
   * Get events after a specific timestamp (for polling)
   */
  async since(timestamp: number): Promise<DevToolsEvent[]> {
    return this.query({ after: timestamp, order: "asc" });
  }

  /**
   * Get the latest event timestamp
   */
  async getLatestTimestamp(): Promise<number | null> {
    const rows = await this.db`SELECT MAX(timestamp) as latest FROM events`;
    return rows[0]?.latest ?? null;
  }

  /**
   * Get event count
   */
  async count(filter?: { types?: EventType[] }): Promise<number> {
    if (filter?.types && filter.types.length > 0) {
      const rows = await this
        .db`SELECT COUNT(*) as count FROM events WHERE type IN (${filter.types})`;
      return (rows[0] as { count: number }).count;
    }
    const rows = await this.db`SELECT COUNT(*) as count FROM events`;
    return (rows[0] as { count: number }).count;
  }

  /**
   * Clear all events
   */
  async clear(): Promise<void> {
    await this.db`DELETE FROM events`;
  }

  /**
   * Delete events older than a timestamp
   */
  async prune(before: number): Promise<number> {
    await this.db`DELETE FROM events WHERE timestamp < ${before}`;
    return 0;
  }

  /**
   * Get the database file path
   */
  getPath(): string {
    return this.path;
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }
}

// Singleton instance for convenience
let defaultStorage: DevToolsStorage | null = null;

/**
 * Get the default storage instance (creates one if needed)
 */
export async function getDefaultStorage(options?: StorageOptions): Promise<DevToolsStorage> {
  if (!defaultStorage) {
    defaultStorage = await DevToolsStorage.create(options);
  }
  return defaultStorage;
}

/**
 * Capture an event directly to storage
 *
 * @example
 * ```typescript
 * import { captureToStorage } from "boune/devtools";
 *
 * await captureToStorage("command:start", { command: "build" });
 * ```
 */
export async function captureToStorage(
  type: EventType,
  data: Record<string, unknown> = {},
  options?: StorageOptions,
): Promise<DevToolsEvent> {
  const storage = await getDefaultStorage(options);
  const event: DevToolsEvent = {
    id: crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    data,
  };
  await storage.insert(event);
  return event;
}
