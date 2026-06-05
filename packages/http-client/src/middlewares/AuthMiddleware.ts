import type { HttpContext, HttpMiddleware } from "../types";

export const createAuthMiddleware = (
  getToken: () => string | null
): HttpMiddleware => {
  return async (ctx: HttpContext, next: () => Promise<void>) => {
    const token = getToken();
    if (token) {
      if (!ctx.config.headers) {
        ctx.config.headers = {};
      }
      (ctx.config.headers as Record<string, string>).Authorization =
        `Bearer ${token}`;
    }
    await next();
  };
};
