import type { AxiosRequestConfig, AxiosResponse } from "axios";

/**
 * API 响应通用结构
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
  success: boolean;
}

/**
 * 请求配置 — 继承 AxiosRequestConfig，允许透传所有原生 axios 选项
 */
export type RequestConfig = AxiosRequestConfig;

/**
 * 拦截器类型（classic axios interceptor shape）
 */
export interface HttpInterceptor {
  request?(
    config: AxiosRequestConfig
  ): AxiosRequestConfig | Promise<AxiosRequestConfig>;
  requestError?(error: unknown): unknown;
  response?(
    response: AxiosResponse
  ): AxiosResponse | Promise<AxiosResponse>;
  responseError?(error: unknown): unknown;
}

/**
 * 中间件上下文
 */
export interface HttpContext<T = unknown> {
  config: AxiosRequestConfig;
  response?: AxiosResponse<T>;
  result?: T;
  error?: unknown;
  metadata: {
    startTime?: number;
    endTime?: number;
    retryCount?: number;
  };
}

export type Next = () => Promise<void>;

/**
 * 中间件函数签名
 */
export type HttpMiddleware = (
  ctx: HttpContext,
  next: Next
) => Promise<void>;
