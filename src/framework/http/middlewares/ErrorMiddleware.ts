// 错误处理中间件
import type { HttpContext, HttpMiddleware } from '../types';
import { AuthError, BusinessError, HttpError, NetworkError } from '../errors';

export const ErrorMiddleware: HttpMiddleware = async (ctx, next) => {
  try {
    await next()
  } catch (error) {
    console.error('[HTTP Error]', ctx.config.url, error)

    if (error instanceof AuthError) {
      console.warn('[AuthError] 认证失败，可能需要重新登录。')
    } else if (error instanceof BusinessError) {
      console.warn('[BusinessError] 服务器返回业务错误：', error.message)
    } else if (error instanceof HttpError) {
      console.warn('[HttpError] HTTP 状态异常：', error.status, error.message)
    } else if (error instanceof NetworkError) {
      console.warn('[NetworkError] 网络异常，建议检查网络或重试。')
    }

    throw error
  }
}
