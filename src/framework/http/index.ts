import type { AxiosRequestConfig } from 'axios'
import { HttpClient } from './HttpClient'
import { ErrorMiddleware } from './middlewares/ErrorMiddleware'
import { HttpStatusMiddleware } from './middlewares/HttpStatusMiddleware'
import { ResponseTransformMiddleware } from './middlewares/ResponseTransformMiddleware'
import { createAuthMiddleware } from './middlewares/AuthMiddleware'
import { createDeviceMiddleware } from './middlewares/DeviceMiddleware'
import { createRefreshTokenMiddleware, RefreshTokenOptions } from './middlewares/RefreshTokenMiddleware'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './constants'
import type { ApiResponse, HttpMiddleware } from './types'

// ===== 类型导出 =====
export { compose } from './compose'
export { HttpClient } from './HttpClient'
export { MiddlewareManager } from './MiddlewareManager'

export { ErrorMiddleware } from './middlewares/ErrorMiddleware'
export { LoggerMiddleware } from './middlewares/LoggerMiddleware'
export { HttpStatusMiddleware } from './middlewares/HttpStatusMiddleware'
export { ResponseTransformMiddleware } from './middlewares/ResponseTransformMiddleware'
export { createAuthMiddleware } from './middlewares/AuthMiddleware'
export { createDeviceMiddleware } from './middlewares/DeviceMiddleware'
export { createLoadingMiddleware } from './middlewares/LoadingMiddleware'
export { createRefreshTokenMiddleware } from './middlewares/RefreshTokenMiddleware'
export { createRetryMiddleware } from './middlewares/RetryMiddleware'

export type { LoadingHandler } from './middlewares/LoadingMiddleware'
export type { RefreshTokenOptions } from './middlewares/RefreshTokenMiddleware'
export type { RetryOptions } from './middlewares/RetryMiddleware'

export { AuthError, BusinessError, HttpError, NetworkError } from './errors'
export type { HttpContext, HttpMiddleware, Next, RequestConfig, ApiResponse, HttpInterceptor } from './types'

// Vue 插件
export { createHttpPlugin, URL_KEY } from './vue-plugin'

// ===== 创建 HttpClient 实例（所有中间件已自动注册） =====

export interface CreateHttpClientOptions {
  /** 请求基础路径，默认 '/api'（Vite proxy 转发） */
  baseURL?: string
  /** 超时时间（ms），默认 10000 */
  timeout?: number
  /** 设备标识，默认 'pc' */
  device?: string
  /**
   * token 注入方式：
   * - true（默认）: 从 localStorage 读取 accessToken 自动注入
   * - false: 不注入 token
   * - ()=>string|null: 自定义 token 获取函数
   */
  auth?: boolean | (() => string | null)
  /** 是否启用 401 自动刷新，默认 true */
  refresh?: boolean | RefreshTokenOptions   // 支持全量覆盖
  middlewares?: HttpMiddleware[]            // 用户自定义中间件
  axiosConfig?: Omit<AxiosRequestConfig, 'baseURL' | 'timeout'>  // 透传 axios 原生配置
}

/**
 * 创建预配置好的 HttpClient 实例
 *
 * 已内置中间件（洋葱模型从外到内）：
 *   RefreshToken → Error → HttpStatus → ResponseTransform → Device → Auth → axios
 *
 * 用法:
 * `	s
 * // 默认值：baseURL='/api', timeout=10000, device='pc', auth=true, refresh=true
 * const http = createHttpClient()
 *
 * // 自定义
 * const http = createHttpClient({ baseURL: '/api', timeout: 15000 })
 *
 * // 不需要 token/刷新
 * const http = createHttpClient({ auth: false, refresh: false })
 * `
 */
