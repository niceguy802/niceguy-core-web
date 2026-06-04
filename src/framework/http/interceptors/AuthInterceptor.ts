// 用户登录状态拦截器
import type { HttpInterceptor } from '../types'

export class AuthInterceptor implements HttpInterceptor {
    constructor(private getToken: () => string) { }

    request(config) {
        const token = this.getToken()
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    }
}