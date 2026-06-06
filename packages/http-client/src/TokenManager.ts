import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, buildStorageKey } from "./constants";

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
 * TokenManager — 统一 token 存取（带 origin 作用域隔离）
 *
 * 支持两种模式（默认 localStorage）：
 * - localStorage: accessToken + refreshToken 都存 localStorage
 * - cookie: accessToken 存 localStorage，refreshToken 由后端 HTTP-only cookie 管理
 *
 * localStorage 的 key 默认以 window.location.origin 为前缀，避免不同网址缓存冲突。
 * 可通过 accessTokenKey / refreshTokenKey 手动指定完整 key 来覆盖此行为。
 */
export class TokenManager {
  private config: Required<TokenStorageConfig>;

  constructor(config?: TokenStorageConfig) {
    this.config = {
      mode: config?.mode ?? defaultConfig.mode,
      accessTokenKey:
        config?.accessTokenKey ?? buildStorageKey(defaultConfig.accessTokenKey),
      refreshTokenKey:
        config?.refreshTokenKey ?? buildStorageKey(defaultConfig.refreshTokenKey),
    };
  }

  /** 保存 refreshToken */
  setRefreshToken(token: string): void {
    if (this.config.mode !== "localStorage") return;
    try {
      window.localStorage.setItem(this.config.refreshTokenKey, token);
    } catch {
      // ignore
    }
  }

  /** 获取 refreshToken */
  getRefreshToken(): string | null {
    if (this.config.mode !== "localStorage") return null;
    try {
      return window.localStorage.getItem(this.config.refreshTokenKey);
    } catch {
      return null;
    }
  }

  /** 移除 refreshToken */
  removeRefreshToken(): void {
    if (this.config.mode !== "localStorage") return;
    try {
      window.localStorage.removeItem(this.config.refreshTokenKey);
    } catch {
      // ignore
    }
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

  /** 清除全部 token（accessToken + refreshToken） */
  clearAll(): void {
    this.removeAccessToken();
    this.removeRefreshToken();
  }
}