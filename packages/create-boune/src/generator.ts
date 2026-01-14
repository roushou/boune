import { type TemplateFile, getFullTemplate, getMinimalTemplate } from "./templates.ts";
import { dirname } from "node:path";
import { mkdir } from "node:fs/promises";

export interface GenerateOptions {
  name: string;
  template: "minimal" | "full";
  skipInstall?: boolean;
  skipGit?: boolean;
}

export interface GenerateResult {
  /** Warnings for non-critical failures (git init, install) */
  warnings: string[];
}

const templates = {
  minimal: getMinimalTemplate,
  full: getFullTemplate,
} as const;

export async function generateProject(options: GenerateOptions): Promise<GenerateResult> {
  const { name, template, skipInstall, skipGit } = options;
  const dir = `./${name}`;
  const warnings: string[] = [];

  // Check if directory exists
  if (await Bun.file(dir).exists()) {
    throw new Error(`Directory "${name}" already exists`);
  }

  // Get and write template files
  const files: TemplateFile[] = templates[template](name);

  for (const file of files) {
    const filePath = `${dir}/${file.path}`;
    await mkdir(dirname(filePath), { recursive: true });
    await Bun.write(filePath, file.content);
  }

  // Initialize git (optional - warn on failure)
  if (!skipGit) {
    const result = await Bun.$`git -C ${dir} init`.quiet().nothrow();
    if (result.exitCode !== 0) {
      warnings.push("Failed to initialize git repository. You can run 'git init' manually.");
    }
  }

  // Install dependencies (optional - warn on failure)
  if (!skipInstall) {
    const result = await Bun.$`bun install --cwd ${dir}`.quiet().nothrow();
    if (result.exitCode !== 0) {
      warnings.push("Failed to install dependencies. You can run 'bun install' manually.");
    }
  }

  return { warnings };
}
