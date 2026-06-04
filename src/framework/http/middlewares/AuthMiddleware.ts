// token 注入中间件：在请求前注入 Authorization 头
import type { HttpContext, HttpMiddleware } from '../types'

export const createAuthMiddleware = (
  getToken: () => string | null
): HttpMiddleware => {
  return async (ctx: HttpContext, next: () => Promise<void>) => {
    const token = getToken()
    if (token) {
      // 直接设置 headers，避免 spread 创建新对象（GC 优化）
      if (!ctx.config.headers) {
        ctx.config.headers = {}
      }
      ;(ctx.config.headers as Record<string, string>).Authorization = `Bearer ${token}`
    }
    await next()
  }
}
