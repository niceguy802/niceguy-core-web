export const ACCESS_TOKEN_KEY = "niceguy_core_web_access_token";
export const REFRESH_TOKEN_KEY = "niceguy_core_web_refresh_token";

/** 默认的基础路径 */
export const DEFAULT_BASE_URL = "/api";

/** 默认超时时间 (ms) */
export const DEFAULT_TIMEOUT = 10000;

/** Vue 注入 key */
export const URL_KEY = Symbol("$url");

/**
 * 获取当前页面 origin（协议 + 主机 + 端口），用于 token key 隔离
 * SSR 等无法访问 window 的场景下返回空字符串
 */
function getOriginPrefix(): string {
  try {
    return window.location.origin;
  } catch {
    return "";
  }
}

/**
 * 构造带 origin 前缀的完整存储 key
 *
 * 格式：<origin>:<baseKey>，例如 "http://localhost:3000:niceguy_core_web_access_token"
 * 无 origin（SSR）时直接返回 baseKey
 */
export function buildStorageKey(baseKey: string): string {
  const prefix = getOriginPrefix();
  return prefix ? `${prefix}:${baseKey}` : baseKey;
}