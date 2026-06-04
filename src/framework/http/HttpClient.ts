// http客户端，支持中间件
import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { MiddlewareManager } from './MiddlewareManager';
import { compose } from './compose';
import { AxiosAdapter } from './adapters/AxiosAdapter';
import type { HttpMiddleware, HttpContext, RequestConfig } from './types'

export class HttpClient {
  private instance;
  private adapter
  private middlewareManager;
  /** 编译好的中间件链缓存（含 terminal），中间件变化时重建 */
  private compiledChain: HttpMiddleware[] | null = null

  constructor(config: RequestConfig) {
    this.instance = axios.create({
      validateStatus: () => true,
      ...config
    });
    this.middlewareManager = new MiddlewareManager()
    this.adapter = new AxiosAdapter(this.instance)
  }

  use(middleware: HttpMiddleware) {
    this.middlewareManager.use(middleware)
    this.compiledChain = null // 标记缓存失效
  }

  private rebuildChain() {
    const terminal: HttpMiddleware = async (ctx: HttpContext) => {
      ctx.response = await this.adapter.request(ctx.config)
    }
    this.compiledChain = [
      ...this.middlewareManager.getMiddlewares(),
      terminal
    ]
  }

  /**
   * 请求方法，经过中间件链处理后返回业务数据 T
   * - 若注册了 ResponseTransformMiddleware，返回解包后的 data（T）
   * - 否则返回 response.data
   */
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const ctx: HttpContext<T> = {
      config,
      metadata: {}
    }

    if (!this.compiledChain) {
      this.rebuildChain()
    }
    await compose(this.compiledChain!, ctx)
    return (ctx.result ?? ctx.response?.data) as T
  }

  get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, url, method: 'GET' })
  }

  post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ) {
    return this.request<T>({ ...config, url, data, method: 'POST' })
  }
}
