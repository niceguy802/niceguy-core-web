import type { HttpContext, HttpMiddleware } from '../types'

export interface LoadingHandler {
  start(): void
  stop(): void
}

export const createLoadingMiddleware = (handler: LoadingHandler): HttpMiddleware => {
  return async (_ctx: HttpContext, next: () => Promise<void>) => {
    handler.start()
    try {
      await next()
    } finally {
      handler.stop()
    }
  }
}
