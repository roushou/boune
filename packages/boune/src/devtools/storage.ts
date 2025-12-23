import type { DevToolsEvent, EventType } from "./types.ts";
import { Database } from "bun:sqlite";
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
  private db: Database;
  private path: string;

  private constructor(db: Database, path: string) {
    this.db = db;
    this.path = path;
  }

  /**
   * Create a new storage instance
   */
  static create(options: StorageOptions = {}): DevToolsStorage {
    const { path = DEFAULT_DB_PATH, autoCreate = true } = options;

    if (autoCreate) {
      const dir = path.substring(0, path.lastIndexOf("/"));
      if (dir) {
        mkdirSync(dir, { recursive: true });
      }
    }

    const db = new Database(path);
    const storage = new DevToolsStorage(db, path);
    storage.init();
    return storage;
  }

  /**
   * Initialize the database schema
   */
  private init(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch('now') * 1000)
      )
    `);
    this.db.run("CREATE INDEX IF NOT EXISTS idx_events_type ON events(type)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC)");
  }

  /**
   * Insert a single event
   */
  insert(event: DevToolsEvent): void {
    const data = JSON.stringify(event.data);
    this.db.run("INSERT OR REPLACE INTO events (id, type, timestamp, data) VALUES (?, ?, ?, ?)", [
      event.id,
      event.type,
      event.timestamp,
      data,
    ]);
  }

  /**
   * Insert multiple events in a transaction
   */
  insertMany(events: DevToolsEvent[]): void {
    const insert = this.db.prepare(
      "INSERT OR REPLACE INTO events (id, type, timestamp, data) VALUES (?, ?, ?, ?)",
    );
    const transaction = this.db.transaction(() => {
      for (const event of events) {
        insert.run(event.id, event.type, event.timestamp, JSON.stringify(event.data));
      }
    });
    transaction();
  }

  /**
   * Query events with filters
   */
  query(filter: EventFilter = {}): DevToolsEvent[] {
    const { types, after, before, limit = 1000, offset = 0, order = "desc" } = filter;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (types && types.length > 0) {
      conditions.push(`type IN (${types.map(() => "?").join(", ")})`);
      params.push(...types);
    }

    if (after !== undefined) {
      conditions.push("timestamp > ?");
      params.push(after);
    }

    if (before !== undefined) {
      conditions.push("timestamp < ?");
      params.push(before);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const orderClause = order === "asc" ? "ORDER BY timestamp ASC" : "ORDER BY timestamp DESC";

    const sql = `SELECT id, type, timestamp, data FROM events ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const rows = this.db.query(sql).all(...params) as EventRow[];

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
  all(options: { limit?: number; order?: "asc" | "desc" } = {}): DevToolsEvent[] {
    return this.query(options);
  }

  /**
   * Get events after a specific timestamp (for polling)
   */
  since(timestamp: number): DevToolsEvent[] {
    return this.query({ after: timestamp, order: "asc" });
  }

  /**
   * Get the latest event timestamp
   */
  getLatestTimestamp(): number | null {
    const row = this.db.query("SELECT MAX(timestamp) as latest FROM events").get() as {
      latest: number | null;
    } | null;
    return row?.latest ?? null;
  }

  /**
   * Get event count
   */
  count(filter?: { types?: EventType[] }): number {
    if (filter?.types && filter.types.length > 0) {
      const placeholders = filter.types.map(() => "?").join(", ");
      const row = this.db
        .query(`SELECT COUNT(*) as count FROM events WHERE type IN (${placeholders})`)
        .get(...filter.types) as { count: number };
      return row.count;
    }
    const row = this.db.query("SELECT COUNT(*) as count FROM events").get() as { count: number };
    return row.count;
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.db.run("DELETE FROM events");
  }

  /**
   * Delete events older than a timestamp
   */
  prune(before: number): number {
    const result = this.db.run("DELETE FROM events WHERE timestamp < ?", [before]);
    return result.changes;
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
export function getDefaultStorage(options?: StorageOptions): DevToolsStorage {
  if (!defaultStorage) {
    defaultStorage = DevToolsStorage.create(options);
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
 * captureToStorage("command:start", { command: "build" });
 * ```
 */
export function captureToStorage(
  type: EventType,
  data: Record<string, unknown> = {},
  options?: StorageOptions,
): DevToolsEvent {
  const storage = getDefaultStorage(options);
  const event: DevToolsEvent = {
    id: crypto.randomUUID(),
    type,
    timestamp: Date.now(),
    data,
  };
  storage.insert(event);
  return event;
}
