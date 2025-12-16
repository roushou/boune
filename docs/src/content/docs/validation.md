---
title: Validation
description: Validate user input with declarative validation rules.
---

Boune provides a declarative validation system for arguments and options using plain objects.

## Basic Validation

Define validation rules as plain objects on your arguments and options:

```typescript
import { defineCommand } from "boune";

const deploy = defineCommand({
  name: "deploy",
  arguments: {
    env: {
      type: "string",
      required: true,
      validate: { oneOf: ["dev", "staging", "prod"] },
    },
  },
  options: {
    port: {
      type: "number",
      validate: { min: 1, max: 65535 },
    },
  },
  action({ args, options }) {
    console.log(`Deploying to ${args.env} on port ${options.port}`);
  },
});
```

## String Validation Rules

```typescript
// Email validation
validate: { email: true }

// URL validation
validate: { url: true }

// Regex pattern
validate: { regex: /^[a-z]+$/ }

// Length constraints
validate: { minLength: 3 }
validate: { maxLength: 50 }
validate: { minLength: 3, maxLength: 50 }

// Allowed values
validate: { oneOf: ["small", "medium", "large"] }
```

### Email

```typescript
const register = defineCommand({
  name: "register",
  arguments: {
    email: {
      type: "string",
      required: true,
      validate: { email: true },
    },
  },
  action({ args }) {
    console.log(`Registering ${args.email}`);
  },
});
```

```bash
myapp register invalid       # Error: Must be a valid email address
myapp register user@test.com # Works
```

### URL

```typescript
const fetch = defineCommand({
  name: "fetch",
  arguments: {
    url: {
      type: "string",
      required: true,
      validate: { url: true },
    },
  },
  action({ args }) {
    console.log(`Fetching ${args.url}`);
  },
});
```

### Pattern Matching

```typescript
const tag = defineCommand({
  name: "tag",
  arguments: {
    version: {
      type: "string",
      required: true,
      validate: {
        regex: { value: /^v\d+\.\d+\.\d+$/, message: "Must be semantic version (v1.0.0)" },
      },
    },
  },
  action({ args }) {
    console.log(`Creating tag ${args.version}`);
  },
});
```

## Number Validation Rules

```typescript
// Range constraints
validate: { min: 0 }
validate: { max: 100 }
validate: { min: 1, max: 65535 }

// Integer only
validate: { integer: true }

// Sign constraints
validate: { positive: true }
validate: { negative: true }

// Allowed values
validate: { oneOf: [80, 443, 8080] }
```

### Port Number

```typescript
const serve = defineCommand({
  name: "serve",
  options: {
    port: {
      type: "number",
      default: 3000,
      validate: { integer: true, min: 1, max: 65535 },
    },
  },
  action({ options }) {
    console.log(`Listening on port ${options.port}`);
  },
});
```

```bash
myapp serve --port 80     # Works
myapp serve --port 70000  # Error: Must be at most 65535
myapp serve --port 3.5    # Error: Must be an integer
```

### Positive Numbers

```typescript
const resize = defineCommand({
  name: "resize",
  options: {
    width: {
      type: "number",
      required: true,
      validate: { positive: true, integer: true },
    },
    height: {
      type: "number",
      required: true,
      validate: { positive: true, integer: true },
    },
  },
  action({ options }) {
    console.log(`Resizing to ${options.width}x${options.height}`);
  },
});
```

## Combining Rules

Combine multiple validation rules in one object:

```typescript
const create = defineCommand({
  name: "create",
  arguments: {
    name: {
      type: "string",
      required: true,
      validate: {
        minLength: 3,
        maxLength: 20,
        regex: { value: /^[a-z][a-z0-9-]*$/, message: "Must start with letter, only lowercase, numbers, and hyphens" },
      },
    },
  },
  action({ args }) {
    console.log(`Creating ${args.name}`);
  },
});
```

## Custom Validation

Use `refine` for custom validation logic:

```typescript
const upload = defineCommand({
  name: "upload",
  arguments: {
    file: {
      type: "string",
      required: true,
      validate: {
        refine: (path) => {
          if (!path.endsWith(".json") && !path.endsWith(".yaml")) {
            return "Must be a JSON or YAML file";
          }
          return true;
        },
      },
    },
  },
  action({ args }) {
    console.log(`Uploading ${args.file}`);
  },
});
```

### Complex Validation

```typescript
const setDate = defineCommand({
  name: "set-date",
  arguments: {
    date: {
      type: "string",
      required: true,
      validate: {
        refine: (value) => {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return "Invalid date format";
          }
          if (date < new Date()) {
            return "Date must be in the future";
          }
          return true;
        },
      },
    },
  },
  action({ args }) {
    console.log(`Date set to ${args.date}`);
  },
});
```

## Custom Error Messages

Override default error messages using the object form:

```typescript
validate: { email: { value: true, message: "Please provide a valid email address" } }
validate: { min: { value: 1, message: "Value must be at least 1" } }
validate: { minLength: { value: 8, message: "Password must be at least 8 characters" } }
```

### Example

```typescript
const serve = defineCommand({
  name: "serve",
  options: {
    port: {
      type: "number",
      default: 3000,
      validate: {
        integer: { value: true, message: "Port must be a whole number" },
        min: { value: 1, message: "Port must be at least 1" },
        max: { value: 65535, message: "Port must be at most 65535" },
      },
    },
  },
  action({ options }) {
    console.log(`Listening on port ${options.port}`);
  },
});
```

## Validation Rules Reference

### String Rules

| Rule        | Type                                | Description           |
| ----------- | ----------------------------------- | --------------------- |
| `email`     | `true` or `{value, message}`        | Valid email format    |
| `url`       | `true` or `{value, message}`        | Valid URL format      |
| `regex`     | `RegExp` or `{value, message}`      | Match regex pattern   |
| `minLength` | `number` or `{value, message}`      | Minimum length        |
| `maxLength` | `number` or `{value, message}`      | Maximum length        |
| `oneOf`     | `string[]` or `{value, message}`    | One of allowed values |
| `refine`    | `(value: string) => true \| string` | Custom validation     |

### Number Rules

| Rule       | Type                                | Description           |
| ---------- | ----------------------------------- | --------------------- |
| `min`      | `number` or `{value, message}`      | Minimum value         |
| `max`      | `number` or `{value, message}`      | Maximum value         |
| `integer`  | `true` or `{value, message}`        | Must be integer       |
| `positive` | `true` or `{value, message}`        | Must be > 0           |
| `negative` | `true` or `{value, message}`        | Must be < 0           |
| `oneOf`    | `number[]` or `{value, message}`    | One of allowed values |
| `refine`   | `(value: number) => true \| string` | Custom validation     |

### Boolean Rules

| Rule     | Type                                 | Description       |
| -------- | ------------------------------------ | ----------------- |
| `refine` | `(value: boolean) => true \| string` | Custom validation |

## Next Steps

- [Prompts](/docs/prompts) - Interactive user input
- [Output & Styling](/docs/output) - Format CLI output
