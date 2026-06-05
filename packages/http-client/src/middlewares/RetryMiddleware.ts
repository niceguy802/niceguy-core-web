import type { HttpContext, HttpMiddleware } from "../types";
import { HttpError, NetworkError } from "../errors";

export interface RetryOptions {
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 重试延迟 (ms)，也可传函数计算递增延迟 */
  delay?: number | ((attempt: number) => number);
  /** 自定义判断是否该重试，默认只重试网络错误和 5xx */
  shouldRetry?: (error: unknown) => boolean;
}

const defaultShouldRetry = (error: unknown): boolean => {
  if (error instanceof NetworkError) return true;
  if (error instanceof HttpError && error.status >= 500) return true;
  return false;
};

const resolveDelay = (
  delay: RetryOptions["delay"],
  attempt: number
): number => {
  if (typeof delay === "function") return delay(attempt);
  return delay ?? 1000;
};

export const createRetryMiddleware = (
  options: RetryOptions = {}
): HttpMiddleware => {
  const maxRetries = options.maxRetries ?? 3;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  // maxRetries === 0 → 直接透传
  if (maxRetries <= 0) {
    return async (_ctx: HttpContext, next: () => Promise<void>) => {
      await next();
    };
  }

  return async (ctx: HttpContext, next: () => Promise<void>) => {
    const maxAttempts = maxRetries + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      ctx.metadata.retryCount = attempt - 1;

      try {
        await next();
        return; // 成功 → 退出
      } catch (error) {
        if (attempt >= maxAttempts || !shouldRetry(error)) {
          throw error;
        }

        const delayMs = resolveDelay(options.delay, attempt);
        console.warn(
          `[Retry] attempt ${attempt}/${maxRetries} failed, retrying in ${delayMs}ms`,
          ctx.config.url
        );

        // 清空结果，允许重新填充
        ctx.response = undefined;
        ctx.result = undefined;

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  };
};
