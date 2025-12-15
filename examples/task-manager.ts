#!/usr/bin/env bun

/**
 * Task manager CLI demonstrating SQLite persistence with bun:sqlite
 */
import {
  argument,
  color,
  defineCli,
  defineCommand,
  option,
  table,
} from "../packages/boune/src/index.ts";

import { Database } from "bun:sqlite";

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
const list = defineCommand({
  name: "list",
  description: "List all tasks",
  aliases: ["ls"],
  options: {
    status: option.string().short("s").describe("Filter by status"),
    priority: option.string().short("p").describe("Filter by priority"),
    all: option.boolean().describe("Show all tasks including done"),
  },
  action({ options }) {
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
  },
});

// Add task
const add = defineCommand({
  name: "add",
  description: "Add a new task",
  arguments: {
    title: argument.string().describe("Task title"),
  },
  options: {
    priority: option
      .string()
      .short("p")
      .default("medium")
      .describe("Priority level (low, medium, high)"),
  },
  // Declarative prompts - called conditionally in action
  prompts: {
    title: { kind: "text", message: "Task title:" },
    priority: {
      kind: "select",
      message: "Priority:",
      options: [
        { label: "High", value: "high" },
        { label: "Medium", value: "medium" },
        { label: "Low", value: "low" },
      ] as const,
      default: "medium",
    },
  },
  async action({ args, options, prompts }) {
    // Prompt for title only if not provided as argument
    const title = args.title || (await prompts.title.run());

    // Prompt for priority only if using default
    const priority =
      options.priority !== "medium" ? options.priority : await prompts.priority.run();

    db.run("INSERT INTO tasks (title, priority) VALUES (?, ?)", [title, priority]);
    console.log(color.green(`Added task: ${title}`));
  },
});

// Update task status
const done = defineCommand({
  name: "done",
  description: "Mark task as done",
  arguments: {
    id: argument.number().required().describe("Task ID"),
  },
  action({ args }) {
    const result = db.run("UPDATE tasks SET status = 'done' WHERE id = ?", [args.id]);

    if (result.changes > 0) {
      console.log(color.green(`Task #${args.id} marked as done`));
    } else {
      console.error(color.red(`Task #${args.id} not found`));
    }
  },
});

// Start working on task
const start = defineCommand({
  name: "start",
  description: "Mark task as in-progress",
  arguments: {
    id: argument.number().required().describe("Task ID"),
  },
  action({ args }) {
    const result = db.run("UPDATE tasks SET status = 'in-progress' WHERE id = ?", [args.id]);

    if (result.changes > 0) {
      console.log(color.cyan(`Started working on task #${args.id}`));
    } else {
      console.error(color.red(`Task #${args.id} not found`));
    }
  },
});

// Remove task
const remove = defineCommand({
  name: "remove",
  description: "Remove a task",
  aliases: ["rm"],
  arguments: {
    id: argument.number().required().describe("Task ID"),
  },
  options: {
    force: option.boolean().short("f").describe("Skip confirmation"),
  },
  prompts: {
    confirm: { kind: "confirm", message: "Delete this task?", default: false },
  },
  async action({ args, options, prompts }) {
    const task = db.query("SELECT * FROM tasks WHERE id = ?").get(args.id) as Task | null;
    if (!task) {
      console.error(color.red(`Task #${args.id} not found`));
      return;
    }

    if (!options.force) {
      console.log(color.dim(`  Task: "${task.title}"`));
      const confirmed = await prompts.confirm.run();
      if (!confirmed) {
        console.log(color.dim("Cancelled"));
        return;
      }
    }

    db.run("DELETE FROM tasks WHERE id = ?", [args.id]);
    console.log(color.yellow(`Removed task #${args.id}`));
  },
});

// Clear completed tasks
const clear = defineCommand({
  name: "clear",
  description: "Remove all completed tasks",
  options: {
    force: option.boolean().short("f").describe("Skip confirmation"),
  },
  prompts: {
    confirm: { kind: "confirm", message: "Remove completed tasks?", default: false },
  },
  async action({ options, prompts }) {
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
      console.log(color.dim(`  Found ${count} completed task(s)`));
      const confirmed = await prompts.confirm.run();
      if (!confirmed) {
        console.log(color.dim("Cancelled"));
        return;
      }
    }

    db.run("DELETE FROM tasks WHERE status = 'done'");
    console.log(color.green(`Cleared ${count} completed task(s)`));
  },
});

function formatStatus(status: string): string {
  switch (status) {
    case "done":
      return color.green("done");
    case "in-progress":
      return color.cyan("working");
    default:
      return color.dim("pending");
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

defineCli({
  name: "tasks",
  version: "1.0.0",
  description: "Simple task manager",
  commands: {
    list,
    ls: list,
    add,
    done,
    start,
    remove,
    rm: remove,
    clear,
  },
}).run();
