# @sisin/http-client
基于 axios 的洋葱模型（koa-style）中间件 HTTP 客户端，支持 Vue 3 / React / 原生 TypeScript / JavaScript 项目。

## 目录
+ [简介](#简介)
+ [依赖说明](#依赖说明)
+ [支持的项目类型](#支持的项目类型)
+ [安装](#安装)
+ [快速开始](#快速开始)
+ [Vue 3 集成](#vue-3-集成)
+ [React 集成](#react-集成)
+ [原生 JS / TS 项目](#原生-js--ts-项目)
+ [配置选项](#配置选项)
+ [Token 管理](#token-管理)
+ [内置中间件详解](#内置中间件详解)
+ [自定义中间件](#自定义中间件)
+ [错误处理](#错误处理)
+ [启动时验证 Token](#启动时验证-token)
+ [扩展功能](#扩展功能)
+ [API 参考](#api-参考)

---

## 简介

**@sisin/http-client** 是一个基于 axios、采用 koa 风格洋葱模型的 HTTP 客户端库。它的核心功能包括：

- **可插拔的中间件体系** — 内置 RefreshToken（自动刷新）、Auth（注入 Authorization 头）、ResponseTransform（解析后端统一响应格式）、HttpStatus（按状态码抛错）、Error（分类日志）等 6 个中间件，也支持自定义中间件，并通过 MiddlewareManager 精确控制注册顺序。
- **一站式 Token 管理** — 支持 memory / localStorage / cookie 三种存取模式，提供 TokenManager 统一存取、AuthResponseMiddleware 自动在登录/刷新响应中提取 token、以及 verifyAuth 启动时验证 Token 有效性。
- **框架无关 + Vue 3 / React 集成** — 核心客户端与框架解耦，原生 JS/TS 项目可直接使用；Vue 3 提供 createHttpPlugin 插件（this.$url / inject(URL_KEY)），React 可搭配自定义 Hook。
- **丰富的扩展中间件** — 开箱提供 LoadingMiddleware（全局 loading 状态）、LoggerMiddleware（请求耗时日志）、RetryMiddleware（网络/5xx 自动重试）。
- **完整的错误继承体系** — BaseError → HttpError / AuthError / BusinessError / NetworkError，支持按类型精确捕获和全局 onError 钩子。


---

## 依赖说明
### 生产依赖（peerDependencies）
| 包名 | 版本 | 必填 | 说明 |
| --- | --- | --- | --- |
| `axios` | `^1.7.0` | **是** | HTTP 请求核心库，需使用者自行安装 |


### 可选依赖
| 包名 | 版本 | 说明 |
| --- | --- | --- |
| `vue` | `^3.4.0` | 仅在需要 Vue 插件功能时安装（如 `createHttpPlugin` / `inject(URL_KEY)`） |


### 开发依赖（devDependencies）
| 包名 | 用途 |
| --- | --- |
| `typescript` | 类型检查与声明文件生成 |
| `vite` | 构建 |
| `vitest` + `happy-dom` | 单元测试 |


---

## 支持的项目类型
### Vue 3 项目（推荐）
完整的 Vue 3 插件支持，包括 Composition API 和 Options API。

### React 项目
HttpClient 本身是框架无关的，React 项目可直接使用 `createHttpClient`，推荐搭配自定义 Hook 使用。

### 原生 TypeScript / JavaScript 项目
不依赖任何框架，直接在 Node.js 或浏览器环境中使用。

### 注意事项
+ **不支持 Vue 2**：Vue 插件基于 `app.provide/inject`（Vue 3 特有 API）。
+ **不支持 SSR**：`TokenManager` 和部分中间件依赖 `window` / `localStorage` 浏览器 API。

---

## 安装
```bash
npm install @sisin/http-client

# 补充安装必选 peer 依赖
npm install axios

# 可选：如需 Vue 插件功能
npm install vue@^3.4.0
```

---

## 快速开始
### 最简单的使用方式
```typescript
import { createHttpClient } from "@sisin/http-client"

const http = createHttpClient()

// GET 请求
const list = await http.get("/api/user", { params: { page: 1, size: 10 } })
// → GET /api/user?page=1&size=10

// POST 请求
const res = await http.post("/api/login", { username, password })
```

`createHttpClient` 会自动注册以下内置中间件：

```
RefreshToken → AuthResponse → Error → ResponseTransform → HttpStatus → Auth → [axios]
```

请求从外到内流入，响应从内到外流出：

```
请求方向：RefreshToken → AuthResponse → Error → ... → Auth → axios
响应方向：RefreshToken ← AuthResponse ← Error ← ... ← Auth ← axios
```

### 传递 axios 原生配置
```typescript
const http = createHttpClient({
  baseURL: "/api",
  timeout: 30000,
  axiosConfig: {
    withCredentials: true,  // 跨域携带 cookie
    responseType: "json",
  },
})
```

---

## Vue 3 集成
本包为 Vue 3 提供两种使用方式，可结合使用：

1. **Vue Plugin（推荐组件内使用）**：通过 `createHttpPlugin` 注册全局 HttpClient，组件内直接用 `this.$url` 或 `inject(URL_KEY)`。
2. **独立实例（推荐组件外使用）**：通过 `createHttpClient` 创建单例，在 store / router guard / utils 中直接引入。

### 方式一：Vue Plugin（推荐在组件内使用）
#### 在 main.ts 中注册
```typescript
import { createApp } from "vue"
import App from "./App.vue"
import { createHttpPlugin } from "@sisin/http-client"

const app = createApp(App)
app.use(createHttpPlugin({
  baseURL: "/api",
  // 支持所有 createHttpClient 的配置选项
  timeout: 10000,
  tokenMode: "memory", // token 存储模式：memory / localStorage / cookie，详情看 Token 管理
  loginEndpoint: "/public/auth/login",
  refreshEndpoint: "/public/auth/refresh",
}))
app.mount("#app")
```

#### Options API（`this.$url`）
```vue
<script>
export default {
  data() {
    return { users: [] }
  },
  mounted() {
    this.fetchUsers()
  },
  methods: {
    async fetchUsers() {
      const res = await this.$url.get("/api/users")
      this.users = res.data
    },
  },
}
</script>

```

`this.$url` 是 `HttpClient` 实例，支持所有 HTTP 方法：`$url.post()` / `$url.put()` / `$url.delete()` 等。

#### Composition API（`inject(URL_KEY)`）
```vue
<script setup lang="ts">
import { inject } from "vue"
import { URL_KEY } from "@sisin/http-client"

const $url = inject(URL_KEY)!

async function fetchData() {
  const res = await $url.get("/api/users")
  console.log(res)
}
</script>

```

`URL_KEY` 是类型安全的 `InjectionKey<HttpClient>`，自动推导返回类型。

### 方式二：独立实例（推荐在组件外使用）
在组件的代码文件（如 Pinia store、路由守卫、工具函数）中无法使用 `inject`，推荐自行创建实例并导出。

```typescript
// utils/http.ts
import { createHttpClient, TokenManager } from "@sisin/http-client"

// ── 全局 TokenManager 实例（传入 createHttpClient 实现状态共享）──
export const tokenManager = new TokenManager({ mode: "memory" })

export const http = createHttpClient({
  baseURL: "/api",
  timeout: 10000,
  tokenManager,
})
```

其他文件直接引入：

```typescript
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

### 同时使用 Plugin 和独立实例
两者互补，组件内用 Plugin 注入，组件外用独立实例：

```typescript
// main.ts
import { createApp } from "vue"
import App from "./App.vue"
import { createHttpPlugin } from "@sisin/http-client"
import { http } from "./utils/http"

const app = createApp(App)
app.use(createHttpPlugin({ baseURL: "/api" }))
app.mount("#app")

export { http }  // 导出让其他模块使用
```

### Vue Plugin vs 独立实例 对比
| 场景 | `createHttpPlugin`（组件内） | `createHttpClient`（组件外） |
| --- | --- | --- |
| Options API | `this.$url` ✅ | 需手动 import |
| Composition API | `inject(URL_KEY)` ✅ | 需手动 import |
| 组件外（store / utils / router） | ❌ 不可用 | ✅ 直接 import |
| 内置中间件 | 全部链好（Refresh → Auth） | 由你控制 |


---

## React 集成
HttpClient 与框架无关，React 项目直接使用 `createHttpClient`。

### 创建实例
```typescript
// utils/http.ts
import { createHttpClient } from "@sisin/http-client"

export const http = createHttpClient({
  baseURL: "/api",
  timeout: 10000,
})
```

### 搭配自定义 Hook
```tsx
// hooks/useRequest.ts
import { useState, useCallback } from "react"
import { http } from "../utils/http"

export function useRequest<T = unknown>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<T>(url)
      setData(res)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [url])

  return { data, loading, error, run }
}
```

### 组件中使用
```tsx
function UserList() {
  const { data, loading, run } = useRequest("/api/users")

  useEffect(() => { run() }, [])

  if (loading) return <div>Loading...</div>
  return <div>{JSON.stringify(data)}</div>
}
```

---

## 原生 JS / TS 项目
不依赖任何框架，直接在浏览器或 Node.js 中使用。

```typescript
import { createHttpClient } from "@sisin/http-client"

const http = createHttpClient({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
})

// 直接使用
const data = await http.get("/data")
```

---

## 配置选项
`createHttpClient(options)` 和 `createHttpPlugin(options)` 接受相同的配置选项。

### 基础配置
| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `baseURL` | `string` | `"/api"` | 请求基础路径 |
| `timeout` | `number` | `10000` | 超时时间（毫秒） |
| `axiosConfig` | `AxiosRequestConfig` | `{}` | 透传 axios 原生配置（如 `withCredentials`） |


### 认证配置
| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `auth` | `boolean \| () => string \| null` | `true` | `true`：自动从 tokenManager 读取 accessToken；`false`：不注入；函数：自定义 token 获取逻辑 |
| `refresh` | `boolean` | `true` | 是否启用 401 / 40101 自动刷新 Token |
| `tokenMode` | `"localStorage" \| "cookie" \| "memory"` | `"memory"` | Token 管理模式（详见 Token 管理章节） |
| `loginEndpoint` | `string` | `-` | 登录接口路径，设置后 AuthResponseMiddleware 自动提取并保存 token |
| `refreshEndpoint` | `string` | `-` | 刷新接口路径，设置后 AuthResponseMiddleware 自动提取并保存新 token |
| `tokenKeys` | `{ accessToken?, refreshToken? }` | `-` | 自定义 localStorage 存储 key，默认以 `window.location.origin` 为前缀隔离 |
| `tokenManager` | `TokenManager` | `-` | 外部 TokenManager 实例，传入后与 createHttpClient / verifyAuth 共享 token 状态，常用于 memory 模式同步状态给路由守卫 |


### 错误与重新登录配置
| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `onError` | `(ctx, error) => void` | `console.warn` | 全局错误处理钩子 |
| `onReLogin` | `() => void` | `-` | 需要重新登录时的回调（如跳转登录页） |
| `loginPageUrl` | `string` | `"/login"` | 登录页 URL，`onReLogin` 未设置时自动跳转此路径 |


### 自定义刷新行为
可通过 `refreshOptions` 完全覆盖默认刷新逻辑：

```typescript
const http = createHttpClient({
  refreshOptions: {
    getRefreshToken: () => localStorage.getItem("my_rt"),
    refreshToken: async () => {
      const res = await fetch("/api/refresh", { method: "POST" })
      const body = await res.json()
      return body.data.accessToken  // 刷新接口预期返回 { success, data: { accessToken } }
    },
    onRefreshSuccess: (newToken) => {
      localStorage.setItem("my_at", newToken)
    },
    onRefreshError: () => {
      localStorage.removeItem("my_at")
    },
  },
})
```

---

## Token 管理
本包通过 `TokenManager` 实现统一的 Token 存取，支持三种模式。

### memory 模式（默认）
`accessToken` 存在内存（供前端注入 `Authorization` 头），`refreshToken` 由后端通过 HTTP-only cookie 管理（浏览器自动携带，前端无需处理）。**页面刷新后 accessToken 丢失**，需要在 app mount 前调用 `verifyAuth` 重新获取，并传入同一个 `tokenManager` 实例，才能使 `verifyAuth` 刷新后的 token 同步到 `http` 实例。

```typescript
// utils/http.ts
import { createHttpClient, TokenManager } from "@sisin/http-client"

export const tokenManager = new TokenManager({ mode: "memory" })

export const http = createHttpClient({
  tokenMode: "memory",
  tokenManager,  // 传入以共享状态
})
```

```typescript
// main.ts
import { http, tokenManager } from "./utils/http"
import { verifyAuth } from "@sisin/http-client"

await verifyAuth({
  tokenMode: "memory",
  tokenManager,  // 传入同一个实例，刷新后的 token 才能同步给 http
})
```

### cookie 模式
`accessToken` 仍存 `localStorage`（供前端注入 `Authorization` 头），`refreshToken` 由后端通过 HTTP-only cookie 管理（浏览器自动携带，前端无需处理）。

```typescript
const http = createHttpClient({ tokenMode: "cookie" })
```

### localStorage 模式
`accessToken` 和 `refreshToken` 都存储在浏览器的 `localStorage` 中。

```typescript
const http = createHttpClient({ tokenMode: "localStorage" })
```

### Token Key 隔离

不同网址（如 `localhost:3000` 和 `localhost:4000`）的 Token 在 localStorage 中通过 `window.location.origin` 前缀自动隔离，避免冲突。

实际存储格式：`http://localhost:3000:niceguy_core_web_access_token`

如需手动指定 key 或跨域名共享 Token，可通过 `tokenKeys` 覆盖：

```typescript
const http = createHttpClient({
  tokenKeys: {
    accessToken: "my_shared_app_access_token",
    refreshToken: "my_shared_app_refresh_token",
  },
})
```

### 自动保存 Token（AuthResponseMiddleware）
设置 `loginEndpoint` 后，中间件会自动拦截登录/刷新接口的响应，从响应 `data` 中提取 `accessToken` 字段（可自定义）并保存到 `TokenManager`，同时从响应体内剥离 token 字段，业务层完全无感知。

```typescript
const http = createHttpClient({
  loginEndpoint: "/public/auth/login",    // 登录接口 POST
  refreshEndpoint: "/public/auth/refresh", // 刷新接口 POST
})

// 登录成功后，token 自动存好
const res = await http.post("/public/auth/login", {
  username: "admin",
  password: "123456",
})
// res 中不包含 token 字段，业务层只看到业务数据
```

需要自定义 token 提取字段名时：

```typescript
const http = createHttpClient({
  loginEndpoint: "/public/auth/login",
  accessTokenField: "token",         // 默认 "accessToken"
  refreshTokenField: "refresh",      // 默认 "refreshToken"
})
```

### 自动刷新 Token（RefreshTokenMiddleware）
当请求返回 **业务码 40101**（`BusinessError`）时，中间件自动尝试刷新 Token：

1. 获取 `refreshToken`
2. 调用刷新接口获取新 `accessToken`
3. 更新当前请求的 `Authorization` 头
4. 重试原始请求
5. 多个并发请求同时过期时，只会发起一次刷新请求（去重）

刷新成功后的响应格式预期为：

```json
{ "success": true, "code": 0, "message": "ok", "data": { "accessToken": "新token..." } }
```

刷新失败时清除所有 token 并跳转登录页。

### 验证 Token 状态
```typescript
import { TokenManager } from "@sisin/http-client"

const manager = new TokenManager()
manager.getAccessToken()    // 读取 accessToken
manager.getRefreshToken()   // 读取 refreshToken（仅 localStorage 模式）
manager.clearAll()          // 清除所有 token
```

---

## 内置中间件详解
### 洋葱模型中间件顺序（外 → 内）
```
RefreshToken → AuthResponse → Error → ResponseTransform → HttpStatus → Auth → [axios]
```

| 顺序 | 中间件 | 说明 |
| --- | --- | --- |
| 1（最外层） | **RefreshTokenMiddleware** | 40101 自动刷新 Token，并发去重 |
| 2 | **AuthResponseMiddleware** | 拦截登录/刷新响应，自动提取 token 并保存 |
| 3 | **ErrorMiddleware** | 按错误类型（Auth / Business / HTTP / Network）输出日志 |
| 4 | **ResponseTransformMiddleware** | 解析 `ApiResponse` 结构，`success=false` 时抛出 `BusinessError` |
| 5 | **HttpStatusMiddleware** | 检查 HTTP 状态码，401 抛出 `AuthError`，4xx/5xx 抛出 `HttpError` |
| 6（最内层） | **AuthMiddleware** | 注入 `Authorization: Bearer <accessToken>` 请求头 |
| 末端 | axios | 实际发送 HTTP 请求 |


### 各中间件详解
**AuthMiddleware** — 自动注入 Authorization 头

```typescript
import { createAuthMiddleware } from "@sisin/http-client"

const http = new HttpClient()
http.use(createAuthMiddleware(() => localStorage.getItem("my_token")))
```

**HttpStatusMiddleware** — 按 HTTP 状态码抛对应错误

+ `401` → `AuthError`
+ `403` → `HttpError(403, "Forbidden")`
+ `4xx` / `5xx` → 对应的 `HttpError`

**ResponseTransformMiddleware** — 解析后端统一响应格式

假设后端返回格式：

```json
{ "success": true, "code": 0, "message": "ok", "data": { ... } }
```

中间件会将完整 body 挂到 `ctx.result`，若 `success=false` 则抛出 `BusinessError`。

**ErrorMiddleware** — 按错误类型输出日志

```typescript
import { createErrorMiddleware } from "@sisin/http-client"

const http = new HttpClient()
http.use(createErrorMiddleware({
  onError: (ctx, error) => {
    // 自定义错误处理，如上报监控平台
    reportError(error)
  },
}))
```

---

## 自定义中间件
中间件函数签名：

```typescript
type HttpMiddleware = (ctx: HttpContext, next: Next) => Promise<void>
```

### 示例：请求耗时日志
```typescript
import type { HttpContext, HttpMiddleware } from "@sisin/http-client"

const timerMiddleware: HttpMiddleware = async (ctx, next) => {
  console.time(ctx.config.url!)
  await next()
  console.timeEnd(ctx.config.url!)
}

http.use(timerMiddleware)
```

### 示例：全局请求头注入
```typescript
const localeMiddleware: HttpMiddleware = async (ctx, next) => {
  ctx.config.headers = {
    ...ctx.config.headers,
    "Accept-Language": "zh-CN",
  }
  await next()
}
```

### 中间件上下文（HttpContext）
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `config` | `AxiosRequestConfig` | 请求配置，在 `next()` 之前修改影响请求 |
| `response` | `AxiosResponse<T>` | axios 原始响应，仅在 `next()` 之后可读 |
| `result` | `T` | 转换后的最终结果 |
| `error` | `unknown` | 请求过程中捕获的错误 |
| `metadata` | `{ startTime, endTime, retryCount }` | 元数据，供中间件读写 |


### 中间件管理器
```typescript
import { MiddlewareManager } from "@sisin/http-client"

const manager = new MiddlewareManager()
manager.use(middleware1)
manager.insertBefore(middleware1, middleware2) // 在 middleware1 之前插入
manager.insertAfter(middleware1, middleware3)  // 在 middleware1 之后插入
manager.remove(middleware1)                    // 移除指定中间件
manager.removeAll()                            // 清空所有
```

---

## 错误处理
### 错误继承层级
```
BaseError
 ├── HttpError        (HTTP 状态码错误，如 403 / 404 / 500)
 ├── AuthError        (401 未授权)
 ├── BusinessError    (后端业务错误，success=false 时抛出)
 └── NetworkError     (网络异常，断网 / DNS 解析失败等)
```

### 捕获不同错误
```typescript
import { AuthError, BusinessError, HttpError, NetworkError } from "@sisin/http-client"

try {
  await http.get("/api/protected")
} catch (error) {
  if (error instanceof AuthError) {
    // 需要重新登录
  } else if (error instanceof BusinessError) {
    console.warn(`业务错误 ${error.code}: ${error.message}`)
  } else if (error instanceof HttpError) {
    console.error(`HTTP ${error.status}: ${error.message}`)
  } else if (error instanceof NetworkError) {
    // 网络异常提示
  }
}
```

### 全局错误处理
通过 `onError` 配置全局统一的错误上报：

```typescript
const http = createHttpClient({
  onError: (ctx, error) => {
    if (import.meta.env.PROD) {
      // 生产环境上报监控平台
      monitor.report(error, { url: ctx.config.url })
    }
  },
})
```

---

## 启动时验证 Token
在应用启动时验证历史 Token 是否有效，推荐在 `main.ts` 中调用。

```typescript
import { verifyAuth, TokenManager } from "@sisin/http-client"

// memory 模式下需要传入与 createHttpClient 共享的 TokenManager 实例
const tokenManager = new TokenManager({ mode: "memory" })

const ok = await verifyAuth({
  baseURL: "/api",
  refreshEndpoint: "/public/auth/refresh",
  loginPageUrl: "/login",
  tokenMode: "memory",
  tokenManager, // 传入共享实例，使刷新后的 token 同步给 http 客户端
})

if (!ok) {
  // Token 无效，已清除并跳转到登录页
}

const app = createApp(App)
app.mount("#app")
```

### verifyAuth 内部逻辑

1. **memory 模式**：浏览器自动携带 HTTP-only cookie 发起刷新，成功则更新 accessToken 到内存，需要传入与 `createHttpClient` 共享的 `tokenManager`
2. **cookie 模式**：浏览器自动携带 HTTP-only cookie，成功则更新 accessToken 到 localStorage
3. **localStorage 模式**：读取 refreshToken 发起刷新请求，成功则更新 accessToken 到 localStorage
4. **刷新失败**：自动清除所有 token 并跳转到登录页

---

## 扩展功能
### 加载状态中间件（LoadingMiddleware）
适合统一管理全局 loading 状态：

```typescript
import { createLoadingMiddleware } from "@sisin/http-client"

const loadingHandler = {
  start: () => { document.body.classList.add("loading") },
  stop: () => { document.body.classList.remove("loading") },
}

const http = new HttpClient()
http.use(createLoadingMiddleware(loadingHandler))
```

### 日志中间件（LoggerMiddleware）
记录每个请求的耗时：

```typescript
import { LoggerMiddleware } from "@sisin/http-client"

const http = new HttpClient()
http.use(LoggerMiddleware)
// 输出示例：[HTTP] GET /api/users - 234ms
```

### 重试中间件（RetryMiddleware）
自动重试失败的请求：

```typescript
import { createRetryMiddleware } from "@sisin/http-client"

const http = new HttpClient()

http.use(
  createRetryMiddleware({
    maxRetries: 3,           // 最多重试 3 次
    delay: 1000,             // 每次重试间隔 1 秒
    // 或使用动态延迟
    // delay: (attempt) => attempt * 1000,
    shouldRetry: (error) => {
      // 默认：网络错误和 5xx 才重试
      return error instanceof NetworkError ||
             (error instanceof HttpError && error.status >= 500)
    },
  })
)
```

### GET / DELETE 请求传参
GET 和 DELETE 请求不支持请求体，传参时需要将参数拼接到 URL 上。本库提供了两种方式：

```typescript
// 方式一：通过 params（原生 axios 方式）
http.get("/api/users", { params: { page: 1, size: 10 } })

// 方式二：通过 URL自行拼接
http.get("/api/users" + "?page=1&size=10")
// → GET /api/users?page=1&size=10

// DELETE 同理
// 其他请求如POST
http.post("/api/users", { id: 1, age: 10 } )
```

### 使用空白 HttpClient 手动组装中间件
如果需要精细控制中间件顺序，可以直接使用 `HttpClient` 类：

```typescript
import { HttpClient } from "@sisin/http-client"
import {
  createAuthMiddleware,
  createRetryMiddleware,
  LoggerMiddleware,
} from "@sisin/http-client"

const http = new HttpClient({ baseURL: "/api" })

http.use(LoggerMiddleware)
http.use(createRetryMiddleware({ maxRetries: 2 }))
http.use(createAuthMiddleware(() => localStorage.getItem("token")))

const data = await http.get("/users")
```

---

## API 参考
### 导出列表
| 导出 | 类型 | 说明 |
| --- | --- | --- |
| `createHttpClient` | 函数 | 创建预配置的 HttpClient 实例 |
| `createHttpPlugin` | 函数 | 创建 Vue 3 插件 |
| `HttpClient` | 类 | 核心 Http 客户端（可单独实例化） |
| `TokenManager` | 类 | Token 统一存取管理器 |
| `MiddlewareManager` | 类 | 中间件管理器 |
| `compose` | 函数 | 中间件组合器 |
| `URL_KEY` | `InjectionKey` | Vue 3 注入 key |
| `ACCESS_TOKEN_KEY` | `string` | 默认 accessToken 存储 key 常量 |
| `REFRESH_TOKEN_KEY` | `string` | 默认 refreshToken 存储 key 常量 |
| `buildStorageKey` | 函数 | 构造带 origin 前缀的存储 key |
| `verifyAuth` | 函数 | 启动时验证 Token 有效性 |


### HttpClient 方法 - 沿用 Axios API
| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `request` | `request<T>(config) => Promise<T>` | 通用请求 |
| `get` | `get<T>(url, config?) => Promise<T>` | GET 请求 |
| `post` | `post<T>(url, data?, config?) => Promise<T>` | POST 请求 |
| `put` | `put<T>(url, data?, config?) => Promise<T>` | PUT 请求 |
| `patch` | `patch<T>(url, data?, config?) => Promise<T>` | PATCH 请求 |
| `delete` | `delete<T>(url, config?) => Promise<T>` | DELETE 请求 |
| `head` | `head<T>(url, config?) => Promise<T>` | HEAD 请求 |
| `options` | `options<T>(url, config?) => Promise<T>` | OPTIONS 请求 |
| `use` | `use(middleware) => void` | 注册中间件 |
| `removeMiddleware` | `removeMiddleware(mw) => boolean` | 按引用移除中间件 |
| `clearMiddlewares` | `clearMiddlewares() => void` | 清空所有中间件 |


### TokenManager 方法
| 方法 | 签名 | 说明 |
| --- | --- | --- |
| `setAccessToken` | `setAccessToken(token) => void` | 保存 accessToken |
| `getAccessToken` | `getAccessToken() => string \| null` | 获取 accessToken |
| `removeAccessToken` | `removeAccessToken() => void` | 移除 accessToken |
| `setRefreshToken` | `setRefreshToken(token) => void` | 保存 refreshToken（仅 localStorage 模式） |
| `getRefreshToken` | `getRefreshToken() => string \| null` | 获取 refreshToken（仅 localStorage 模式） |
| `removeRefreshToken` | `removeRefreshToken() => void` | 移除 refreshToken（仅 localStorage 模式） |
| `clearAll` | `clearAll() => void` | 清除所有 token |


### 中间件创建函数
| 函数 | 参数 | 说明 |
| --- | --- | --- |
| `createAuthMiddleware` | `getToken: () => string \| null` | 注入 Authorization 头 |
| `createErrorMiddleware` | `handler?: ErrorHandler` | 按类型输出错误日志 |
| `createLoadingMiddleware` | `handler: LoadingHandler` | 请求加载状态管理 |
| `createRefreshTokenMiddleware` | `options: RefreshTokenOptions` | 401 / 40101 自动刷新 Token |
| `createAuthResponseMiddleware` | `options: AuthResponseOptions` | 登录/刷新响应自动保存 Token |
| `createRetryMiddleware` | `options?: RetryOptions` | 请求失败自动重试 |


### 预置中间件
| 导出 | 说明 |
| --- | --- |
| `HttpStatusMiddleware` | 检查 HTTP 状态码 |
| `ResponseTransformMiddleware` | 解析 ApiResponse 格式 |
| `LoggerMiddleware` | 请求耗时日志 |


### 错误类
| 类 | 属性 | 说明 |
| --- | --- | --- |
| `BaseError` | `code: string`, `message: string`, `success: boolean` | 基础错误 |
| `HttpError` | `status: number`, `code: "HTTP_ERROR"` | HTTP 状态码错误 |
| `AuthError` | `code: "AUTH_ERROR"` | 未授权（401） |
| `BusinessError` | `code: string` | 业务逻辑错误 |
| `NetworkError` | `code: "NETWORK_ERROR"` | 网络异常 |


### 类型导出
```typescript
import type {
  HttpContext,
  HttpMiddleware,
  Next,
  RequestConfig,
  ApiResponse,
  HttpInterceptor,
  TokenMode,
  TokenStorageConfig,
  LoadingHandler,
  RefreshTokenOptions,
  RetryOptions,
  ErrorHandler,
  AuthResponseOptions,
} from "@sisin/http-client"
```
