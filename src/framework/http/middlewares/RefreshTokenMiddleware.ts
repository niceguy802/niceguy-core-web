// token 刷新中间件：捕获 401 → 刷新 token → 更新请求头 → 重试
import type { HttpContext, HttpMiddleware } from '../types'
import { AuthError } from '../errors'

export interface RefreshTokenOptions {
  /** 获取当前 refreshToken */
  getRefreshToken: () => string | null
  /** 执行刷新，返回新的 accessToken */
  refreshToken: () => Promise<string>
  /** 刷新成功回调 */
  onRefreshSuccess?: (newToken: string) => void
  /** 刷新失败回调 */
  onRefreshError?: (error: unknown) => void
}

export const createRefreshTokenMiddleware = (
  options: RefreshTokenOptions
): HttpMiddleware => {
  // 防止并发刷新（多个请求同时 401 时只刷新一次）
  let pendingRefresh: Promise<string> | null = null

  return async (ctx: HttpContext, next: () => Promise<void>) => {
    try {
      await next()
    } catch (error) {
      if (!(error instanceof AuthError)) {
        throw error
      }

      // 401 → 尝试刷新 token
      const refreshToken = options.getRefreshToken()
      if (!refreshToken) {
        throw error
      }

      try {
        // 多个并发请求共享同一个刷新 Promise
        if (!pendingRefresh) {
          pendingRefresh = options.refreshToken().finally(() => {
            pendingRefresh = null
          })
        }

        const newToken = await pendingRefresh
        options.onRefreshSuccess?.(newToken)

        // 更新请求头的 token
        if (ctx.config.headers) {
          (ctx.config.headers as Record<string, string>).Authorization = `Bearer ${newToken}`
        } else {
          ctx.config.headers = { Authorization: `Bearer ${newToken}` } as any
        }

        // 用赋值代替 delete → 避免 V8 对象降级
        ctx.response = undefined
        ctx.result = undefined

        // 重试
        await next()
      } catch (refreshError) {
        options.onRefreshError?.(refreshError)
        throw error
      }
    }
  }
}
