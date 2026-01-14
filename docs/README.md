# Boune Documentation

Documentation site for [Boune](https://github.com/roushou/boune), built with [Astro](https://astro.build).

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

## Project Structure

```
src/
├── content/docs/        # Markdown documentation files
├── components/docs/     # Sidebar, TableOfContents
├── layouts/             # DocsLayout
├── pages/
│   ├── index.astro      # Landing page
│   └── docs/[...slug].astro  # Documentation pages
└── styles/
    ├── landing.css      # Landing page styles
    └── docs.css         # Documentation styles
```

## Adding Documentation

1. Create a new `.md` file in `src/content/docs/`:

```markdown
---
title: Page Title
description: Brief description of the page.
---

Your content here...
```

2. Add the page to the sidebar in `src/components/docs/Sidebar.astro`:

```typescript
const navigation = [
  {
    title: "Section Name",
    items: [{ label: "Page Title", href: "/docs/your-page" }],
  },
];
```

## Deployment

The site deploys to Cloudflare Pages
