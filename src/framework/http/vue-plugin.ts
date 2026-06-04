import { type App, type InjectionKey } from 'vue'
import { createHttpClient } from './index'
import type { HttpClient } from './HttpClient'

/**
 * 注入 key —— 组件中可通过 inject(URL_KEY) 获取 $url 实例
 */
export const URL_KEY: InjectionKey<HttpClient> = Symbol('$url')

/**
 * 创建 HTTP Vue 插件
 *
 * 用法 (main.ts):
 * `	s
 * import { createHttpPlugin } from '@/framework/http'
 * app.use(createHttpPlugin())
 * `
 *
 * 组件中使用:
 * `	s
 * // 选项式 API
 * this.$url.get('/auth/getUserInfo')
 *
 * // 组合式 API
 * const $url = inject(URL_KEY)
 * $url.get('/auth/getUserInfo')
 * `
 */
export function createHttpPlugin(options?: {
  baseURL?: string
  device?: string
}) {
  // 委托给 createHttpClient——所有中间件自动配置
  const $url = createHttpClient({
    baseURL: options?.baseURL,
    device: options?.device
  })

  return {
    $url,
    install(app: App) {
      app.config.globalProperties.$url = $url
      app.provide(URL_KEY, $url)
    }
  }
}
