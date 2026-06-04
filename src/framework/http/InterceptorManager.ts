// 拦截器
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

import type { HttpInterceptor } from './types'

export class InterceptorManager {

  private interceptors: HttpInterceptor[] = []

  use(interceptor: HttpInterceptor) {
    this.interceptors.push(interceptor)
  }
  /**
   * 拦截请求
   * @param config 
   * @returns config 处理后的请求配置
   */
  async runRequest(config: AxiosRequestConfig) {

    let currentConfig = config

    for (const interceptor of this.interceptors) {
      if (interceptor.request) {

        currentConfig = await interceptor.request(currentConfig)
      }
    }

    return currentConfig
  }
  /**
   * 拦截响应
   * @param response 
   * @returns response 处理后的响应
   */
  async runResponse(response: AxiosResponse) {

    let currentResponse = response

    for (const interceptor of this.interceptors) {
      if (interceptor.response) {
        currentResponse = await interceptor.response(currentResponse)
      }
    }

    return currentResponse
  }

}