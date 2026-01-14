---
title: Output & Styling
description: Format CLI output with colors, spinners, progress bars, and more.
---

Boune provides utilities for creating beautiful and informative CLI output.

## Colors

Apply colors to terminal output:

```typescript
import { color } from "boune/output";

console.log(color.red("Error!"));
console.log(color.green("Success!"));
console.log(color.yellow("Warning"));
console.log(color.blue("Info"));
console.log(color.cyan("Highlight"));
console.log(color.magenta("Special"));
console.log(color.gray("Muted text"));
```

### Text Styles

```typescript
console.log(color.bold("Bold text"));
console.log(color.dim("Dimmed text"));
console.log(color.underline("Underlined text"));
```

### Combining Styles

```typescript
console.log(color.bold(color.red("Bold red error")));
console.log(color.underline(color.cyan("Important link")));
```

### Color Detection

Colors are automatically disabled when:

- `NO_COLOR` environment variable is set
- Output is not a TTY (piped or redirected)

Force colors with `FORCE_COLOR=1`.

```typescript
import { supportsColor } from "boune/output";

if (supportsColor()) {
  console.log(color.green("Colored output"));
} else {
  console.log("Plain output");
}
```

## Message Formatting

Pre-styled message helpers:

```typescript
import { error, warning, success, info } from "boune/output";

console.log(error("Something went wrong")); // error: Something went wrong
console.log(warning("Deprecated feature")); // warning: Deprecated feature
console.log(success("Build completed")); // success: Build completed
console.log(info("Processing files...")); // info: Processing files...
```

## Spinners

Show progress for async operations:

```typescript
import { createSpinner } from "boune/output";

const spinner = createSpinner("Loading data...").start();

try {
  await fetchData();
  spinner.succeed("Data loaded successfully");
} catch (err) {
  spinner.fail("Failed to load data");
}
```

### Spinner Methods

| Method            | Description                         |
| ----------------- | ----------------------------------- |
| `.start()`        | Start the spinner animation         |
| `.stop(text?)`    | Stop and optionally show final text |
| `.succeed(text?)` | Stop with success checkmark         |
| `.fail(text?)`    | Stop with failure X                 |

### Example: Multi-step Process

```typescript
async function deploy() {
  const spinner = createSpinner("Building project...").start();

  await build();
  spinner.stop("Build complete");

  const uploadSpinner = createSpinner("Uploading files...").start();

  await upload();
  uploadSpinner.succeed("Deployed successfully!");
}
```

## Progress Bars

Track progress through a series of steps:

```typescript
import { createProgressBar } from "boune/output";

const bar = createProgressBar("Processing files", {
  total: 100,
  width: 40,
});

for (let i = 0; i <= 100; i++) {
  await processFile(i);
  bar.update(i);
}

bar.complete("All files processed");
```

### Progress Bar Options

| Option        | Type      | Default | Description                  |
| ------------- | --------- | ------- | ---------------------------- |
| `total`       | `number`  | `100`   | Total steps                  |
| `width`       | `number`  | `40`    | Bar width in characters      |
| `complete`    | `string`  | `"█"`   | Completed portion character  |
| `incomplete`  | `string`  | `"░"`   | Incomplete portion character |
| `showPercent` | `boolean` | `true`  | Show percentage              |
| `showCount`   | `boolean` | `true`  | Show count (e.g., "5/10")    |

### Progress Bar Methods

| Method                       | Description                      |
| ---------------------------- | -------------------------------- |
| `.update(n, text?)`          | Set progress to value            |
| `.increment(amount?, text?)` | Increment by amount (default: 1) |
| `.complete(text?)`           | Complete with success            |
| `.fail(text?)`               | Stop with failure                |
| `.stop()`                    | Stop and clear                   |

### Example: File Processing

```typescript
const files = await glob("**/*.ts");
const bar = createProgressBar("Compiling", { total: files.length });

for (const file of files) {
  await compile(file);
  bar.increment(1, file);
}

bar.complete("Compilation finished");
```

## Tables

Format tabular data:

```typescript
import { table } from "boune/output";

const data = [
  ["Name", "Version", "Size"],
  ["react", "18.2.0", "2.5kb"],
  ["vue", "3.3.4", "3.2kb"],
  ["svelte", "4.0.0", "1.8kb"],
];

console.log(table(data));
```

Output:

```
Name    Version  Size
react   18.2.0   2.5kb
vue     3.3.4    3.2kb
svelte  4.0.0    1.8kb
```

### Table Options

```typescript
table(data, { padding: 4 }); // More space between columns
```

## Lists

Format bullet lists:

```typescript
import { list } from "boune/output";

const items = ["Install dependencies", "Build project", "Run tests"];

console.log(list(items));
```

Output:

```
• Install dependencies
• Build project
• Run tests
```

### Custom Bullet

```typescript
console.log(list(items, "→")); // Use arrow instead of bullet
console.log(list(items, "-")); // Use dash
```

## Key-Value Pairs

Format aligned key-value output:

```typescript
import { keyValue } from "boune/output";

const info = {
  Name: "my-project",
  Version: "1.0.0",
  Author: "John Doe",
  License: "MIT",
};

console.log(keyValue(info));
```

Output:

```
Name   : my-project
Version: 1.0.0
Author : John Doe
License: MIT
```

### Custom Separator

```typescript
console.log(keyValue(info, " = ")); // Use = instead of :
```

## Complete Example

```typescript
import { defineCommand } from "boune";
import { color, createSpinner, createProgressBar, success, error, keyValue } from "boune/output";

const deploy = defineCommand({
  name: "deploy",
  async action() {
    console.log(color.bold("\nDeployment Starting\n"));

    // Build step
    const buildSpinner = createSpinner("Building project...").start();
    await build();
    buildSpinner.succeed("Build completed");

    // Upload step
    const files = await getFiles();
    const progress = createProgressBar("Uploading", { total: files.length });

    for (const file of files) {
      await uploadFile(file);
      progress.increment();
    }
    progress.complete("Upload finished");

    // Summary
    console.log("\n" + color.bold("Deployment Summary"));
    console.log(
      keyValue({
        Environment: "production",
        Files: files.length.toString(),
        Duration: "45s",
      }),
    );

    console.log("\n" + success("Deployed successfully!"));
  },
});
```

## Next Steps

- [Shell Completions](/docs/completions) - Generate shell scripts
- [Testing](/docs/testing) - Test your CLI
