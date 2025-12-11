#!/usr/bin/env bun

/**
 * HTTP client CLI demonstrating async operations and environment variables
 */
import { cli, command, color, createSpinner } from "../packages/boune/src/index.ts";

// GET request
const get = command("get")
  .description("Make a GET request")
  .argument({ name: "url", kind: "string", required: true, description: "URL to fetch" })
  .option({
    name: "header",
    short: "H",
    kind: "string",
    description: "Add header (can be repeated)",
  })
  .option({ name: "output", short: "o", kind: "string", description: "Write response to file" })
  .option({ name: "verbose", short: "v", kind: "boolean", description: "Show response headers" })
  .option({ name: "json", kind: "boolean", description: "Parse response as JSON" })
  .action(async ({ args, options }) => {
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
      spinner.fail(`Request failed: ${err}`);
      process.exit(1);
    }
  });

// POST request
const post = command("post")
  .description("Make a POST request")
  .argument({ name: "url", kind: "string", required: true, description: "URL to post to" })
  .option({ name: "data", short: "d", kind: "string", description: "Request body data" })
  .option({ name: "file", short: "f", kind: "string", description: "Read body from file" })
  .option({ name: "header", short: "H", kind: "string", description: "Add header" })
  .option({
    name: "contentType",
    short: "t",
    kind: "string",
    default: "application/json",
    description: "Content-Type header",
  })
  .option({ name: "verbose", short: "v", kind: "boolean", description: "Show response headers" })
  .action(async ({ args, options }) => {
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
      spinner.fail(`Request failed: ${err}`);
      process.exit(1);
    }
  });

// HEAD request
const head = command("head")
  .description("Make a HEAD request (headers only)")
  .argument({ name: "url", kind: "string", required: true, description: "URL to check" })
  .action(async ({ args }) => {
    const spinner = createSpinner(`HEAD ${args.url}`).start();

    try {
      const response = await fetch(args.url, { method: "HEAD" });
      spinner.stop();

      console.log(color.cyan(`HTTP/${response.status} ${response.statusText}`));
      response.headers.forEach((value, key) => {
        console.log(`${color.bold(key)}: ${value}`);
      });
    } catch (err) {
      spinner.fail(`Request failed: ${err}`);
      process.exit(1);
    }
  });

// Download file
const download = command("download")
  .description("Download a file")
  .alias("dl")
  .argument({ name: "url", kind: "string", required: true, description: "URL to download" })
  .argument({ name: "output", kind: "string", required: false, description: "Output filename" })
  .option({ name: "quiet", short: "q", kind: "boolean", description: "Suppress progress output" })
  .action(async ({ args, options }) => {
    const output = args.output || args.url.split("/").pop() || "download";

    const spinner = options.quiet ? null : createSpinner(`Downloading ${args.url}`).start();

    try {
      const response = await fetch(args.url);

      if (!response.ok) {
        spinner?.fail(`HTTP ${response.status}: ${response.statusText}`);
        process.exit(1);
      }

      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      const content = await response.arrayBuffer();
      await Bun.write(output, content);

      const size = formatSize(content.byteLength);
      spinner?.succeed(`Downloaded ${output} (${size})`);

      if (!options.quiet) {
        console.log(color.dim(`  URL: ${args.url}`));
        console.log(color.dim(`  Size: ${size}`));
      }
    } catch (err) {
      spinner?.fail(`Download failed: ${err}`);
      process.exit(1);
    }
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

cli("http")
  .version("1.0.0")
  .description("HTTP client CLI")
  .option({
    name: "baseUrl",
    kind: "string",
    description: "Base URL for requests",
    env: "HTTP_BASE_URL",
  })
  .option({
    name: "timeout",
    kind: "number",
    default: 30000,
    description: "Request timeout",
    env: "HTTP_TIMEOUT",
  })
  .command(get)
  .command(post)
  .command(head)
  .command(download)
  .run();
