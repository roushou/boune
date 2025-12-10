#!/usr/bin/env bun

/**
 * Git-like CLI demonstrating subcommands and complex argument handling
 */
import { cli, command, color } from "../packages/boune/src/index.ts";

// git add <files...>
const add = command("add")
  .description("Add file contents to the index")
  .argument("<files...>", "Files to add")
  .option("-A, --all", "Add all changes")
  .option("-p, --patch", "Interactively choose hunks")
  .action(({ args, options }) => {
    if (options.all) {
      console.log(color.green("Adding all changes..."));
    } else {
      console.log(color.green(`Adding ${args.files.length} file(s):`));
      for (const file of args.files) {
        console.log(`  ${color.cyan("+")} ${file}`);
      }
    }
  });

// git commit
const commit = command("commit")
  .description("Record changes to the repository")
  .option("-m, --message <msg>", "Commit message")
  .option("-a, --all", "Automatically stage modified files")
  .option("--amend", "Amend previous commit")
  .action(({ options }) => {
    if (!options.message && !options.amend) {
      console.error(color.red("error: no commit message provided"));
      process.exit(1);
    }
    if (options.amend) {
      console.log(color.yellow("Amending previous commit..."));
    }
    console.log(color.green(`Created commit: ${options.message || "(amend)"}`));
  });

// git status
const status = command("status")
  .description("Show the working tree status")
  .option("-s, --short", "Give output in short format")
  .action(({ options }) => {
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
  });

// git log
const log = command("log")
  .description("Show commit logs")
  .option("-n, --max-count <number>", "Limit number of commits", { type: "number", default: 10 })
  .option("--oneline", "Show each commit on one line")
  .action(({ options }) => {
    const commits = [
      { hash: "abc1234", msg: "feat: add user authentication", date: "2 hours ago" },
      { hash: "def5678", msg: "fix: resolve login bug", date: "1 day ago" },
      { hash: "ghi9012", msg: "chore: update dependencies", date: "3 days ago" },
    ];

    const count = Math.min(options["max-count"], commits.length);

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
  });

// git branch
const branch = command("branch")
  .description("List, create, or delete branches")
  .argument("[name]", "Branch name to create")
  .option("-d, --delete", "Delete a branch")
  .option("-a, --all", "List all branches")
  .action(({ args, options }) => {
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
  });

// git remote subcommands
const remoteAdd = command("add")
  .description("Add a remote")
  .argument("<name>", "Remote name")
  .argument("<url>", "Remote URL")
  .action(({ args }) => {
    console.log(color.green(`Added remote ${args.name} -> ${args.url}`));
  });

const remoteRemove = command("remove")
  .description("Remove a remote")
  .alias("rm")
  .argument("<name>", "Remote name")
  .action(({ args }) => {
    console.log(color.yellow(`Removed remote ${args.name}`));
  });

const remote = command("remote")
  .description("Manage remote repositories")
  .option("-v, --verbose", "Show remote URLs")
  .subcommand(remoteAdd)
  .subcommand(remoteRemove)
  .action(({ options }) => {
    if (options.verbose) {
      console.log("origin  https://github.com/user/repo.git (fetch)");
      console.log("origin  https://github.com/user/repo.git (push)");
    } else {
      console.log("origin");
    }
  });

// Create CLI
cli("git-example")
  .version("1.0.0")
  .description("A git-like CLI example")
  .command(add)
  .command(commit)
  .command(status)
  .command(log)
  .command(branch)
  .command(remote)
  .run();
