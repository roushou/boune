---
title: Utilities
description: Extra utilities for building robust CLI applications.
---

Boune provides additional utilities in the `boune/x/*` namespace for common CLI tasks.

## Logger

Leveled logging with colors and prefixes:

```typescript
import { createLogger } from "boune/x/logger";

const log = createLogger({ level: "debug" });

log.debug("Parsing arguments...");
log.info("Server started on :3000");
log.warn("Config file not found, using defaults");
log.error("Failed to connect to database");
log.success("Build complete!");
```

### Child Loggers

Create prefixed child loggers for different modules:

```typescript
const httpLog = log.child("http");
httpLog.info("Request received"); // → [http] info: Request received

const dbLog = log.child("db");
dbLog.error("Connection failed"); // → [db] error: Connection failed
```

### Logger Options

| Option      | Type       | Default  | Description              |
| ----------- | ---------- | -------- | ------------------------ |
| `level`     | `LogLevel` | `"info"` | Minimum level to display |
| `prefix`    | `string`   | -        | Prefix for all messages  |
| `timestamp` | `boolean`  | `false`  | Show timestamps          |

Log levels: `debug`, `info`, `warn`, `error`, `silent`

### One-shot Functions

For quick logging without creating an instance:

```typescript
import { logInfo, logError, logWarn, logSuccess, logDebug } from "boune/x/logger";

logInfo("Starting server...");
logError("Connection failed");
```

### Format Functions

Get formatted strings without printing:

```typescript
import { formatError, formatSuccess } from "boune/x/logger";

const msg = formatError("Something went wrong");
// Returns colored string, doesn't print
```

## Open

Open URLs and files in the default application:

```typescript
import { open, openBrowser, openInFileManager, openInEditor } from "boune/x/open";

// Open URL in default browser
await open("https://example.com");

// Open file in default app
await open("./document.pdf");

// Open with specific app (macOS)
await open("./project", { app: "Visual Studio Code" });

// Wait for app to close
await open("./file.txt", { wait: true });
```

### Convenience Functions

```typescript
// Open URL in browser
await openBrowser("https://docs.myapp.com");

// Open in file manager (Finder/Explorer)
await openInFileManager("./dist");

// Open in specific editor
await openInEditor("./src/index.ts", "code"); // VS Code
await openInEditor("./src/index.ts", "vim"); // Vim
```

### Open Options

| Option       | Type       | Description                     |
| ------------ | ---------- | ------------------------------- |
| `app`        | `string`   | Open with specific app          |
| `args`       | `string[]` | Arguments to pass to the app    |
| `wait`       | `boolean`  | Wait for app to close           |
| `background` | `boolean`  | Open in background (macOS only) |

## Update Checker

Check for CLI updates from npm registry:

```typescript
import { checkForUpdates } from "boune/x/update-checker";

const update = await checkForUpdates({
  packageName: "my-cli",
  currentVersion: "1.0.0",
});

if (update) {
  console.log(`Update available: ${update.current} → ${update.latest}`);
  console.log("Run: npm install -g my-cli");
}
```

### Features

- Non-blocking (won't slow down CLI startup)
- Cached (checks at most once per 24 hours by default)
- Never throws (fails silently)

### Options

| Option           | Type     | Default              | Description           |
| ---------------- | -------- | -------------------- | --------------------- |
| `packageName`    | `string` | required             | npm package name      |
| `currentVersion` | `string` | required             | Current CLI version   |
| `cacheDir`       | `string` | `~/.cache/{package}` | Cache directory       |
| `checkInterval`  | `number` | `86400000` (24h)     | Check interval in ms  |
| `registryUrl`    | `string` | `registry.npmjs.org` | npm registry URL      |
| `timeout`        | `number` | `3000`               | Request timeout in ms |

## Doctor

Run diagnostic health checks for your CLI:

```typescript
import { createDoctor, check, checks } from "boune/x/doctor";

const doctor = createDoctor({
  name: "myapp",
  checks: [
    checks.bunVersion("1.0.0"),
    checks.commandExists("git"),
    checks.fileExists("./config.json"),
    checks.envVar("API_KEY", { required: true }),
    check("API reachable", async () => {
      const res = await fetch("https://api.example.com/health");
      if (!res.ok) return { status: "error", message: "API unreachable" };
      return { status: "ok", message: "Connected" };
    }),
  ],
});

const result = await doctor.run();
process.exit(result.failed > 0 ? 1 : 0);
```

Output:

```
myapp doctor

  ✓ Bun version — 1.1.0
  ✓ git installed — /usr/bin/git
  ⚠ File exists: ./config.json — Not found
  ✓ Env: API_KEY — ab...xy
  ✓ API reachable — Connected

  4 passed, 1 warnings
```

### Built-in Checks

| Check           | Description                          |
| --------------- | ------------------------------------ |
| `bunVersion`    | Check Bun version meets minimum      |
| `commandExists` | Check if command exists in PATH      |
| `fileExists`    | Check if file exists                 |
| `envVar`        | Check if environment variable is set |
| `urlReachable`  | Check if URL is reachable            |
| `diskSpace`     | Check available disk space           |

### Custom Checks

```typescript
import { check } from "boune/x/doctor";

const dbCheck = check("Database connection", async () => {
  try {
    await db.connect();
    return { status: "ok", message: "Connected" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
});
```

### Check Statuses

- `ok` - Check passed (green checkmark)
- `warn` - Warning (yellow triangle)
- `error` - Check failed (red X)
- `skip` - Check skipped (gray circle)

### Doctor Options

| Option     | Type      | Description           |
| ---------- | --------- | --------------------- |
| `name`     | `string`  | CLI name for header   |
| `checks`   | `Check[]` | List of checks to run |
| `failFast` | `boolean` | Stop on first error   |

## Next Steps

- [Testing](/docs/testing) - Test your CLI
- [Devtools](/docs/devtools) - Inspect and debug your CLI