export function createHttpClient(options: CreateHttpClientOptions = {}) {
  const {
    baseURL = '/api',
    timeout = 10000,
    device = 'pc',
    auth = true,
    refresh = true
  } = options

  // 决定 token getter —— 组件外（模块初始化）无法 inject，直接用 localStorage
  const resolveToken = (key: string): (() => string | null) => {
    return () => {
      try { return window.localStorage.getItem(key) }
      catch { return null }
    }
  }

  const client = new HttpClient({ baseURL, timeout })

  // ─── 洋葱模型外层：RefreshToken ───
  if (refresh) {
    // 刷新专用子客户端（注入 refreshToken，不套 RefreshToken 避免递归）
    const refreshClient = new HttpClient({ baseURL, timeout })
    refreshClient.use(ErrorMiddleware)
    refreshClient.use(HttpStatusMiddleware)
    refreshClient.use(ResponseTransformMiddleware)
    refreshClient.use(createDeviceMiddleware(() => device))
    refreshClient.use(createAuthMiddleware(resolveToken(REFRESH_TOKEN_KEY)))

    client.use(createRefreshTokenMiddleware({
      getRefreshToken: resolveToken(REFRESH_TOKEN_KEY),
      refreshToken: async () => {
        const tokenRes = await refreshClient.get<ApiResponse<string>>('/public/auth/refresh')
        return tokenRes.data
      },
      onRefreshSuccess: (newToken) => {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, newToken)
      },
      onRefreshError: () => {
        window.localStorage.removeItem(ACCESS_TOKEN_KEY)
        window.localStorage.removeItem(REFRESH_TOKEN_KEY)
      }
    }))
  }

  // ─── 洋葱模型中间层 ───
  client.use(ErrorMiddleware)
  client.use(HttpStatusMiddleware)
  client.use(ResponseTransformMiddleware)
  client.use(createDeviceMiddleware(() => device))

  // ─── 洋葱模型内层：Auth ───
  if (auth) {
    const getter = typeof auth === 'function' ? auth : resolveToken(ACCESS_TOKEN_KEY)
    client.use(createAuthMiddleware(getter))
  }

  return client
}
// ── 应用启动时验证 token 有效性 ──

/**
 * 应用启动时验证 token 有效性，确保过期 token 不会进入首页
 *
 * - 有 accessToken → 尝试调用刷新接口获取新 token
 * - 刷新成功 → 更新 localStorage 中的 accessToken，返回 true
 * - 无 refreshToken / 刷新失败 → 清除 token，跳转登录页，返回 false
 *
 * 推荐在 main.ts 或 router.beforeEach 中使用：
 * ```ts
 * import { verifyAuth } from '@/framework/http'
 * await verifyAuth()
 * app.mount('#app')
 * ```
 */
export async function verifyAuth(options?: {
  loginPageUrl?: string
  baseURL?: string
}): Promise<boolean> {
  const { loginPageUrl = '/login', baseURL = '/api' } = options || {}

  /** 安全读取 localStorage */
  const getLocalStorage = (key: string): string | null => {
    try { return window.localStorage.getItem(key) }
    catch { return null }
  }

  // 没有 accessToken → 无需验证
  const accessToken = getLocalStorage(ACCESS_TOKEN_KEY)
  if (!accessToken) return false

  const refreshToken = getLocalStorage(REFRESH_TOKEN_KEY)
  if (!refreshToken) {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    if (typeof window !== 'undefined' && window.location.pathname !== loginPageUrl) {
      window.location.href = loginPageUrl
    }
    return false
  }

  // 尝试用 refreshToken 刷新
  const refreshClient = new HttpClient({ baseURL })
  refreshClient.use(ErrorMiddleware)
  refreshClient.use(HttpStatusMiddleware)
  refreshClient.use(ResponseTransformMiddleware)
  refreshClient.use(createAuthMiddleware(() => refreshToken))

  try {
    const res = await refreshClient.get('/public/auth/refresh')
    const newToken = (res as any)?.data
    if (newToken) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, newToken)
      return true
    }
    return false
  } catch {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
    if (typeof window !== 'undefined' && window.location.pathname !== loginPageUrl) {
      window.location.href = loginPageUrl
    }
    return false
  }
}
