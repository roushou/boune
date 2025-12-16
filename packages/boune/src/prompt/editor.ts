import { renderError, renderPromptLine } from "./core/index.ts";
import type { CompiledValidator } from "../validation/compile.ts";
import { join } from "node:path";
import { readLine } from "./stdin.ts";
import { tmpdir } from "node:os";

export interface EditorOptions {
  message: string;
  /** Default content to pre-fill the editor */
  default?: string;
  /** File extension for syntax highlighting (e.g., "md", "json", "ts") */
  extension?: string;
  /** Custom validation function */
  validate?: (value: string) => string | true;
  /** Compiled validator function */
  validator?: CompiledValidator;
  /** Wait message while editor is open */
  waitMessage?: string;
}

/**
 * Open the user's preferred editor and return the content
 */
async function openEditor(options: {
  initialContent?: string;
  extension?: string;
}): Promise<string> {
  const { initialContent = "", extension = "txt" } = options;

  // Create temp file
  const tempFile = join(tmpdir(), `boune-editor-${Date.now()}.${extension}`);
  await Bun.write(tempFile, initialContent);

  // Get editor from environment
  const editorCmd = process.env.VISUAL || process.env.EDITOR || "vi";

  // Parse editor command (may include args like "code --wait")
  const parts = editorCmd.split(/\s+/);
  const editorBin = parts[0]!;
  const editorArgs = [...parts.slice(1), tempFile];

  // Spawn editor and wait for it to close
  const proc = Bun.spawn([editorBin, ...editorArgs], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    // Clean up temp file
    try {
      const { unlink } = await import("node:fs/promises");
      await unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(`Editor exited with code ${exitCode}`);
  }

  // Read the content
  const content = await Bun.file(tempFile).text();

  // Clean up temp file
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(tempFile);
  } catch {
    // Ignore cleanup errors
  }

  return content;
}

/**
 * Prompt for multi-line text input using the user's preferred editor
 *
 * Opens $VISUAL or $EDITOR (falls back to vi) with a temporary file.
 * The content is returned after the editor closes.
 *
 * @example
 * ```typescript
 * const description = await editor({
 *   message: "Enter description:",
 *   extension: "md",
 * });
 * ```
 */
export async function editor(options: EditorOptions): Promise<string> {
  const {
    message,
    default: defaultValue,
    extension = "txt",
    validate,
    validator,
    waitMessage = "Waiting for editor...",
  } = options;

  const maxRetries = 10;
  let attempt = 0;

  while (attempt < maxRetries) {
    // Show prompt
    const promptLine = renderPromptLine({ message }, { hint: "press enter to open editor" });
    process.stdout.write(promptLine);

    // Wait for user to press enter (or type inline text)
    const raw = await readLine();
    const trimmed = raw.trim();

    let content: string;

    if (trimmed === "") {
      // User pressed enter - open editor
      console.log(`  ${waitMessage}`);

      try {
        content = await openEditor({
          initialContent: defaultValue,
          extension,
        });
        // Clear the "waiting" message
        process.stdout.write("\x1b[1A\x1b[2K");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Editor failed";
        console.log(renderError(errorMsg));
        attempt++;
        continue;
      }
    } else {
      // User typed something inline - use that
      content = trimmed;
    }

    content = content.trim();

    // Run validator
    if (validator) {
      const validation = validator(content);
      if (validation !== true) {
        console.log(renderError(validation));
        attempt++;
        continue;
      }
    }

    // Run legacy validate function
    if (validate) {
      const validation = validate(content);
      if (validation !== true) {
        console.log(renderError(validation));
        attempt++;
        continue;
      }
    }

    return content;
  }

  throw new Error(`Editor prompt exceeded maximum retries (${maxRetries})`);
}
