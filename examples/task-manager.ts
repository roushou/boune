#!/usr/bin/env bun

/**
 * Task manager CLI demonstrating SQLite persistence with bun:sqlite
 */
import { Database } from "bun:sqlite";
import { cli, command, color, table } from "../packages/boune/src/index.ts";
import { text, select, confirm } from "../packages/boune/src/prompt/index.ts";

// Initialize database
const db = new Database(":memory:");
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed some example data
db.run(
  `INSERT INTO tasks (title, status, priority) VALUES ('Build CLI framework', 'done', 'high')`,
);
db.run(
  `INSERT INTO tasks (title, status, priority) VALUES ('Write documentation', 'pending', 'medium')`,
);
db.run(
  `INSERT INTO tasks (title, status, priority) VALUES ('Add more examples', 'in-progress', 'low')`,
);

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

// List tasks
const list = command("list")
  .description("List all tasks")
  .alias("ls")
  .option({ name: "status", short: "s", kind: "string", description: "Filter by status" })
  .option({ name: "priority", short: "p", kind: "string", description: "Filter by priority" })
  .option({ name: "all", kind: "boolean", description: "Show all tasks including done" })
  .action(({ options }) => {
    let query = "SELECT * FROM tasks";
    const conditions: string[] = [];
    const params: string[] = [];

    if (options.status) {
      conditions.push("status = ?");
      params.push(options.status);
    } else if (!options.all) {
      conditions.push("status != 'done'");
    }

    if (options.priority) {
      conditions.push("priority = ?");
      params.push(options.priority);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END";

    const tasks = db.query(query).all(...params) as Task[];

    if (tasks.length === 0) {
      console.log(color.dim("No tasks found"));
      return;
    }

    const rows = tasks.map((t) => [
      color.dim(`#${t.id}`),
      formatStatus(t.status),
      formatPriority(t.priority),
      t.title,
    ]);

    console.log(table([["ID", "Status", "Priority", "Title"], ...rows]));
  });

// Add task
const add = command("add")
  .description("Add a new task")
  .argument({ name: "title", kind: "string", required: false, description: "Task title" })
  .option({
    name: "priority",
    short: "p",
    kind: "string",
    default: "medium",
    description: "Priority level (low, medium, high)",
  })
  .action(async ({ args, options }) => {
    let title = args.title;

    if (!title) {
      title = await text({
        message: "Task title:",
        validate: (v) => (v.length > 0 ? true : "Title is required"),
      });
    }

    const priority =
      options.priority ||
      (await select({
        message: "Priority:",
        options: [
          { label: "High", value: "high" },
          { label: "Medium", value: "medium" },
          { label: "Low", value: "low" },
        ],
        default: "medium",
      }));

    db.run("INSERT INTO tasks (title, priority) VALUES (?, ?)", [title, priority]);
    console.log(color.green(`Added task: ${title}`));
  });

// Update task status
const done = command("done")
  .description("Mark task as done")
  .argument({ name: "id", kind: "number", required: true, description: "Task ID" })
  .action(({ args }) => {
    const result = db.run("UPDATE tasks SET status = 'done' WHERE id = ?", [args.id]);

    if (result.changes > 0) {
      console.log(color.green(`Task #${args.id} marked as done`));
    } else {
      console.error(color.red(`Task #${args.id} not found`));
    }
  });

// Start working on task
const start = command("start")
  .description("Mark task as in-progress")
  .argument({ name: "id", kind: "number", required: true, description: "Task ID" })
  .action(({ args }) => {
    const result = db.run("UPDATE tasks SET status = 'in-progress' WHERE id = ?", [args.id]);

    if (result.changes > 0) {
      console.log(color.cyan(`Started working on task #${args.id}`));
    } else {
      console.error(color.red(`Task #${args.id} not found`));
    }
  });

// Remove task
const remove = command("remove")
  .description("Remove a task")
  .alias("rm")
  .argument({ name: "id", kind: "number", required: true, description: "Task ID" })
  .option({ name: "force", short: "f", kind: "boolean", description: "Skip confirmation" })
  .action(async ({ args, options }) => {
    const task = db.query("SELECT * FROM tasks WHERE id = ?").get(args.id) as Task | null;
    if (!task) {
      console.error(color.red(`Task #${args.id} not found`));
      return;
    }

    if (!options.force) {
      const confirmed = await confirm({
        message: `Delete task "${task.title}"?`,
        default: false,
      });
      if (!confirmed) {
        console.log(color.dim("Cancelled"));
        return;
      }
    }

    db.run("DELETE FROM tasks WHERE id = ?", [args.id]);
    console.log(color.yellow(`Removed task #${args.id}`));
  });

// Clear completed tasks
const clear = command("clear")
  .description("Remove all completed tasks")
  .option({ name: "force", short: "f", kind: "boolean", description: "Skip confirmation" })
  .action(async ({ options }) => {
    const count = (
      db.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'done'").get() as {
        count: number;
      }
    ).count;

    if (count === 0) {
      console.log(color.dim("No completed tasks to clear"));
      return;
    }

    if (!options.force) {
      const confirmed = await confirm({
        message: `Remove ${count} completed task(s)?`,
        default: false,
      });
      if (!confirmed) {
        console.log(color.dim("Cancelled"));
        return;
      }
    }

    db.run("DELETE FROM tasks WHERE status = 'done'");
    console.log(color.green(`Cleared ${count} completed task(s)`));
  });

function formatStatus(status: string): string {
  switch (status) {
    case "done":
      return color.green("✓ done");
    case "in-progress":
      return color.cyan("⏳ working");
    default:
      return color.dim("○ pending");
  }
}

function formatPriority(priority: string): string {
  switch (priority) {
    case "high":
      return color.red("high");
    case "low":
      return color.dim("low");
    default:
      return color.yellow("medium");
  }
}

cli("tasks")
  .version("1.0.0")
  .description("Simple task manager")
  .command(list)
  .command(add)
  .command(done)
  .command(start)
  .command(remove)
  .command(clear)
  .run();
