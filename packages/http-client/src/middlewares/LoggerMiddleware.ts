import type { HttpContext, HttpMiddleware } from "../types";

export const LoggerMiddleware: HttpMiddleware = async (
  ctx: HttpContext,
  next: () => Promise<void>
) => {
  ctx.metadata.startTime = Date.now();
  await next();
  ctx.metadata.endTime = Date.now();
  const elapsed = ctx.metadata.endTime - ctx.metadata.startTime;
  console.log(
    `[HTTP] ${ctx.config.method?.toUpperCase()} ${ctx.config.url} - ${elapsed}ms`
  );
};
