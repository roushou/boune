# boune

A declarative, TypeScript-first CLI framework powered by [Bun](https://bun.sh).

## Features

- **TypeScript-first** - Full type inference for commands, arguments, and options
- **Declarative API** - Schema-based pattern for defining CLIs
- **Subcommands** - Nested command hierarchies with aliases
- **Interactive prompts** - Text, password, select, confirm, and more
- **Output utilities** - Colors, tables, spinners
- **Devtools** - Web dashboard for CLI inspection and debugging
- **Zero dependencies** - Powered by Bun

## Installation

```bash
bun add boune
```

## Quick Start

```ts
import { defineCli, defineCommand } from "boune";

const greet = defineCommand({
  name: "greet",
  description: "Greet someone",
  arguments: {
    name: { type: "string", required: true, description: "Name to greet" },
  },
  options: {
    loud: { type: "boolean", short: "l", description: "Shout the greeting" },
  },
  action({ args, options }) {
    const msg = `Hello, ${args.name}!`;
    console.log(options.loud ? msg.toUpperCase() : msg);
  },
});

const cli = defineCli({
  name: "my-app",
  version: "1.0.0",
  commands: { greet },
});

cli.run();
```

## Documentation

For detailed guides, API reference, and examples, visit the [documentation](https://boune.dev).

## License

This project is licensed under the [MIT License](./LICENSE)
