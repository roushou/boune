#!/usr/bin/env bun

/**
 * Number prompt example - demonstrates numeric input with constraints
 */
import { color } from "../packages/boune/src/index.ts";
import { number } from "../packages/boune/src/prompt/index.ts";

async function main() {
  console.log(color.bold("\nNumber Prompt Examples\n"));

  // Basic number input
  const age = await number({
    message: "Enter your age:",
    min: 0,
    max: 150,
    integer: true,
  });
  console.log(color.dim(`  You entered: ${age}\n`));

  // Port number with default
  const port = await number({
    message: "Server port:",
    default: 3000,
    min: 1,
    max: 65535,
    integer: true,
  });
  console.log(color.dim(`  Port: ${port}\n`));

  // Temperature (allows decimals)
  const temp = await number({
    message: "Temperature (°C):",
    default: 20.0,
    min: -273.15,
    max: 1000,
  });
  console.log(color.dim(`  Temperature: ${temp}°C\n`));

  // Quantity with minimum only
  const quantity = await number({
    message: "Quantity to order:",
    min: 1,
    integer: true,
  });
  console.log(color.dim(`  Quantity: ${quantity}\n`));

  // Price with maximum only
  const budget = await number({
    message: "Maximum budget ($):",
    max: 10000,
    default: 500,
  });
  console.log(color.dim(`  Budget: $${budget}\n`));

  // Custom validation
  const evenNumber = await number({
    message: "Enter an even number:",
    integer: true,
    validate: (value) => (value % 2 === 0 ? true : "Must be an even number"),
  });
  console.log(color.dim(`  Even number: ${evenNumber}\n`));

  // Summary
  console.log(color.bold("\nSummary:"));
  console.log(`  Age: ${age}`);
  console.log(`  Port: ${port}`);
  console.log(`  Temperature: ${temp}°C`);
  console.log(`  Quantity: ${quantity}`);
  console.log(`  Budget: $${budget}`);
  console.log(`  Even number: ${evenNumber}`);
  console.log();
}

main().catch(console.error);
