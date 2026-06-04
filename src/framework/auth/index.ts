import { createHttpClient, type ApiResponse } from '../http'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../http/constants'

const DEVICE_TYPE = 'pc'

// ===== Token 管理 =====

export const getAccessToken = (): string | null => {
  try { return window.localStorage.getItem(ACCESS_TOKEN_KEY) } catch { return null }
}

export const setAccessToken = (token: string | null) => {
  if (token) { window.localStorage.setItem(ACCESS_TOKEN_KEY, token) }
  else { window.localStorage.removeItem(ACCESS_TOKEN_KEY) }
}

export const getRefreshToken = (): string | null => {
  try { return window.localStorage.getItem(REFRESH_TOKEN_KEY) } catch { return null }
}

export const setRefreshToken = (token: string | null) => {
  if (token) { window.localStorage.setItem(REFRESH_TOKEN_KEY, token) }
  else { window.localStorage.removeItem(REFRESH_TOKEN_KEY) }
}

export const clearAuthTokens = () => {
  setAccessToken(null)
  setRefreshToken(null)
}

// ===== HTTP 客户端 =====

/**
 * 通过设备类型和当前的访问令牌创建 HTTP 客户端
 * @param device 设备类型，例如 'pc' 或 'mobile'
 * @param auth 访问令牌
 */
const apiClient = createHttpClient({
  device: DEVICE_TYPE,
  auth: getAccessToken
})

/**
 * 刷新令牌客户端 refreshToken
 */
const refreshClient = createHttpClient({
  device: DEVICE_TYPE,
  auth: getRefreshToken,
  refresh: false
})

// ===== 登录 API =====

export async function login(username: string, password: string) {
  try {
    const res = await apiClient.post<ApiResponse<{
      accessToken: string
      refreshToken: string
      [key: string]: any
    }>>('/public/auth/login', { username, password })

    setAccessToken(res.data.accessToken)
    setRefreshToken(res.data.refreshToken)
    return res
  } catch (error) {
    clearAuthTokens()
    throw error
  }
}

export async function refreshAuthToken() {
  try {
    const newToken = await refreshClient.post<ApiResponse>('/public/auth/refresh')
    setAccessToken(newToken.data)
    return newToken.data
  } catch (error) {
    clearAuthTokens()
    throw error
  }
}

export async function getUserInfo(username?: string) {
  return apiClient.get<ApiResponse<{
    id: number
    username: string
    avatar?: string
    [key: string]: any
  }>>('/auth/getUserInfo', { params: { username } })
}

export function logout() {
  clearAuthTokens()
}

export const api = apiClient


