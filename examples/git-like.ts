#!/usr/bin/env bun

/**
 * Git-like CLI demonstrating subcommands and complex argument handling
 */
import { color, defineCli, defineCommand } from "../packages/boune/src/index.ts";

// git add <files...>
const add = defineCommand({
  name: "add",
  description: "Add file contents to the index",
  arguments: {
    files: { type: "string", required: true, variadic: true, description: "Files to add" },
  },
  options: {
    all: { type: "boolean", short: "A", description: "Add all changes" },
    patch: { type: "boolean", short: "p", description: "Interactively choose hunks" },
  },
  action({ args, options }) {
    if (options.all) {
      console.log(color.green("Adding all changes..."));
    } else {
      console.log(color.green(`Adding ${args.files.length} file(s):`));
      for (const file of args.files) {
        console.log(`  ${color.cyan("+")} ${file}`);
      }
    }
  },
});

// git commit
const commit = defineCommand({
  name: "commit",
  description: "Record changes to the repository",
  options: {
    message: { type: "string", short: "m", description: "Commit message" },
    all: { type: "boolean", short: "a", description: "Automatically stage modified files" },
    amend: { type: "boolean", description: "Amend previous commit" },
  },
  action({ options }) {
    if (!options.message && !options.amend) {
      console.error(color.red("error: no commit message provided"));
      process.exit(1);
    }
    if (options.amend) {
      console.log(color.yellow("Amending previous commit..."));
    }
    console.log(color.green(`Created commit: ${options.message || "(amend)"}`));
  },
});

// git status
const status = defineCommand({
  name: "status",
  description: "Show the working tree status",
  options: {
    short: { type: "boolean", short: "s", description: "Give output in short format" },
  },
  action({ options }) {
    if (options.short) {
      console.log("M  src/index.ts");
      console.log("?? new-file.ts");
    } else {
      console.log(color.bold("On branch main"));
      console.log("");
      console.log("Changes not staged for commit:");
      console.log(`  ${color.red("modified:")}   src/index.ts`);
      console.log("");
      console.log("Untracked files:");
      console.log(`  ${color.red("new-file.ts")}`);
    }
  },
});

// git log
const log = defineCommand({
  name: "log",
  description: "Show commit logs",
  options: {
    maxCount: { type: "number", short: "n", default: 10, description: "Limit number of commits" },
    oneline: { type: "boolean", description: "Show each commit on one line" },
  },
  action({ options }) {
    const commits = [
      { hash: "abc1234", msg: "feat: add user authentication", date: "2 hours ago" },
      { hash: "def5678", msg: "fix: resolve login bug", date: "1 day ago" },
      { hash: "ghi9012", msg: "chore: update dependencies", date: "3 days ago" },
    ];

    const count = Math.min(options.maxCount, commits.length);

    for (let i = 0; i < count; i++) {
      const c = commits[i]!;
      if (options.oneline) {
        console.log(`${color.yellow(c.hash)} ${c.msg}`);
      } else {
        console.log(color.yellow(`commit ${c.hash}`));
        console.log(`Date: ${c.date}`);
        console.log("");
        console.log(`    ${c.msg}`);
        console.log("");
      }
    }
  },
});

// git branch
const branch = defineCommand({
  name: "branch",
  description: "List, create, or delete branches",
  arguments: {
    name: { type: "string", description: "Branch name to create" },
  },
  options: {
    delete: { type: "boolean", short: "d", description: "Delete a branch" },
    all: { type: "boolean", short: "a", description: "List all branches" },
  },
  action({ args, options }) {
    if (options.delete && args.name) {
      console.log(color.green(`Deleted branch ${args.name}`));
    } else if (args.name) {
      console.log(color.green(`Created branch ${args.name}`));
    } else {
      console.log(`* ${color.green("main")}`);
      console.log("  feature/auth");
      console.log("  fix/login-bug");
      if (options.all) {
        console.log(`  ${color.red("remotes/origin/main")}`);
        console.log(`  ${color.red("remotes/origin/develop")}`);
      }
    }
  },
});

// git remote subcommands
const remoteAdd = defineCommand({
  name: "add",
  description: "Add a remote",
  arguments: {
    name: { type: "string", required: true, description: "Remote name" },
    url: { type: "string", required: true, description: "Remote URL" },
  },
  action({ args }) {
    console.log(color.green(`Added remote ${args.name} -> ${args.url}`));
  },
});

const remoteRemove = defineCommand({
  name: "remove",
  description: "Remove a remote",
  aliases: ["rm"],
  arguments: {
    name: { type: "string", required: true, description: "Remote name" },
  },
  action({ args }) {
    console.log(color.yellow(`Removed remote ${args.name}`));
  },
});

const remote = defineCommand({
  name: "remote",
  description: "Manage remote repositories",
  options: {
    verbose: { type: "boolean", short: "v", description: "Show remote URLs" },
  },
  subcommands: {
    add: remoteAdd,
    remove: remoteRemove,
    rm: remoteRemove,
  },
  action({ options }) {
    if (options.verbose) {
      console.log("origin  https://github.com/user/repo.git (fetch)");
      console.log("origin  https://github.com/user/repo.git (push)");
    } else {
      console.log("origin");
    }
  },
});

// Create CLI
void defineCli({
  name: "git-example",
  version: "1.0.0",
  description: "A git-like CLI example",
  commands: {
    add,
    commit,
    status,
    log,
    branch,
    remote,
  },
}).run();
