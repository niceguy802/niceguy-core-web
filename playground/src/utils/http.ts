import { createHttpClient, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, buildStorageKey, TokenManager } from "@sisin/http-client";
import type { ApiResponse } from "@sisin/http-client";

export type { ApiResponse };
export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, buildStorageKey };

// ── 全局 TokenManager 实例（传入 createHttpClient 实现状态共享）──
export const tokenManager = new TokenManager({ mode: "memory" });

// ── 全局 HTTP 客户端实例（单例）──
// 所有 API 模块共享此实例，避免重复创建
export const http = createHttpClient({
  baseURL: "/api",
  timeout: 10000,
  tokenMode: "memory",
  loginEndpoint: "/public/auth/login",
  refreshEndpoint: "/public/auth/refresh",
  // 传入已创建的 TokenManager，使 getTokenStatus / clearTokens 与内部状态同步
  tokenManager,
});

/** Token 状态查询（供组件展示用） */
export function getTokenStatus() {
  const at = tokenManager.getAccessToken();
  return { accessToken: at, refreshToken: "(HTTP-only cookie)", loggedIn: !!at };
}

/** 清除所有 Token */
export function clearTokens() {
  tokenManager.clearAll();
  try {
    window.localStorage.removeItem(buildStorageKey(ACCESS_TOKEN_KEY));
    window.localStorage.removeItem(buildStorageKey(REFRESH_TOKEN_KEY));
  } catch { /* ignore */ }
}
