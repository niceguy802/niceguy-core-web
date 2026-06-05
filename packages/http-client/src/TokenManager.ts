import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "./constants";

export type TokenMode = "localStorage" | "cookie";

export interface TokenStorageConfig {
  mode: TokenMode;
  accessTokenKey?: string;
  refreshTokenKey?: string;
}

const defaultConfig: Required<TokenStorageConfig> = {
  mode: "localStorage",
  accessTokenKey: ACCESS_TOKEN_KEY,
  refreshTokenKey: REFRESH_TOKEN_KEY,
};

/**
 * TokenManager — 统一 token 存取
 *
 * 支持两种模式：
 * - localStorage: accessToken + refreshToken 都存 localStorage
 * - cookie: accessToken 存 localStorage，refreshToken 由后端在 HTTP-only cookie 中管理
 */
export class TokenManager {
  private config: Required<TokenStorageConfig>;

  constructor(config?: TokenStorageConfig) {
    this.config = { ...defaultConfig, ...config };
    if (this.config.accessTokenKey === undefined) this.config.accessTokenKey = defaultConfig.accessTokenKey;
    if (this.config.refreshTokenKey === undefined) this.config.refreshTokenKey = defaultConfig.refreshTokenKey;
  }

  /** 保存 accessToken */
  setAccessToken(token: string): void {
    try {
      window.localStorage.setItem(this.config.accessTokenKey, token);
    } catch {
      // localStorage 不可用（SSR / 隐私模式）
    }
  }

  /** 获取 accessToken */
  getAccessToken(): string | null {
    try {
      return window.localStorage.getItem(this.config.accessTokenKey);
    } catch {
      return null;
    }
  }

  /** 移除 accessToken */
  removeAccessToken(): void {
    try {
      window.localStorage.removeItem(this.config.accessTokenKey);
    } catch {
      // ignore
    }
  }

  /**
   * 保存 refreshToken
   * localStorage 模式: 存到 localStorage
   * cookie 模式: 由后端管理，前端不保存（调用此方法无操作）
   */
  setRefreshToken(token: string): void {
    if (this.config.mode === "localStorage") {
      try {
        window.localStorage.setItem(this.config.refreshTokenKey, token);
      } catch {
        // ignore
      }
    }
    // cookie 模式下 refreshToken 由后端管理
  }

  /** 获取 refreshToken */
  getRefreshToken(): string | null {
    if (this.config.mode === "localStorage") {
      try {
        return window.localStorage.getItem(this.config.refreshTokenKey);
      } catch {
        return null;
      }
    }
    // cookie 模式下访问 refreshToken 由浏览器自动发送，前端无需获取
    return null;
  }

  /** 移除 refreshToken */
  removeRefreshToken(): void {
    if (this.config.mode === "localStorage") {
      try {
        window.localStorage.removeItem(this.config.refreshTokenKey);
      } catch {
        // ignore
      }
    }
  }

  /** 清除全部 token */
  clearAll(): void {
    this.removeAccessToken();
    this.removeRefreshToken();
  }
}
