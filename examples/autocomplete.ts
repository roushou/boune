#!/usr/bin/env bun

/**
 * Autocomplete prompt example - demonstrates fuzzy search with suggestions
 */
import { autocomplete } from "../packages/boune/src/prompt/index.ts";
import { color } from "../packages/boune/src/index.ts";

async function main() {
  console.log(color.bold("\nAutocomplete Prompt Examples\n"));

  // Framework selection
  const framework = await autocomplete({
    message: "Select a frontend framework:",
    options: [
      { label: "React", value: "react" },
      { label: "Vue", value: "vue" },
      { label: "Svelte", value: "svelte" },
      { label: "Angular", value: "angular" },
      { label: "Solid", value: "solid" },
      { label: "Preact", value: "preact" },
      { label: "Qwik", value: "qwik" },
      { label: "Lit", value: "lit" },
    ],
  });
  console.log(color.dim(`  Selected: ${framework}\n`));

  // Country selection with many options
  const country = await autocomplete({
    message: "Select your country:",
    options: [
      { label: "United States", value: "us" },
      { label: "United Kingdom", value: "uk" },
      { label: "Canada", value: "ca" },
      { label: "Australia", value: "au" },
      { label: "Germany", value: "de" },
      { label: "France", value: "fr" },
      { label: "Japan", value: "jp" },
      { label: "South Korea", value: "kr" },
      { label: "Brazil", value: "br" },
      { label: "India", value: "in" },
      { label: "China", value: "cn" },
      { label: "Mexico", value: "mx" },
      { label: "Spain", value: "es" },
      { label: "Italy", value: "it" },
      { label: "Netherlands", value: "nl" },
      { label: "Sweden", value: "se" },
      { label: "Norway", value: "no" },
      { label: "Denmark", value: "dk" },
      { label: "Finland", value: "fi" },
      { label: "Switzerland", value: "ch" },
    ],
    limit: 5,
  });
  console.log(color.dim(`  Selected: ${country}\n`));

  // Package manager with initial value
  const packageManager = await autocomplete({
    message: "Select a package manager:",
    options: [
      { label: "npm", value: "npm" },
      { label: "yarn", value: "yarn" },
      { label: "pnpm", value: "pnpm" },
      { label: "bun", value: "bun" },
    ],
    initial: "bun",
  });
  console.log(color.dim(`  Selected: ${packageManager}\n`));

  // Allow custom input
  const favoriteFood = await autocomplete({
    message: "What's your favorite food?",
    options: [
      { label: "Pizza", value: "pizza" },
      { label: "Sushi", value: "sushi" },
      { label: "Tacos", value: "tacos" },
      { label: "Pasta", value: "pasta" },
      { label: "Burger", value: "burger" },
      { label: "Ramen", value: "ramen" },
      { label: "Curry", value: "curry" },
      { label: "Salad", value: "salad" },
    ],
    allowCustom: true,
  });
  console.log(color.dim(`  Selected: ${favoriteFood}\n`));

  // Custom filter function (exact prefix match)
  const command = await autocomplete({
    message: "Select a git command:",
    options: [
      { label: "git add", value: "add" },
      { label: "git commit", value: "commit" },
      { label: "git push", value: "push" },
      { label: "git pull", value: "pull" },
      { label: "git fetch", value: "fetch" },
      { label: "git branch", value: "branch" },
      { label: "git checkout", value: "checkout" },
      { label: "git merge", value: "merge" },
      { label: "git rebase", value: "rebase" },
      { label: "git stash", value: "stash" },
      { label: "git log", value: "log" },
      { label: "git status", value: "status" },
      { label: "git diff", value: "diff" },
      { label: "git reset", value: "reset" },
      { label: "git clone", value: "clone" },
    ],
    filter: (input, option) => {
      // Prefix match instead of fuzzy
      return option.label.toLowerCase().startsWith(input.toLowerCase());
    },
    limit: 8,
  });
  console.log(color.dim(`  Selected: ${command}\n`));

  // Summary
  console.log(color.bold("\nYour selections:"));
  console.log(`  Framework: ${framework}`);
  console.log(`  Country: ${country}`);
  console.log(`  Package manager: ${packageManager}`);
  console.log(`  Favorite food: ${favoriteFood}`);
  console.log(`  Git command: ${command}`);
  console.log();
}

main().catch(console.error);
