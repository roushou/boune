#!/usr/bin/env bun

/**
 * HTTP client CLI demonstrating async operations and environment variables
 */
import { color, createSpinner, defineCli, defineCommand } from "../packages/boune/src/index.ts";

// GET request
const get = defineCommand({
  name: "get",
  description: "Make a GET request",
  arguments: {
    url: { type: "string", required: true, description: "URL to fetch" },
  },
  options: {
    header: { type: "string", short: "H", description: "Add header (can be repeated)" },
    output: { type: "string", short: "o", description: "Write response to file" },
    verbose: { type: "boolean", short: "v", description: "Show response headers" },
    json: { type: "boolean", description: "Parse response as JSON" },
  },
  async action({ args, options }) {
    const spinner = createSpinner(`GET ${args.url}`).start();

    try {
      const headers: Record<string, string> = {};
      if (options.header) {
        const [key, value] = options.header.split(":");
        if (key && value) headers[key.trim()] = value.trim();
      }

      const response = await fetch(args.url, { headers });

      if (options.verbose) {
        spinner.stop();
        console.log(color.cyan(`HTTP/${response.status} ${response.statusText}`));
        response.headers.forEach((value, key) => {
          console.log(color.dim(`${key}: ${value}`));
        });
        console.log("");
      }

      if (options.output) {
        const content = await response.arrayBuffer();
        await Bun.write(options.output, content);
        spinner.succeed(`Saved to ${options.output}`);
      } else if (options.json) {
        const json = await response.json();
        spinner.stop();
        console.log(JSON.stringify(json, null, 2));
      } else {
        const text = await response.text();
        spinner.stop();
        console.log(text);
      }
    } catch (err) {
      spinner.fail(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  },
});

// POST request
const post = defineCommand({
  name: "post",
  description: "Make a POST request",
  arguments: {
    url: { type: "string", required: true, description: "URL to post to" },
  },
  options: {
    data: { type: "string", short: "d", description: "Request body data" },
    file: { type: "string", short: "f", description: "Read body from file" },
    header: { type: "string", short: "H", description: "Add header" },
    contentType: {
      type: "string",
      short: "t",
      default: "application/json",
      description: "Content-Type header",
    },
    verbose: { type: "boolean", short: "v", description: "Show response headers" },
  },
  async action({ args, options }) {
    const spinner = createSpinner(`POST ${args.url}`).start();

    try {
      let body: string;
      if (options.file) {
        body = await Bun.file(options.file).text();
      } else if (options.data) {
        body = options.data;
      } else {
        spinner.fail("No data provided (use --data or --file)");
        process.exit(1);
      }

      const headers: Record<string, string> = {
        "Content-Type": options.contentType,
      };
      if (options.header) {
        const [key, value] = options.header.split(":");
        if (key && value) headers[key.trim()] = value.trim();
      }

      const response = await fetch(args.url, {
        method: "POST",
        headers,
        body,
      });

      spinner.stop();

      if (options.verbose) {
        console.log(color.cyan(`HTTP/${response.status} ${response.statusText}`));
        response.headers.forEach((value, key) => {
          console.log(color.dim(`${key}: ${value}`));
        });
        console.log("");
      }

      const text = await response.text();
      try {
        console.log(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        console.log(text);
      }
    } catch (err) {
      spinner.fail(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  },
});

// HEAD request
const head = defineCommand({
  name: "head",
  description: "Make a HEAD request (headers only)",
  arguments: {
    url: { type: "string", required: true, description: "URL to check" },
  },
  async action({ args }) {
    const spinner = createSpinner(`HEAD ${args.url}`).start();

    try {
      const response = await fetch(args.url, { method: "HEAD" });
      spinner.stop();

      console.log(color.cyan(`HTTP/${response.status} ${response.statusText}`));
      response.headers.forEach((value, key) => {
        console.log(`${color.bold(key)}: ${value}`);
      });
    } catch (err) {
      spinner.fail(`Request failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  },
});

// Download file
const download = defineCommand({
  name: "download",
  description: "Download a file",
  aliases: ["dl"],
  arguments: {
    url: { type: "string", required: true, description: "URL to download" },
    output: { type: "string", description: "Output filename" },
  },
  options: {
    quiet: { type: "boolean", short: "q", description: "Suppress progress output" },
  },
  async action({ args, options }) {
    const output = args.output || args.url.split("/").pop() || "download";

    const spinner = options.quiet ? null : createSpinner(`Downloading ${args.url}`).start();

    try {
      const response = await fetch(args.url);

      if (!response.ok) {
        spinner?.fail(`HTTP ${response.status}: ${response.statusText}`);
        process.exit(1);
      }

      const contentLength = response.headers.get("content-length");
      const _total = contentLength ? parseInt(contentLength, 10) : 0;

      const content = await response.arrayBuffer();
      await Bun.write(output, content);

      const size = formatSize(content.byteLength);
      spinner?.succeed(`Downloaded ${output} (${size})`);

      if (!options.quiet) {
        console.log(color.dim(`  URL: ${args.url}`));
        console.log(color.dim(`  Size: ${size}`));
      }
    } catch (err) {
      spinner?.fail(`Download failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  },
});

function formatSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(unit > 0 ? 1 : 0)} ${units[unit]}`;
}

void defineCli({
  name: "http",
  version: "1.0.0",
  description: "HTTP client CLI",
  globalOptions: {
    baseUrl: { type: "string", env: "HTTP_BASE_URL", description: "Base URL for requests" },
    timeout: {
      type: "number",
      default: 30000,
      env: "HTTP_TIMEOUT",
      description: "Request timeout",
    },
  },
  commands: {
    get,
    post,
    head,
    download,
    dl: download,
  },
}).run();
