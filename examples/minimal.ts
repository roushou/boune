#!/usr/bin/env bun

/**
 * Minimal CLI example - the simplest way to get started with boune
 */
import { defineCli, defineCommand } from "../packages/boune/src/index.ts";

// Define a simple command
const hello = defineCommand({
  name: "hello",
  description: "Say hello",
  action() {
    console.log("Hello, World!");
  },
});

// Create and run the CLI
const cli = defineCli({
  name: "minimal",
  version: "1.0.0",
  commands: { hello },
});

void cli.run();
