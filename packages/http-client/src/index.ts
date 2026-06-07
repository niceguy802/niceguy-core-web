import type { AxiosRequestConfig } from "axios";
import { HttpClient } from "./HttpClient";
import { HttpStatusMiddleware } from "./middlewares/HttpStatusMiddleware";
import { ResponseTransformMiddleware } from "./middlewares/ResponseTransformMiddleware";
import { createErrorMiddleware } from "./middlewares/ErrorMiddleware";
import { createAuthMiddleware } from "./middlewares/AuthMiddleware";
import { createRefreshTokenMiddleware } from "./middlewares/RefreshTokenMiddleware";
import { createAuthResponseMiddleware } from "./middlewares/AuthResponseMiddleware";
import type { ErrorHandler } from "./middlewares/ErrorMiddleware";
import type { ApiResponse } from "./types";
import { TokenManager } from "./TokenManager";
import type { TokenMode } from "./TokenManager";

// ── 类型导出 ──

export { compose } from "./compose";
export { HttpClient } from "./HttpClient";
export { MiddlewareManager } from "./MiddlewareManager";
export { TokenManager } from "./TokenManager";
export type { TokenMode, TokenStorageConfig } from "./TokenManager";

export { HttpStatusMiddleware } from "./middlewares/HttpStatusMiddleware";
export { ResponseTransformMiddleware } from "./middlewares/ResponseTransformMiddleware";
export { createErrorMiddleware } from "./middlewares/ErrorMiddleware";
export { LoggerMiddleware } from "./middlewares/LoggerMiddleware";
export { createAuthMiddleware } from "./middlewares/AuthMiddleware";
export { createLoadingMiddleware } from "./middlewares/LoadingMiddleware";
export { createRefreshTokenMiddleware } from "./middlewares/RefreshTokenMiddleware";
export { createRetryMiddleware } from "./middlewares/RetryMiddleware";
export { createAuthResponseMiddleware } from "./middlewares/AuthResponseMiddleware";

export type { LoadingHandler } from "./middlewares/LoadingMiddleware";
export type { RefreshTokenOptions } from "./middlewares/RefreshTokenMiddleware";
export type { RetryOptions } from "./middlewares/RetryMiddleware";
export type { ErrorHandler } from "./middlewares/ErrorMiddleware";
export type { AuthResponseOptions } from "./middlewares/AuthResponseMiddleware";

export {
  AuthError,
  BusinessError,
  HttpError,
  NetworkError,
} from "./errors";
export type {
  HttpContext,
  HttpMiddleware,
  Next,
  RequestConfig,
  ApiResponse,
  HttpInterceptor,
} from "./types";

export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, URL_KEY, buildStorageKey } from "./constants";
export { createHttpPlugin } from "./vue-plugin";

// ── 创建 HttpClient 实例 ──

export interface CreateHttpClientOptions {
  /** 请求基础路径，默认 "/api" */
  baseURL?: string;
  /** 超时时间 (ms)，默认 10000 */
  timeout?: number;
  /**
   * token 注入方式：
   * - true（默认）: 从 localStorage 读取 accessToken 自动注入
   * - false: 不注入 token
   * - ()=>string|null: 自定义 token 获取函数
   */
  auth?: boolean | (() => string | null);
  /** 是否启用 401 自动刷新，默认 true */
  refresh?: boolean;
  /** 自定义刷新 token 选项（覆盖默认刷新行为） */
  refreshOptions?: Partial<{
    getRefreshToken: () => string | null;
    refreshToken: () => Promise<string>;
    onRefreshSuccess: (newToken: string) => void;
    onRefreshError: (error: unknown) => void;
  }>;
  /** 错误处理钩子 */
  onError?: ErrorHandler["onError"];

  // ── Token 管理模式 ──

  /** token 管理方式: localStorage（默认）| cookie */
  tokenMode?: TokenMode;

  /** 登录接口路径（设置后自动提取并保存 token，业务层无需手动处理） */
  loginEndpoint?: string;
  /** 刷新接口路径 */
  refreshEndpoint?: string;
  /** 自定义 token 存储 key */
  tokenKeys?: { accessToken?: string; refreshToken?: string };

  // ── 重新登录能力 ──

  /** 需要重新登录时的回调（如跳转登录页） */
  onReLogin?: () => void;
  /** 登录页 URL（onReLogin 未设置时默认跳转此路径） */
  loginPageUrl?: string;

  /** 透传 axios 原生配置 */
  axiosConfig?: Omit<AxiosRequestConfig, "baseURL" | "timeout">;

  /** 外部 TokenManager 实例（用于共享 token 状态）；不传则内部自动创建 */
  tokenManager?: TokenManager;
}

/**
 * 创建预配置好的 HttpClient 实例
 *
 * 已内置中间件（洋葱模型从外到内）：
 *   RefreshToken → AuthResponse → Error → ResponseTransform → HttpStatus → Auth → axios
 *
 * @example
 * const http = createHttpClient({ baseURL: "/api" })
 * const res = await http.post("/public/auth/login", { username, password })
 * // token 自动保存，业务层只收到 { success: true, data: null }
 */
