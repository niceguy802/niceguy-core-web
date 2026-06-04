import type { HttpContext, HttpMiddleware } from '../types'

export const createDeviceMiddleware = (
  getDevice: () => string
): HttpMiddleware => {
  return async (ctx: HttpContext, next: () => Promise<void>) => {
    if (!ctx.config.headers) {
      ctx.config.headers = {}
    }
    ;(ctx.config.headers as Record<string, string>)['X-Device'] = getDevice()
    await next()
  }
}
