---
title: Devtools
description: Inspect and debug your CLI with the devtools dashboard.
---

Boune includes a built-in devtools dashboard for inspecting your CLI, capturing events, and viewing live documentation.

## Quick Setup

The easiest way to enable devtools is with the `withDevtools()` wrapper:

```typescript
import { defineCli, defineCommand } from "boune";
import { withDevtools } from "boune/devtools";

const deploy = defineCommand({
  name: "deploy",
  description: "Deploy the application",
  async action() {
    console.log("Deploying...");
  },
});

const cli = defineCli(
  withDevtools({
    name: "myapp",
    version: "1.0.0",
    commands: { deploy },
  }),
);

cli.run();
```

`withDevtools()` automatically adds:

- **Event capture middleware** - Records all command executions to SQLite
- **`devtools` command** - Starts the web dashboard

## Using the Dashboard

Start the devtools dashboard:

```bash
$ myapp devtools
⚡ Loading CLI from /path/to/app.ts
🚀 Devtools running at http://localhost:4000
```

The dashboard provides:

- **Overview** - CLI metadata and structure
- **Commands** - Browse all commands with their arguments and options
- **Events** - View captured command executions, errors, and logs

## Configuration Options

Customize devtools behavior:

```typescript
const cli = defineCli(
  withDevtools(
    {
      name: "myapp",
      commands: { deploy },
    },
    {
      // Default port for devtools server
      defaultPort: 3000,

      // Custom database path for event storage
      dbPath: ".myapp/events.db",

      // Capture events in production (default: false)
      captureInProduction: false,
    },
  ),
);
```

## Command Options

The `devtools` command accepts these options:

| Option    | Short | Description                 |
| --------- | ----- | --------------------------- |
| `--port`  | `-p`  | Server port (default: 4000) |
| `--entry` | `-e`  | CLI entry point             |
| `--open`  | `-o`  | Open browser automatically  |

```bash
$ myapp devtools --port 3000 --open
```

## Manual Setup

If you need more control, you can add the middleware and command separately:

```typescript
import { defineCli } from "boune";
import { createCaptureMiddleware, serveDevTools } from "boune/devtools";

const cli = defineCli({
  name: "myapp",
  commands: { deploy },
  middleware: [
    createCaptureMiddleware({
      dbPath: ".myapp/events.db",
      devOnly: true,
    }),
  ],
});

// Start devtools server manually
await serveDevTools(cli, { port: 4000 });
```

## Capture Middleware Options

Configure what events are captured:

```typescript
createCaptureMiddleware({
  // Database path (default: .boune/devtools.db)
  dbPath: ".myapp/events.db",

  // Only capture in development (default: true)
  devOnly: true,

  // Capture command start events (default: true)
  captureStart: true,

  // Capture command end events (default: true)
  captureEnd: true,

  // Capture command errors (default: true)
  captureErrors: true,

  // Additional metadata to include with events
  metadata: { version: "1.0.0" },
});
```

## Custom Event Logging

Log custom events to the devtools dashboard:

```typescript
import { captureEvent, createDevToolsLogger } from "boune/devtools";

// Capture a custom event
await captureEvent("api:request", {
  method: "POST",
  url: "/api/users",
  duration: 150,
});

// Or use the logger
const logger = createDevToolsLogger();
logger.info("Server started", { port: 3000 });
logger.warn("Deprecated API used");
logger.error("Connection failed", { error: err.message });
```

## Auto Documentation

Devtools also provides auto-generated documentation. If you just want the docs command without full devtools:

```typescript
import { defineCli } from "boune";
import { createDocsCommand } from "boune/docs";

const cli = defineCli({
  name: "myapp",
  commands: {
    docs: createDocsCommand(),
  },
});
```

```bash
$ myapp docs
# Serves documentation at http://localhost:4000
```

## Next Steps

- [Middleware](/docs/middleware) - Learn about middleware patterns
- [Testing](/docs/testing) - Test your CLI
- [Utilities](/docs/utilities) - Logger, update checker, and more
