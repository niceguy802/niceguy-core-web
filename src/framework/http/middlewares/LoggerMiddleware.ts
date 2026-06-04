// 日志
import type { HttpContext } from '../types'

export const LoggerMiddleware = async (ctx: HttpContext, next: () => Promise<void>) => {
  ctx.metadata.startTime = Date.now()
  await next()
  ctx.metadata.endTime = Date.now()
  console.log(
    `[HTTP] ${ctx.config.method?.toUpperCase()} ${ctx.config.url} - ${ctx.metadata.endTime - ctx.metadata.startTime}ms`
  )
}
