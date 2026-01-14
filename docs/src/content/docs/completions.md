---
title: Shell Completions
description: Generate tab-completion scripts for Bash, Zsh, and Fish.
---

Boune can generate shell completion scripts for Bash, Zsh, and Fish shells.

## Generating Completions

Use the `generateCompletion` function:

```typescript
import { defineCli, defineCommand } from "boune";
import { generateCompletion } from "boune/completions";

const cli = defineCli({
  name: "myapp",
  version: "1.0.0",
  commands: {
    /* ... */
  },
});

// Generate for a specific shell
const script = generateCompletion(cli.config, "bash");
console.log(script);
```

## Completion Command

Add a built-in completion command to your CLI:

```typescript
import { defineCli, defineCommand } from "boune";
import { generateCompletion } from "boune/completions";

const completions = defineCommand({
  name: "completions",
  description: "Generate shell completions",
  options: {
    shell: {
      type: "string",
      short: "s",
      required: true,
      description: "Shell type (bash, zsh, fish)",
    },
  },
  action({ options }) {
    const shell = options.shell as "bash" | "zsh" | "fish";
    const script = generateCompletion(cli.config, shell);
    console.log(script);
  },
});

const cli = defineCli({
  name: "myapp",
  version: "1.0.0",
  commands: { completions /* ... */ },
});
```

## Installing Completions

### Bash

```bash
# Generate and add to .bashrc
myapp completions --shell bash >> ~/.bashrc

# Or save to a file
myapp completions --shell bash > /etc/bash_completion.d/myapp

# Reload
source ~/.bashrc
```

### Zsh

```bash
# Generate and add to .zshrc
myapp completions --shell zsh >> ~/.zshrc

# Or save to a completions directory
myapp completions --shell zsh > ~/.zsh/completions/_myapp

# Reload
source ~/.zshrc
```

For Zsh, ensure completions are enabled:

```bash
# Add to .zshrc if not already present
autoload -Uz compinit && compinit
```

### Fish

```bash
# Save to Fish completions directory
myapp completions --shell fish > ~/.config/fish/completions/myapp.fish

# Reload
source ~/.config/fish/config.fish
```

## What Gets Completed

The generated scripts provide completions for:

- **Commands** - All registered commands and subcommands
- **Aliases** - Command aliases
- **Options** - Long flags (--verbose) and short flags (-v)
- **Arguments** - Positional argument hints

## Example Output

For a CLI with:

```typescript
const build = defineCommand({
  name: "build",
  aliases: ["b"],
  options: {
    output: { type: "string", short: "o", description: "Output directory" },
    minify: { type: "boolean", short: "m", description: "Minify output" },
    watch: { type: "boolean", short: "w", description: "Watch mode" },
  },
});

const serve = defineCommand({
  name: "serve",
  options: {
    port: { type: "number", short: "p", description: "Port number" },
    host: { type: "string", short: "h", description: "Host address" },
  },
});
```

The completions will suggest:

- `myapp <TAB>` → `build`, `b`, `serve`
- `myapp build <TAB>` → `--output`, `-o`, `--minify`, `-m`, `--watch`, `-w`
- `myapp serve --<TAB>` → `--port`, `--host`

## Shell-Specific Functions

Generate for individual shells:

```typescript
import {
  generateBashCompletion,
  generateZshCompletion,
  generateFishCompletion,
} from "boune/completions";

const bashScript = generateBashCompletion(cli.config);
const zshScript = generateZshCompletion(cli.config);
const fishScript = generateFishCompletion(cli.config);
```

## Dynamic Completions

For dynamic completions (like completing file paths or values from a database), you'll need to extend the generated scripts or use shell-specific features.

### Fish Example with Dynamic Values

```fish
# Extend the generated completions
complete -c myapp -n "__fish_seen_subcommand_from deploy" -l env -xa "dev staging prod"
```

## Distribution

When distributing your CLI, consider:

1. **Include a completions command** - Let users generate completions for their shell
2. **Document installation** - Provide shell-specific instructions in your README
3. **Package completions** - Include pre-generated scripts in your package

## Next Steps

- [Middleware](/docs/middleware) - Add command hooks
- [Testing](/docs/testing) - Test your CLI
