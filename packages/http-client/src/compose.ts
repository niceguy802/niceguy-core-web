import type { HttpContext, HttpMiddleware } from "./types";

/**
 * 中间件组合器 — 实现洋葱模型 (koa-style)
 *
 * 特性：
 * - 标准 dispatch guard：禁止同一中间件被重复调用
 * - 重试支持：通过 isRetrying 标志重置 dispatchedIndex，允许整个链重入
 * - 错误传播：中间件抛错会沿洋葱链向外冒泡
 */
export async function compose(
  middlewares: HttpMiddleware[],
  ctx: HttpContext
): Promise<void> {
  let dispatchedIndex = -1;
  let isRetrying = false;

  const dispatch = async (i: number): Promise<void> => {
    if (i <= dispatchedIndex && !isRetrying) return;
    if (i >= middlewares.length) return;

    if (isRetrying) {
      // 让从 i 开始的所有中间件都能重新进入
      dispatchedIndex = i - 1;
      isRetrying = false;
    }

    dispatchedIndex = i;
    const middleware = middlewares[i];

    try {
      await middleware(ctx, () => dispatch(i + 1));
    } catch (err) {
      // 标记为重试场景，让外层能够捕获并重入
      isRetrying = true;
      dispatchedIndex = i;
      throw err;
    }
  };

  await dispatch(0);
}
