import { describe, expect, it, beforeEach } from 'vitest'
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearAuthTokens
} from '../index'

describe('auth storage helpers', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('should store and retrieve access token', () => {
    expect(getAccessToken()).toBeNull()
    setAccessToken('abc123')
    expect(getAccessToken()).toBe('abc123')
  })

  it('should store and retrieve refresh token', () => {
    expect(getRefreshToken()).toBeNull()
    setRefreshToken('refresh-123')
    expect(getRefreshToken()).toBe('refresh-123')
  })

  it('should clear auth tokens', () => {
    setAccessToken('abc123')
    setRefreshToken('refresh-123')
    clearAuthTokens()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})
