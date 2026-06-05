# @sisin/http-client

A elegant axios wrapper with onion-model (koa-style) middleware for Vue / React / TypeScript.

## Installation

```bash
npm install @sisin/http-client
```

Peer dependencies: `axios ^1.7.0`

Optional: `vue ^3.4.0` (for Vue plugin)

## Quick Start

```ts
import { createHttpClient } from "@sisin/http-client"

const http = createHttpClient()

async function main() {
  const user = await http.get("/api/user")
  console.log(user)
}
```

## Vue Integration

### Options API

**1. 在 `main.ts` 注册**

```ts
// main.ts
import { createApp } from "vue"
import App from "./App.vue"
import { createHttpPlugin } from "@sisin/http-client"

const app = createApp(App)
app.use(createHttpPlugin({ baseURL: "/api" }))
app.mount("#app")
```

**2. 在组件中用 `this.$url` 调用**

```vue
<script>
export default {
  data() {
    return { users: [] }
  },
  mounted() {
    this.test()
  },
  methods: {
    async test() {
      // this.$url 直接可用，不需任何 import
      const res = await this.$url.get("/api/users")
      this.users = res.data
    }
  }
}
</script>
```

`this.$url` 是 `HttpClient` 实例，可调用所有方法：`$url.post()` / `$url.put()` / `$url.delete()` 等。

---

### Composition API (`<script setup>`)

**1. 在 `main.ts` 注册**

```ts
// main.ts
import { createApp } from "vue"
import App from "./App.vue"
import { createHttpPlugin } from "@sisin/http-client"

const app = createApp(App)
app.use(createHttpPlugin({ baseURL: "/api" }))
app.mount("#app")
```

**2. 在组件中用 `inject(URL_KEY)` 调用**

```vue
<script setup lang="ts">
import { inject } from "vue"
import { URL_KEY } from "@sisin/http-client"

// 直接 inject 全局实例
const $url = inject(URL_KEY)!

async function fetchData() {
  const res = await $url.get("/api/users")
  console.log(res)
}
</script>
```

`URL_KEY` 就是 Vue 的 `InjectionKey<HttpClient>`，类型安全，自动推导返回值。

---

### 非组件文件使用（utils / store / router）

组件外（如 Pinia store、router guard、普通工具函数）无法用 `inject`，推荐自行创建实例并导出：

```ts
// utils/http.ts
import { createHttpClient } from "@sisin/http-client"

export const http = createHttpClient({
  baseURL: "/api",
  timeout: 10000,
})
```

任意文件中直接导入使用：

```ts
// stores/user.ts
import { http } from "@/utils/http"

export const useUserStore = defineStore("user", {
  actions: {
    async fetchUsers() {
      this.users = await http.get("/api/users")
    },
  },
})
```

或结合 Vue Plugin 同时使用（插件注入组件内，独立实例给外部）：

```ts
// main.ts — 两套方案互补
import { createApp } from "vue"
import App from "./App.vue"
import { createHttpPlugin } from "@sisin/http-client"
import { http } from "./utils/http"  // 非组件用

const app = createApp(App)
app.use(createHttpPlugin({ baseURL: "/api" }))
app.mount("#app")

// 需要时直接导给第三方库
export { http }
```

**Vue Plugin vs 独立实例 对比**

| | `createHttpPlugin`（推荐组件内） | `createHttpClient`（推荐组件外） |
|---|---|---|
| 组件 Options API | `this.$url` ✅ | 需手动 `import` |
| 组件 Composition API | `inject(URL_KEY)` ✅ | 需手动 `import` |
| 组件外（store/utils） | ❌ 不可用 | ✅ 直接 `import` |
| 内置中间件 | 全部链好（RefreshToken → Auth） | 由你控制（也可用预设） |

---

## Middleware Architecture (Onion Model)

Built-in middlewares (outer → inner):

```
RefreshToken → Error → HttpStatus → ResponseTransform → Device → Auth → [axios]
```

Request flows **inward**, response flows **outward**:
```
Request:   Refresh → Error → HTTP → Transform → Device → Auth → axios
Response:  Refresh ← Error ← HTTP ← Transform ← Device ← Auth ← axios
```

## API

### `createHttpClient(options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `baseURL` | `string` | `"/api"` | Base path for all requests |
| `timeout` | `number` | `10000` | Request timeout in ms |
| `device` | `string \| () => string` | `"pc"` | Device identifier (X-Device header) |
| `auth` | `boolean \| () => string \| null` | `true` | Token injection mode |
| `refresh` | `boolean` | `true` | Enable 401 auto-refresh |
| `onError` | `(ctx, error) => void` | `console.warn` | Global error handler |
| `axiosConfig` | `object` | `{}` | Pass-through native axios config |

### `HttpClient` Methods

- `request<T>(config)` — Generic request
- `get<T>(url, config?)`
- `post<T>(url, data?, config?)`
- `put<T>(url, data?, config?)`
- `patch<T>(url, data?, config?)`
- `delete<T>(url, config?)`
- `head<T>(url, config?)`
- `options<T>(url, config?)`
- `use(middleware)` — Register middleware
- `removeMiddleware(mw)` — Remove middleware by reference
- `clearMiddlewares()` — Clear all middlewares

### `createHttpPlugin(options?)` (Vue only)

Same options as `createHttpClient`, but returns a Vue plugin with `install(app)`.

## Custom Middleware

```ts
import type { HttpContext, HttpMiddleware } from "@sisin/http-client"

const myMiddleware: HttpMiddleware = async (ctx, next) => {
  console.time(ctx.config.url!)
  await next()
  console.timeEnd(ctx.config.url!)
}

http.use(myMiddleware)
```

## Error Hierarchy

```
BaseError
 ├── HttpError        (HTTP status errors)
 ├── AuthError        (401 Unauthorized)
 ├── BusinessError    (API-level business errors)
 └── NetworkError     (Network failures)
```
