import type { HttpContext, HttpMiddleware } from "../types";
import { AuthError, BusinessError, HttpError, NetworkError } from "../errors";

export interface ErrorHandler {
  onError?: (ctx: HttpContext, error: unknown) => void;
}

export const createErrorMiddleware = (
  handler?: ErrorHandler
): HttpMiddleware => {
  return async (ctx: HttpContext, next: () => Promise<void>) => {
    try {
      await next();
    } catch (error) {
      const onError = handler?.onError ?? console.warn;

      if (error instanceof AuthError) {
        onError(ctx, `[AuthError] 认证失败：${error.message}`);
      } else if (error instanceof BusinessError) {
        onError(ctx, `[BusinessError] ${error.code}: ${error.message}`);
      } else if (error instanceof HttpError) {
        onError(ctx, `[HttpError] ${error.status}: ${error.message}`);
      } else if (error instanceof NetworkError) {
        onError(ctx, `[NetworkError] ${error.message}`);
      } else if (error instanceof Error) {
        onError(ctx, `[UnknownError] ${error.message}`);
      } else {
        onError(ctx, `[UnknownError] ${String(error)}`);
      }

      throw error;
    }
  };
};
