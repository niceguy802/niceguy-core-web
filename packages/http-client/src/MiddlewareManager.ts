import type { HttpMiddleware } from "./types";

/**
 * 中间件管理器 — 洋葱模型
 *
 * 支持添加、移除、清空、以及在指定位置插入中间件。
 */
export class MiddlewareManager {
  private middlewares: HttpMiddleware[] = [];

  /** 在末尾添加中间件 */
  use(middleware: HttpMiddleware): void {
    this.middlewares.push(middleware);
  }

  /** 按引用移除第一个匹配的中间件 */
  remove(middleware: HttpMiddleware): boolean {
    const idx = this.middlewares.indexOf(middleware);
    if (idx === -1) return false;
    this.middlewares.splice(idx, 1);
    return true;
  }

  /** 清空所有中间件 */
  removeAll(): void {
    this.middlewares = [];
  }

  /** 在指定中间件之前插入 */
  insertBefore(target: HttpMiddleware, middleware: HttpMiddleware): boolean {
    const idx = this.middlewares.indexOf(target);
    if (idx === -1) return false;
    this.middlewares.splice(idx, 0, middleware);
    return true;
  }

  /** 在指定中间件之后插入 */
  insertAfter(target: HttpMiddleware, middleware: HttpMiddleware): boolean {
    const idx = this.middlewares.indexOf(target);
    if (idx === -1) return false;
    this.middlewares.splice(idx + 1, 0, middleware);
    return true;
  }

  /** 获取中间件列表（浅拷贝） */
  getMiddlewares(): HttpMiddleware[] {
    return [...this.middlewares];
  }
}
