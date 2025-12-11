# create-boune

Scaffold a new CLI project with [boune](https://github.com/roushou/boune).

## Usage

```bash
# Using bun
bun create boune

# Or run directly
bunx create-boune
```

## Options

```bash
create-boune create [name] [options]

Options:
  -t, --template <template>  Template to use (minimal, full)
  --no-install               Skip installing dependencies
  --no-git                   Skip git initialization
```

## Templates

### Minimal

Basic CLI with a single command using the declarative API. Good starting point for simple tools.

```
my-cli/
├── src/
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Full

Complete setup with multiple commands, interactive prompts, middleware, and tests.

```
my-cli/
├── src/
│   ├── index.ts
│   └── commands/
│       ├── greet.ts
│       └── init.ts
├── tests/
│   └── greet.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT
