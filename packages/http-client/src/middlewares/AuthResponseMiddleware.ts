import type { HttpContext, HttpMiddleware } from "../types";
import type { TokenManager } from "../TokenManager";

export interface AuthResponseOptions {
  tokenManager: TokenManager;
  /** 登录接口 URL 正则或字符串，匹配到的响应会自动提取 token */
  loginEndpoint?: RegExp | string;
  /** 刷新接口 URL 正则或字符串 */
  refreshEndpoint?: RegExp | string;
  /** 响应 data 中 accessToken 的字段名，默认 "accessToken" */
  accessTokenField?: string;
  /** 响应 data 中 refreshToken 的字段名，默认 "refreshToken" */
  refreshTokenField?: string;
}

/**
 * AuthResponseMiddleware
 *
 * 拦截登录/刷新响应，自动提取 token → 保存到 TokenManager → 从响应中剥离
 * 业务代码收到的 data 中不会有 token，只看到 { success: true } 或原始业务数据
 *
 * 中间件位置：应在 refreshToken 和 error 之间（外层），保证在所有响应处理前执行
 */
export const createAuthResponseMiddleware = (
  options: AuthResponseOptions
): HttpMiddleware => {
  const {
    tokenManager,
    loginEndpoint = "/public/auth/login",
    refreshEndpoint = "/public/auth/refresh",
    accessTokenField = "accessToken",
    refreshTokenField = "refreshToken",
  } = options;

  const matchEndpoint = (url: string | undefined, pattern: RegExp | string): boolean => {
    if (!url) return false;
    if (typeof pattern === "string") return url.includes(pattern);
    return pattern.test(url);
  };

  return async (ctx: HttpContext, next: () => Promise<void>) => {
    await next();

    const url = ctx.config.url;
    const body = ctx.response?.data as Record<string, unknown> | undefined;

    if (!body || typeof body !== "object") return;

    // 检查是否匹配登录/刷新端点
    const isLogin = matchEndpoint(url, loginEndpoint);
    const isRefresh = matchEndpoint(url, refreshEndpoint);
    if (!isLogin && !isRefresh) return;

    // 响应必须成功
    if (body.success !== true) return;

    // 从 data 中提取 token
    const rawData = body.data as Record<string, unknown> | undefined;
    if (!rawData || typeof rawData !== "object") return;

    const accessToken = rawData[accessTokenField] as string | undefined;
    const refreshToken = rawData[refreshTokenField] as string | undefined;

    if (!accessToken) return; // 响应中没有 token → 不做处理

    // 保存 token
    tokenManager.setAccessToken(accessToken);
    if (refreshToken) {
      tokenManager.setRefreshToken(refreshToken);
    }

    // 从响应 data 中剥离 token 字段，不让业务代码看到
    const remainingKeys = Object.keys(rawData).filter(
      (k) => k !== accessTokenField && k !== refreshTokenField
    );

    if (remainingKeys.length === 0) {
      // data 中只有 token，没有业务数据 → 返回 null
      (body as Record<string, unknown>).data = null;
    } else {
      // data 中还有业务数据 → 保留
      const cleaned: Record<string, unknown> = {};
      for (const key of remainingKeys) {
        cleaned[key] = rawData[key];
      }
      (body as Record<string, unknown>).data = cleaned;
    }
  };
};
