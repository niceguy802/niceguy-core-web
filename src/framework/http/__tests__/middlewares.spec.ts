import { describe, expect, it, vi } from 'vitest'
import { createAuthMiddleware } from '../middlewares/AuthMiddleware'
import { createRefreshTokenMiddleware } from '../middlewares/RefreshTokenMiddleware'
import { AuthError } from '../errors'
import type { HttpContext } from '../types'

function createContext(): HttpContext {
  return {
    config: {
      url: '/api/test',
      headers: {}
    },
    metadata: {}
  }
}

describe('http middlewares', () => {
  it('should inject Authorization header in createAuthMiddleware', async () => {
    const ctx = createContext()
    const middleware = createAuthMiddleware(() => 'token-abc')

    let nextCalled = false
    await middleware(ctx, async () => {
      nextCalled = true
    })

    expect(ctx.config.headers?.Authorization).toBe('Bearer token-abc')
    expect(nextCalled).toBe(true)
  })

  it('should refresh token on AuthError and retry request', async () => {
    const ctx = createContext()
    const refreshTokenFn = vi.fn(async () => 'new-token-value')
    const onRefreshSuccess = vi.fn()

    const middleware = createRefreshTokenMiddleware({
      getRefreshToken: () => 'refresh-token',
      refreshToken: refreshTokenFn,
      onRefreshSuccess
    })

    let callCount = 0
    await middleware(ctx, async () => {
      callCount += 1
      if (callCount === 1) {
        throw new AuthError('expired')
      }
    })

    expect(refreshTokenFn).toHaveBeenCalledOnce()
    expect(onRefreshSuccess).toHaveBeenCalledWith('new-token-value')
    expect(ctx.config.headers?.Authorization).toBe('Bearer new-token-value')
    expect(callCount).toBe(2)
  })
})
