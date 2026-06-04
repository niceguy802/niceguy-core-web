// 状态码处理中间件：将 HTTP 状态码转换为对应的业务错误
import type { HttpContext } from '../types';
import { AuthError, HttpError } from '../errors';

export const HttpStatusMiddleware = async (ctx: HttpContext, next: () => Promise<void>) => {
  await next()

  const status = ctx.response?.status

  switch (status) {
    case 401:
      throw new AuthError()

    case 403:
      throw new HttpError(403, 'Forbidden')

    case 404:
      throw new HttpError(404, 'Not Found')

    case 500:
      throw new HttpError(500, 'Internal Server Error')

    case 502:
      throw new HttpError(502, 'Bad Gateway')

    case 503:
      throw new HttpError(503, 'Service Unavailable')

    default:
      if (status && status >= 400) {
        throw new HttpError(status, `HTTP Error ${status}`)
      }
  }
}
