import type { DevToolsEvent, DevToolsOptions } from "./types.ts";
import { DevToolsStorage, type StorageOptions } from "./storage.ts";
import type { Cli } from "../runtime/cli.ts";
import type { ServerWebSocket } from "bun";
import { color } from "../output/color.ts";
import { extractCliInfo } from "../docs/extract.ts";
import { renderDocsPage } from "./pages/docs.ts";
import { renderEventsPage } from "./pages/events.ts";
import { renderOverviewPage } from "./pages/overview.ts";

type WebSocketData = {
  id: string;
};

export type DevServerOptions = DevToolsOptions & {
  /** Path to SQLite database (default: .boune/devtools.db) */
  dbPath?: string;
  /** Poll interval in ms for checking new events (default: 100) */
  pollInterval?: number;
};

/**
 * Create and start the devtools server
 *
 * @example
 * ```typescript
 * import { defineCli } from "boune";
 * import { createDevServer } from "boune/devtools";
 *
 * const cli = defineCli({ ... });
 *
 * // Start the devtools dashboard
 * const devtools = await createDevServer(cli, { port: 4000 });
 *
 * // Events are automatically read from .boune/devtools.db
 * // Use createCaptureMiddleware() in your CLI to capture events
 * ```
 */
export async function createDevServer(cli: Cli, options: DevServerOptions = {}) {
  const cliInfo = extractCliInfo(cli);
  const clients = new Set<ServerWebSocket<WebSocketData>>();

  const resolvedOptions = {
    port: options.port ?? 4000,
    open: options.open ?? false,
    capture: options.capture ?? true,
    dbPath: options.dbPath,
    pollInterval: options.pollInterval ?? 100,
  };

  // Initialize storage
  const storageOptions: StorageOptions | undefined = resolvedOptions.dbPath
    ? { path: resolvedOptions.dbPath }
    : undefined;
  const storage = await DevToolsStorage.create(storageOptions);

  // Track the last event timestamp for polling
  let lastEventTimestamp = (await storage.getLatestTimestamp()) ?? 0;

  /**
   * Broadcast a message to all connected WebSocket clients
   */
  function broadcast(message: string) {
    for (const client of clients) {
      client.send(message);
    }
  }

  /**
   * Check for new events and broadcast them
   */
  async function pollForNewEvents() {
    const newEvents = await storage.since(lastEventTimestamp);
    if (newEvents.length > 0) {
      for (const event of newEvents) {
        broadcast(JSON.stringify({ type: "event", event }));
        if (event.timestamp > lastEventTimestamp) {
          lastEventTimestamp = event.timestamp;
        }
      }
    }
  }

  // Start polling for new events
  const pollTimer = setInterval(pollForNewEvents, resolvedOptions.pollInterval);

  const server = Bun.serve<WebSocketData>({
    port: resolvedOptions.port,

    async fetch(req, server) {
      const url = new URL(req.url);
      const path = url.pathname;

      // WebSocket upgrade
      if (path === "/ws") {
        const upgraded = server.upgrade(req, {
          data: { id: crypto.randomUUID() },
        });
        if (upgraded) return undefined;
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      // Get current events from storage
      const events = await storage.all({ order: "asc" });

      // Route to pages
      if (path === "/" || path === "/overview") {
        return html(renderOverviewPage(cliInfo, events));
      }

      if (path === "/docs") {
        return html(renderDocsPage(cliInfo));
      }

      if (path === "/events") {
        return html(renderEventsPage(cliInfo, events));
      }

      // API endpoints
      if (path === "/api/events" && req.method === "GET") {
        const limitParam = url.searchParams.get("limit");
        const limit = limitParam ? parseInt(limitParam, 10) : 1000;
        return json(await storage.query({ limit }));
      }

      if (path === "/api/events" && req.method === "DELETE") {
        await storage.clear();
        lastEventTimestamp = 0;
        broadcast(JSON.stringify({ type: "clear" }));
        return json({ success: true });
      }

      if (path === "/api/stats" && req.method === "GET") {
        return json({
          totalEvents: await storage.count(),
          commands: await storage.count({
            types: ["command:start", "command:end", "command:error"],
          }),
          requests: await storage.count({ types: ["request:in", "request:out"] }),
          logs: await storage.count({ types: ["log:info", "log:warn", "log:error"] }),
        });
      }

      return new Response("Not found", { status: 404 });
    },

    websocket: {
      async open(ws) {
        clients.add(ws);
        // Send current events on connect
        const events = await storage.all({ order: "asc" });
        ws.send(JSON.stringify({ type: "init", events }));
      },
      close(ws) {
        clients.delete(ws);
      },
      message(ws, message) {
        // Handle incoming messages if needed
        try {
          const data = JSON.parse(String(message)) as { type: string };
          if (data.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          }
        } catch {
          // Ignore invalid messages
        }
      },
    },
  });

  console.log("");
  console.log(color.cyan("  ⚡ DevTools server running!"));
  console.log("");
  console.log(`  ${color.bold("Dashboard:")}  http://${server.hostname}:${server.port}`);
  console.log(`  ${color.bold("Docs:")}       http://${server.hostname}:${server.port}/docs`);
  console.log(`  ${color.bold("Events:")}     http://${server.hostname}:${server.port}/events`);
  console.log(`  ${color.bold("WebSocket:")}  ws://${server.hostname}:${server.port}/ws`);
  console.log("");
  console.log(color.dim(`  Database: ${storage.getPath()}`));
  console.log(color.dim("  Press Ctrl+C to stop"));
  console.log("");

  if (resolvedOptions.open) {
    const openCmd =
      process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    Bun.spawn([openCmd, `http://${server.hostname}:${server.port}`]);
  }

  return {
    server,
    cliInfo,
    storage,
    clients,
    options: resolvedOptions,

    /**
     * Manually capture an event (writes to SQLite)
     */
    async capture(type: DevToolsEvent["type"], data: Record<string, unknown> = {}) {
      if (!resolvedOptions.capture) return;

      const event: DevToolsEvent = {
        id: crypto.randomUUID(),
        type,
        timestamp: Date.now(),
        data,
      };
      await storage.insert(event);
      return event;
    },

    /**
     * Broadcast a message to all connected clients
     */
    broadcast,

    /**
     * Clear all captured events
     */
    async clearEvents() {
      await storage.clear();
      lastEventTimestamp = 0;
      broadcast(JSON.stringify({ type: "clear" }));
    },

    /**
     * Get all events from storage
     */
    async getEvents() {
      return storage.all({ order: "asc" });
    },

    /**
     * Stop the server
     */
    stop() {
      clearInterval(pollTimer);
      storage.close();
      server.stop();
    },
  };
}

/**
 * Start devtools and wait indefinitely (for CLI usage)
 */
export async function serveDevTools(cli: Cli, options: DevServerOptions = {}): Promise<void> {
  await createDevServer(cli, options);
  await new Promise(() => {});
}

function html(content: string): Response {
  return new Response(content, {
    headers: { "Content-Type": "text/html" },
  });
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