export function createHttpClient(
  options: CreateHttpClientOptions = {}
): HttpClient {
  const {
    baseURL = "/api",
    timeout = 10000,
    auth = true,
    refresh = true,
    refreshOptions,
    onError,
    tokenMode = "memory",
    loginEndpoint,
    refreshEndpoint,
    tokenKeys,
    onReLogin,
    loginPageUrl,
    axiosConfig,
    tokenManager: externalTokenManager,
  } = options;

  // ── TokenManager ──
  // 优先使用外部传入的实例（如 playground 共享给路由守卫），否则内部创建

  const tokenManager = externalTokenManager ?? new TokenManager({
    mode: tokenMode,
    accessTokenKey: tokenKeys?.accessToken,
    refreshTokenKey: tokenKeys?.refreshToken,
  });

  const client = new HttpClient({ baseURL, timeout, ...axiosConfig });

  // ── 洋葱模型外层 1：RefreshToken ──
  if (refresh) {
    const refreshClient = new HttpClient({ baseURL, timeout, ...axiosConfig });

    if (tokenMode === "localStorage") {
      // localStorage 模式：refresh 请求带 refreshToken
      refreshClient.use(createErrorMiddleware());
      refreshClient.use(ResponseTransformMiddleware);
      refreshClient.use(HttpStatusMiddleware);
      refreshClient.use(createAuthMiddleware(() =>
        tokenManager.getRefreshToken()
      ));
    } else {
      // cookie 模式：refresh 请求不需要 Authorization（浏览器自动带 cookie）
      refreshClient.use(createErrorMiddleware());
      refreshClient.use(ResponseTransformMiddleware);
      refreshClient.use(HttpStatusMiddleware);
    }

    client.use(
      createRefreshTokenMiddleware({
        getRefreshToken:
          refreshOptions?.getRefreshToken ??
          (() => tokenManager.getRefreshToken()),
        refreshToken:
          refreshOptions?.refreshToken ??
          (async () => {
            const res = await refreshClient.post<ApiResponse<{ accessToken: string }>>(
              refreshEndpoint ?? "/public/auth/refresh"
            );
            return res.data.accessToken;
          }),
        onRefreshSuccess:
          refreshOptions?.onRefreshSuccess ??
          ((newToken: string) => {
            tokenManager.setAccessToken(newToken);
          }),
        onRefreshError:
          refreshOptions?.onRefreshError ??
          (() => {
            tokenManager.clearAll();
          }),
        cookieModeRefresh: tokenMode === "cookie" || tokenMode === "memory",
        onReLogin,
        loginPageUrl,
      })
    );
  }

  // ── 洋葱模型外层 2：AuthResponse（自动保存 token）──
  if (loginEndpoint || refreshEndpoint) {
    client.use(
      createAuthResponseMiddleware({
        tokenManager,
        loginEndpoint,
        refreshEndpoint,
      })
    );
  }

  // ── 洋葱模型中间层 ──
  client.use(createErrorMiddleware(onError ? { onError } : undefined));
  client.use(ResponseTransformMiddleware);
  client.use(HttpStatusMiddleware);

  // ── 洋葱模型内层：Auth ──
  if (auth) {
    const getter =
      typeof auth === "function"
        ? auth
        : () => tokenManager.getAccessToken();
    client.use(createAuthMiddleware(getter));
  }

  return client;
}

// ── 应用启动时验证 token 有效性 ──

export interface VerifyAuthOptions {
  /** 请求基础路径，默认 "/api" */
  baseURL?: string;
  /** 刷新端点，默认 "/public/auth/refresh" */
  refreshEndpoint?: string;
  /** 登录页 URL，刷新失败时跳转 */
  loginPageUrl?: string;
  /** token 管理模式，默认 "localStorage" */
  tokenMode?: TokenMode;
  /** 透传 axios 配置 */
  axiosConfig?: AxiosRequestConfig;
  /** 外部 TokenManager 实例（用于共享 token 状态）；不传则内部自动创建 */
  tokenManager?: TokenManager;
}

/**
 * 应用启动时验证 token 有效性
 *
 * - 在 localStorage 模式下：读取 refreshToken 发起刷新，成功则更新 accessToken
 * - 在 cookie 模式下：浏览器自动携带 HTTP-only cookie，刷新成功则更新 accessToken
 * - 刷新失败时自动清除 token 并跳转登录页
 *
 * 推荐在 main.ts 中调用：
 * ```ts
 * const ok = await verifyAuth({ tokenMode: "memory" })
 * if (!ok) {  redirect to login  }
 * app.mount("#app")
 * ```
 * @returns true 表示 token 有效（已刷新或无需刷新），false 表示需要重新登录
 */
export async function verifyAuth(
  options: VerifyAuthOptions = {}
): Promise<boolean> {
  const {
    baseURL = "/api",
    refreshEndpoint = "/public/auth/refresh",
    loginPageUrl = "/login",
    tokenMode = "memory",
    axiosConfig,
    tokenManager: externalTokenManager,
  } = options;

  const tokenManager = externalTokenManager ?? new TokenManager({ mode: tokenMode });

  const refreshClient = new HttpClient({ baseURL, ...axiosConfig });

  // localStorage 模式：手动注入 refreshToken
  if (tokenMode === "localStorage") {
    const rt = tokenManager.getRefreshToken();
    if (!rt) {
      // 无 refreshToken 且无 accessToken → 未登录，无需跳转
      if (!tokenManager.getAccessToken()) return false;
      // 有 accessToken 但无 refreshToken → 无法刷新，清除 accessToken
      tokenManager.removeAccessToken();
      return false;
    }
    // 手动注入 refreshToken 到请求头
    refreshClient.use(createAuthMiddleware(() => rt));
  }
  // cookie / memory 模式：无需手动注入，浏览器自动携带 cookie

  refreshClient.use(createErrorMiddleware());
  refreshClient.use(ResponseTransformMiddleware);
  refreshClient.use(HttpStatusMiddleware);

  try {
    const res = await refreshClient.post(refreshEndpoint);
    const newToken = (res as any)?.data?.accessToken;
    if (newToken) {
      tokenManager.setAccessToken(newToken);
      return true;
    }
    return false;
  } catch {
    tokenManager.clearAll();
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== loginPageUrl
    ) {
      window.location.href = loginPageUrl;
    }
    return false;
  }
}
