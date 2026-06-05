import type { HttpContext, HttpMiddleware } from "../types";
import { AuthError, BusinessError, HttpError, NetworkError } from "../errors";

// ── 错误码判断 ──

/** 需要刷新 token 的业务状态码（accessToken 过期） */
const REFRESH_CODES = [40101];

/** 需要重新登录的业务状态码 */
const RELOGIN_CODES = [401, 40102, 40103, 40104, 40301];

/** 判断 BusinessError 是否因 token 过期（需要刷新） */
const isRefreshableError = (error: unknown): boolean => {
  if (error instanceof BusinessError) {
    const code = Number(error.code);
    return REFRESH_CODES.includes(code) || RELOGIN_CODES.includes(code);
  }
  return false;
};

/** 判断 BusinessError 是否要求重新登录 */
const isReLoginError = (error: unknown): boolean => {
  if (error instanceof BusinessError) {
    return RELOGIN_CODES.includes(Number(error.code));
  }
  return false;
};

// ── Options ──

export interface RefreshTokenOptions {
  /** 获取当前 refreshToken */
  getRefreshToken: () => string | null;
  /** 执行刷新，返回新的 accessToken */
  refreshToken: () => Promise<string>;
  /** 刷新成功回调 */
  onRefreshSuccess?: (newToken: string) => void;
  /** 刷新失败回调 */
  onRefreshError?: (error: unknown) => void;
  /** 需要重新登录时的回调（如跳转登录页） */
  onReLogin?: () => void;
  /** 登录页 URL（onReLogin 未设置时，默认跳转此路径） */
  loginPageUrl?: string;
  /** 最大重试次数（防止死循环），默认 1 */
  maxRetries?: number;
}

// ── Middleware ──

export const createRefreshTokenMiddleware = (
  options: RefreshTokenOptions
): HttpMiddleware => {
  const {
    maxRetries = 1,
    loginPageUrl = "/login",
  } = options;

  // 跨请求共享的刷新 Promise（防止并发刷新）
  let pendingRefresh: Promise<string> | null = null;

  /**
   * 触发重新登录
   * 清除 token 后，调用 onReLogin 或跳转登录页
   */
  const triggerReLogin = () => {
    options.onRefreshError?.(new Error("登录已过期，请重新登录"));
    options.onReLogin?.();
    if (!options.onReLogin && typeof window !== "undefined") {
      if (window.location.pathname !== loginPageUrl) {
        window.location.href = loginPageUrl;
      }
    }
  };

  return async (ctx: HttpContext, next: () => Promise<void>) => {
    try {
      await next();
    } catch (error) {
      // ── 判断是否需要进入刷新流程 ──

      const isAuthErr = error instanceof AuthError;
      const isBizAuthErr = isRefreshableError(error);

      if (!isAuthErr && !isBizAuthErr) {
        throw error; // 非认证错误 → 透传
      }

      // ── 检查是否有 refreshToken（仅 localStorage 模式） ──

      const refreshToken = options.getRefreshToken();
      if (!refreshToken && isAuthErr) {
        // localStorage 模式且没有 refreshToken → 直接重新登录
        triggerReLogin();
        throw error;
      }

      // ── 业务码判断：40101 才需要刷新，其他 401xx 直接重新登录 ──

      if (isBizAuthErr && isReLoginError(error)) {
        triggerReLogin();
        throw error;
      }

      // ── 执行刷新（或等待正在进行的刷新） ──

      try {
        if (!pendingRefresh) {
          pendingRefresh = options.refreshToken().finally(() => {
            pendingRefresh = null;
          });
        }

        const newToken = await pendingRefresh;
        options.onRefreshSuccess?.(newToken);

        // 更新当前请求的 Authorization
        if (ctx.config.headers) {
          (ctx.config.headers as Record<string, string>).Authorization =
            `Bearer ${newToken}`;
        } else {
          ctx.config.headers = {
            Authorization: `Bearer ${newToken}`,
          } as never;
        }

        // 清空结果，允许 retry 重新填充
        ctx.response = undefined;
        ctx.result = undefined;

        // 重试原请求
        await next();
      } catch (refreshError) {
        // 刷新失败 → 需要重新登录
        triggerReLogin();
        throw error; // 抛出原始 AuthError/BusinessError
      }
    }
  };
};
