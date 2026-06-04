// 类型定义
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
/**
 * 请求参数
 * baseURL: 请求的基础URL
 * timeout: 请求的超时时间
 * token: 请求的token
 */
export interface RequestConfig {
  baseURL?: string
  timeout?: number
  token?: string
}
/**
 * api接口响应数据结构
 * code: 状态码
 * message: 状态信息
 * data: 响应数据
 * success: 是否成功
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  success: boolean
}

/**
 * 拦截器类型
* request: 请求拦截器
* requestError: 请求错误拦截器
* response: 响应拦截器
* responseError: 响应错误拦截器
 */
export interface HttpInterceptor {
  request?(
    config: AxiosRequestConfig
  ): AxiosRequestConfig | Promise<AxiosRequestConfig>

  requestError?(error: any): any

  response?(
    response: AxiosResponse
  ): AxiosResponse | Promise<AxiosResponse>

  responseError?(error: any): any
}
/**
 * 定义上下文类型
 * config: 请求配置
 * response: 响应数据
 * error: 错误信息
 */
export interface HttpContext<T = any> {
  config: AxiosRequestConfig
  response?: AxiosResponse<T>
  result?: T
  error?: unknown
  metadata: {
    startTime?: number
    endTime?: number
    retryCount?: number
  }
}
export type Next = () => Promise<void>

// 定义中间件类型
export type HttpMiddleware = (
  ctx: HttpContext,
  next: Next
) => Promise<void>