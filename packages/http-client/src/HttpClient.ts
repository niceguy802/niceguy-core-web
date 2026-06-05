import type { AxiosRequestConfig, AxiosInstance } from "axios";
import axios from "axios";
import { MiddlewareManager } from "./MiddlewareManager";
import { compose } from "./compose";
import { AxiosAdapter } from "./adapters/AxiosAdapter";
import type { HttpMiddleware, HttpContext } from "./types";

export class HttpClient {
  private axiosInstance: AxiosInstance;
  private adapter: AxiosAdapter;
  private middlewareManager: MiddlewareManager;
  private compiledChain: HttpMiddleware[] | null = null;

  constructor(config: AxiosRequestConfig = {}) {
    this.axiosInstance = axios.create({
      validateStatus: () => true,
      ...config,
    });
    this.middlewareManager = new MiddlewareManager();
    this.adapter = new AxiosAdapter(this.axiosInstance);
  }

  use(middleware: HttpMiddleware): void {
    this.middlewareManager.use(middleware);
    this.compiledChain = null;
  }

  removeMiddleware(middleware: HttpMiddleware): boolean {
    const result = this.middlewareManager.remove(middleware);
    if (result) this.compiledChain = null;
    return result;
  }

  clearMiddlewares(): void {
    this.middlewareManager.removeAll();
    this.compiledChain = null;
  }

  get axios(): AxiosInstance {
    return this.axiosInstance;
  }

  private rebuildChain(): void {
    const terminal: HttpMiddleware = async (ctx: HttpContext) => {
      ctx.response = await this.adapter.request(ctx.config);
    };
    this.compiledChain = [
      ...this.middlewareManager.getMiddlewares(),
      terminal,
    ];
  }

  async request<T = unknown>(
    config: AxiosRequestConfig
  ): Promise<T> {
    const ctx: HttpContext<T> = {
      config,
      metadata: {},
    };

    if (!this.compiledChain) {
      this.rebuildChain();
    }
    await compose(this.compiledChain!, ctx);
    return (ctx.result ?? ctx.response?.data) as T;
  }

  get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, url, method: "GET" });
  }

  post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, url, data, method: "POST" });
  }

  put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, url, data, method: "PUT" });
  }

  patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, url, data, method: "PATCH" });
  }

  delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, url, method: "DELETE" });
  }

  head<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, url, method: "HEAD" });
  }

  options<T = unknown>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, url, method: "OPTIONS" });
  }
}
