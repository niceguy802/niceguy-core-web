// 请求中间件组合器，将多个中间件函数组合成一个函数，依次执行每个中间件
import type { HttpContext, HttpMiddleware } from './types'

export async function compose(middlewares: HttpMiddleware[], ctx: HttpContext) {
  let dispatchedIndex = -1
  let lastError: unknown = undefined

  const dispatch = async (i: number): Promise<void> => {
    // 补丁：当 lastError !== undefined（重试场景）时，
    // 重置 dispatchedIndex 允许整个洋葱链重新执行
    //（error 中间的 after-next 抛错时 dispatchedIndex 已被推到底层 terminal 模块，
    //  如果不重置，内层中间件的重入会被 dispatchedIndex 守卫挡住）
    const retrying = lastError !== undefined

    if (i <= dispatchedIndex && !retrying) {
      return
    }
    if (i >= middlewares.length) {
      return
    }

    // 正在重试 → 重置，让新一轮的 dispatch 可以进入内层
    if (retrying) {
      // 将 dispatchedIndex 压到 i-1，确保从 i 开始的所有中间件都被允许重入
      dispatchedIndex = i - 1
    }
    dispatchedIndex = i
    lastError = undefined

    const middleware = middlewares[i]
    try {
      await middleware(ctx, () => dispatch(i + 1))
    } catch (err) {
      lastError = err
      throw err
    }
  }

  await dispatch(0)
}
