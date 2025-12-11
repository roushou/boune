#!/usr/bin/env bun

/**
 * Filepath prompt example - demonstrates interactive file/directory browser
 */
import { color } from "../packages/boune/src/index.ts";
import { filepath } from "../packages/boune/src/prompt/index.ts";

async function main() {
  console.log(color.bold("\nFilepath Prompt Examples\n"));

  // Basic file selection
  const anyFile = await filepath({
    message: "Select any file:",
  });
  console.log(color.dim(`  Selected: ${anyFile}\n`));

  // Filter by extension
  const tsFile = await filepath({
    message: "Select a TypeScript file:",
    extensions: [".ts", ".tsx"],
  });
  console.log(color.dim(`  Selected: ${tsFile}\n`));

  // Directory only
  const directory = await filepath({
    message: "Select a directory:",
    directoryOnly: true,
  });
  console.log(color.dim(`  Selected: ${directory}\n`));

  // With base path
  const srcFile = await filepath({
    message: "Select a source file:",
    basePath: "./packages/boune/src",
    extensions: [".ts"],
  });
  console.log(color.dim(`  Selected: ${srcFile}\n`));

  // Show hidden files
  const withHidden = await filepath({
    message: "Select a file (including hidden):",
    showHidden: true,
  });
  console.log(color.dim(`  Selected: ${withHidden}\n`));

  // Allow creating new file
  const newFile = await filepath({
    message: "Select or create a config file:",
    extensions: [".json", ".yaml", ".yml"],
    allowNew: true,
  });
  console.log(color.dim(`  Selected: ${newFile}\n`));

  // With validation
  const validatedFile = await filepath({
    message: "Select a package.json file:",
    validate: (path) => {
      if (!path.endsWith("package.json")) {
        return "Please select a package.json file";
      }
      return true;
    },
  });
  console.log(color.dim(`  Selected: ${validatedFile}\n`));

  // Summary
  console.log(color.bold("\nYour selections:"));
  console.log(`  Any file: ${anyFile}`);
  console.log(`  TypeScript: ${tsFile}`);
  console.log(`  Directory: ${directory}`);
  console.log(`  Source file: ${srcFile}`);
  console.log(`  With hidden: ${withHidden}`);
  console.log(`  New/existing: ${newFile}`);
  console.log(`  Validated: ${validatedFile}`);
  console.log();
}

main().catch(console.error);
