import type { MiddlewareContext, MiddlewareHandler } from "../types/index.ts";

export async function runMiddleware(
  handlers: MiddlewareHandler[],
  ctx: MiddlewareContext,
  final: () => Promise<void>,
): Promise<void> {
  let index = 0;

  const next = async (): Promise<void> => {
    if (index < handlers.length) {
      const handler = handlers[index++]!;
      await handler(ctx, next);
    } else {
      await final();
    }
  };

  await next();
}
