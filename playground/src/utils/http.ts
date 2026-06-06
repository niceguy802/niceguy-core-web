import { createHttpClient, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, buildStorageKey } from "@sisin/http-client";
import type { ApiResponse } from "@sisin/http-client";

export type { ApiResponse };
export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, buildStorageKey };

// ── 全局 HTTP 客户端实例（单例）──
// 所有 API 模块共享此实例，避免重复创建
export const http = createHttpClient({
  baseURL: "/api",
  timeout: 10000,
  tokenMode: "cookie",
  loginEndpoint: "/public/auth/login",
  refreshEndpoint: "/public/auth/refresh",
});

/** Token 状态查询（供组件展示用） */
export function getTokenStatus() {
  let at: string | null = null;
  let rt: string | null = null;
  try {
    at = window.localStorage.getItem(buildStorageKey(ACCESS_TOKEN_KEY));
    rt = window.localStorage.getItem(buildStorageKey(REFRESH_TOKEN_KEY));
  } catch { /* SSR / 隐私模式 */ }
  return { accessToken: at, refreshToken: rt, loggedIn: !!at };
}

/** 清除所有 Token */
export function clearTokens() {
  try {
    window.localStorage.removeItem(buildStorageKey(ACCESS_TOKEN_KEY));
    window.localStorage.removeItem(buildStorageKey(REFRESH_TOKEN_KEY));
  } catch { /* ignore */ }
}