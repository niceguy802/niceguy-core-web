// 中间件管理器-洋葱模型
import type { HttpMiddleware } from './types'

export class MiddlewareManager {

    private middlewares: HttpMiddleware[] = []
    // 添加中间件
    use(middleware: HttpMiddleware) {
        this.middlewares.push(middleware)
    }
    // 获取中间件列表
    getMiddlewares() {
        return this.middlewares
    }
}