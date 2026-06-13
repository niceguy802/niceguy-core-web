# @sisin/egg-core-client

Egg.js 核心框架 — 封装数据层、认证体系、日志系统、Redis 缓存等基础设施，开箱即用。

## 目录

- [简介](#简介)
- [安装](#安装)
- [架构总览](#架构总览)
- [核心能力](#核心能力)
  - [1. 数据库 - Prisma](#1-数据库---prisma)
  - [2. 缓存 - Redis](#2-缓存---redis)
  - [3. 日志系统 - Logger](#3-日志系统---logger)
  - [4. 认证体系 - JWT Auth](#4-认证体系---jwt-auth)
  - [5. 错误码体系](#5-错误码体系)
- [框架扩展 - ctx 能力](#框架扩展---ctx-能力)
- [中间件](#中间件)
- [配置说明](#配置说明)
  - [数据库配置](#数据库配置-dbs)
  - [日志配置](#日志配置-logging)
  - [Redis 配置](#redis-配置)
  - [认证配置](#认证配置-auth)
  - [文件上传配置](#文件上传配置-filelimit)
  - [中间件配置](#中间件配置)
- [初始化流程](#初始化流程)
- [完整的业务使用示例](#完整的业务使用示例)

---

## 简介

**@sisin/egg-core-client** 是一个 Egg.js 框架级封装（通过 egg.framework 配置直接作为上层框架使用），为后端项目提供了一整套开箱即用的基础设施：

- **Prisma 多库管理** — 通过 DbManager 支持多数据源自动注册，以 ctx.db('main') 方式访问；内置健康检查、慢查询日志、事务封装。
- **Redis 多实例管理** — 通过 RedisManager 统一管理多个 Redis 连接，封装了 get/set/hset/hget 等带自动 JSON 序列化的方法；内置 RedisAuth 数据模型用于 Token/Session 管理和分布式锁。
- **基于 pino 的分级日志系统** — 支持终端美化输出 + 按日轮转文件，内置 appLogger / requestLogger / prismaLogger 三个独立日志通道，所有级别和路径均可通过环境变量覆盖。
- **双 Token JWT 认证体系** — 内置完整的登录/刷新/登出/改密路由和 Service，accessToken + refreshToken（HTTP-only Cookie），结合 Redis Session 做 Token 校验和并发防重放。
- **ctx 扩展** — ctx.api（统一 JSON 响应）、ctx.payload（自动合并 body/query/params）、ctx.encrypt（密码加解密）、ctx.logger（请求日志）。
- **预制中间件** — checkReady（启动就绪检查）、errorHandler（全局异常+404+参数校验错处理）、requestLog（请求日志按状态码分级）、jwtAuth（JWT 白名单+校验）、uploadLimit、permission 等。
- **错误码体系** — 预定义了 200/400/401/40101~~40107/403/40301~~40302 等语义化业务错误码。

简单说，这是**一个组装了 Prisma、Redis、JWT、日志、错误处理和 ctx 工具链的 Egg.js 后端框架基座，业务项目以它为 framework 就能直接获得完整的认证、数据、缓存和日志能力**。

---

## 安装

### 作为框架使用（推荐）

在业务项目的 `package.json` 中配置：

```json
{
  "name": "my-app",
  "egg": {
    "framework": "@sisin/egg-core-client"
  },
  "dependencies": {
    "@sisin/egg-core-client": "^1.0.9"
  }
}
```

安装依赖：

```bash
npm install
```
其他包依赖参考 `package.json` 中的 `dependencies` 部分。

```

### 作为普通包引用

```js
const { createDbManager, createPrismaClient } = require('@sisin/egg-core-client/lib/prisma');
```

---

## 架构总览

```
egg-core-client/
├── app.js                   # 框架入口：初始化、控制器加载、生命周期
├── index.js                 # 导出 lib/framework.js
├── lib/
│   ├── framework.js         # Egg Application/Agent 子类实现
│   ├── prisma               # 数据库 - Prisma 多库管理
│   ├── redis                # Redis 客户端管理
│   └── loader/              # 自定义加载器
├── app/
│   │   
│   ├── extend/              # 框架扩展
│   │   ├── context.js       # ctx.api, ctx.payload, ctx.encrypt
│   │   └── application.js   # app 扩展
│   ├── middleware/           # 中间件
│   ├── service/             # 内置服务（认证）
│   ├── controller/          # 内置控制器（健康检查、登录）
│   ├── model/redis/         # Redis 数据模型（token、session）
│   ├── utils/               # 工具函数
│   ├── constants/           # 常量（错误码、Redis key、JWT 配置）
│   ├── modules/             # 内置业务模块
│   └── router.js            # 内置路由
├── config/
│   ├── config.default.js    # 默认配置
│   ├── database.config.js   # 数据库连接配置
│   ├── logging.js           # 日志配置
│   └── plugin.js            # 插件配置
└── init/
    ├── index.js             # 初始化入口
    ├── init-redis.js        # Redis 初始化
    └── init-logger.js       # Logger 挂载
```

### 框架初始化流程

```
app.js (入口)
  │
  ├─ 挂载 app.initStatus
  ├─ 注册 uncaughtException / unhandledRejection 全局处理
  │
  └─ app.beforeStart()
       │
       ├─ 加载框架 Controller → app.controller
       ├─ 加载框架 Router    → /api/public/auth/...
       │
       └─ init(app)
            │
            ├─ initLogger(app)        # 挂载 logger 到 app + ctx
            │
            └─ initRedis(app)         # 创建 Redis 连接 → app.redis
                 │
                 └─ 注册 beforeClose   # 优雅关闭 Redis
```

---

## 核心能力

### 1. 数据库 - Prisma

多数据库统一管理器，支持 **自动注册** 和 **手动注册** 两种模式。

#### 配置（业务项目 config 中）

```js
// config/config.default.js 或 config/config.local.js
module.exports = {
  Dbs: {
    main: {
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '123456',
      database: 'db_main',
      connectionLimit: 5,
      socketTimeout: 30000,
      poolTimeout: 30000,
      connectTimeout: 30000,
    },
    analytics: {
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '123456',
      database: 'db_analytics',
      connectionLimit: 3,
    },
  },
};
```

#### 自动注册（推荐）

自行管理配置文件prisma.config.ts、prisma.schema.ts，以及自行管理生成generated文件；

框架自动从 `app.config.Dbs` 读取配置，加载 `prisma/generated/{name}` 模块，创建并注册 PrismaClient：

```js
// app.js — 业务项目
const { createDbManager } = require('@sisin/egg-core-client/lib/prisma');

module.exports = (app) => {
  app.db = createDbManager();
  app.db.registerFromConfig(app);
};
```

#### 手动注册（用户自己创建实例）

```js
const { createPrismaClient } = require('@sisin/egg-core-client/lib/prisma');
const { PrismaClient } = require('./prisma/generated/main');

const client = createPrismaClient({
  PrismaClient,
  datasourceConfig: app.config.Dbs.main,
  loggingConfig: app.config.logging.prisma,
});

app.db.register('main', client);
```

#### 使用方式

所有访问都通过 `ctx.db(name)` 完成：

```js
// ── 查询 ──
const users = await ctx.db('main').user.findMany({ where: { status: 1 } });
const user  = await ctx.db('main').user.findUnique({ where: { id: 1 } });

// ── 写入 ──
const created = await ctx.db('main').user.create({ data: { name: 'foo' } });
const updated = await ctx.db('main').user.update({ where: { id: 1 }, data: { name: 'bar' } });

// ── 事务 ──
await ctx.db('main').transaction(async (tx) => {
  const user = await tx.user.create({ data: { name: 'foo' } });
  await tx.profile.create({ data: { userId: user.id, avatar: 'url' } });
});

// ── 原生 Prisma Client 兜底 ──
const count = await ctx.db('main').prisma.user.count();
const raw   = await ctx.db('main').prisma.$queryRaw`SELECT 1 AS ok`;

// ── get 方法 ──
const userModel = ctx.db('main').get('user');

// ── 多库同时操作 ──
const [mainUsers, analyticsUsers] = await Promise.all([
  ctx.db('main').user.findMany(),
  ctx.db('analytics').user.findMany(),
]);
```

#### DbProxy 接口

每个 `ctx.db(name)` 返回的对象是一个 Proxy，提供：

| 访问方式 | 说明 |
|---|---|
| `.user.findMany()` | 直接访问 Prisma Model（委托到原始 PrismaClient） |
| `.order.create()` | 同上，所有 Model 自动代理 |
| `.transaction(fn)` | 事务封装，等价于 `prisma.$transaction(fn)` |
| `.prisma` | 原始 PrismaClient 实例，用于原生方法 |
| `.get(modelName)` | 等价于 `.modelName` |

#### DbManager API

| 方法 | 说明 |
|---|---|
| `db(name)` | 获取已注册的数据库代理 |
| `db.register(name, client)` | 手动注册一个 PrismaClient 实例 |
| `db.registerFromConfig(app)` | 从 `app.config.Dbs` 自动注册所有数据库 |
| `db.has(name)` | 检查指定名称是否已注册 |
| `db.list()` | 列出所有已注册的数据库名称 |

#### 日志控制

日志配置位于 `config/logging.js`，支持环境变量覆盖：

```bash
# 环境变量
PRISMA_LOG_LEVEL=info           # 事件日志等级（默认 warn）
PRISMA_SQL_LOG_LEVEL=debug      # SQL 日志等级（默认 debug）
PRISMA_LOG_TERMINAL=true        # 终端输出事件日志
PRISMA_SQL_TERMINAL=true        # 终端输出 SQL
PRISMA_SLOW_QUERY_MS=5000       # 慢查询阈值（默认 20000ms）
PRISMA_LOG_FILE_PATH=./logs/prisma  # 日志文件路径
```

日志输出规则：
- query 日志 → 始终写入文件，`sqlTerminal` 控制终端输出
- 慢查询日志 → 写入文件 + 触发 warn
- info/warn/error → `level` 控制启用的等级，`terminal` 控制终端输出
- **默认不输出终端**，仅记录 warn 及以上到文件

#### 健康检查

```js
const { checkHealth, runHealthChecks } = require('@sisin/egg-core-client/lib/prisma');

// 单库检查
const result = await checkHealth(client, {
  name: 'main',
  query: async (prisma) => {
    const count = await prisma.user.count();
    return 'user.count=' + count;
  },
});

// 批量检查
const results = await runHealthChecks([
  { client: prismaClient1, name: 'main' },
  { client: prismaClient2, name: 'analytics', query: customQuery },
]);
```

---

### 2. 缓存 - Redis

支持多 Redis 实例管理，内置 `RedisManager` 封装了常用方法。

#### 配置

```js
// config/config.default.js
module.exports = {
  redis: {
    auth: {
      host: '127.0.0.1',
      port: 6379,
      password: '',
      db: 0,
    },
    session: {
      host: '127.0.0.1',
      port: 6379,
      password: '',
      db: 1,
    },
  },
};
```

#### 框架自动初始化

框架在 `init/init-redis.js` 中自动完成初始化：

```
app.beforeStart → init(app) → initRedis(app)
                                │
                                ├─ 遍历 redis 配置，创建 ioredis 实例
                                ├─ 连接所有 Redis 实例
                                └─ app.redis = new RedisManager(clients)
```

#### 使用方式

```js
// 获取原生 Redis 客户端
const client = app.redis.getClient('auth');
await client.set('key', 'value');
await client.get('key');

// 使用 RedisManager 封装方法
await app.redis.set('auth', 'user:1', { name: 'foo' }, 3600);   // 自动 JSON 序列化，支持过期
const data = await app.redis.get('auth', 'user:1');              // 自动 JSON 解析
await app.redis.del('auth', 'user:1');

// Hash 操作
await app.redis.hset('auth', 'user:1', 'profile', { avatar: 'url' });
const profile = await app.redis.hget('auth', 'user:1', 'profile');
const all = await app.redis.hgetall('auth', 'user:1', true);     // 解析所有字段
```

#### RedisManager API

| 方法 | 说明 |
|---|---|
| `getClient(name)` | 获取原生 ioredis 客户端 |
| `set(clientName, key, value, expire?)` | 设 String 值，自动 JSON 序列化，支持过期秒数 |
| `get(clientName, key)` | 获取 String 值，自动 JSON 解析 |
| `del(clientName, key)` | 删除键 |
| `hset(clientName, key, field, value)` | 设 Hash 字段，自动 JSON 序列化 |
| `hget(clientName, key, field)` | 取 Hash 字段，自动 JSON 解析 |
| `hgetall(clientName, key, parse?)` | 取全部 Hash 字段，可选解析 JSON |

#### RedisAuth — Token/Session 数据模型

内置 `app/model/redis/redis-auth.js`，封装了认证系统的 Redis CRUD：

```js
const RedisAuth = require('@sisin/egg-core-client/app/model/redis/redis-auth');
const redisAuth = new RedisAuth(app, 'auth');

// 登录信息
await redisAuth.setLoginInfo(userId, device, { jti, refreshJti, accessTtl, refreshTtl });

// Token 校验
const jti = await redisAuth.getLoginToken(userId, device);
const valid = await redisAuth.checkTokenValid(userId, device, jti);

// Session 管理
await redisAuth.setAuthSession(sid, { uid, refreshJti, platform, iat }, ttl);
const session = await redisAuth.getAuthSession(sid);
await redisAuth.delAuthSession(sid);

// 全设备登出
await redisAuth.removeAllUserTokens(userId);

// 分布式锁
const locked = await redisAuth.acquireRefreshLock(sid);
await redisAuth.releaseRefreshLock(sid);
```

---

### 3. 日志系统 - Logger

基于 pino 的日志系统，支持 **终端输出** + **按日轮转文件**。

#### 默认导出（终端美化输出）

```js
const logger = require('@sisin/egg-core-client/app/utils/logger');

logger.info('message');
logger.warn('warning');
logger.error('error message', new Error('something'));
logger.success('操作成功');   // 美化输出 √
logger.init('初始化中...');   // 美化输出 ◆
```

#### 具名导出

```js
const { appLogger, requestLogger, prismaLogger } = require('@sisin/egg-core-client/app/utils/logger');

appLogger.info('app event');
requestLogger.warn('slow request', { url, duration });
```

#### 日志文件结构

按日期自动轮转，目录结构：
```
logs/
├── app/           # 应用日志
│   ├── 2026-06/
│   │   ├── 09.log
│   │   └── 10.log
├── request/       # 请求日志
│   └── 2026-06/
│       └── 09.log
├── prisma/        # Prisma SQL 日志
│   └── 2026-06/
│       └── 09.log
```

#### 自定义 Logger

```js
const { createLogger } = require('@sisin/egg-core-client/app/utils/logger');

const myLogger = createLogger({
  level: 'info',
  filePath: './logs/my-module',
  terminal: true,
  pretty: true,
});
```

#### 日志级别控制

通过环境变量或配置文件控制：

```bash
CONSOLE_LOG_LEVEL=info        # 终端日志级别
APP_LOG_LEVEL=warn            # 应用日志级别
APP_LOG_TERMINAL=true         # 是否终端输出
APP_LOG_FILE_PATH=./logs/app  # 日志存储路径
```

---

### 4. 认证体系 - JWT Auth

基于 JWT + Redis Session 的双 Token 认证体系。

#### JWT 工具

```js
const { createToken, verifyToken } = require('@sisin/egg-core-client/app/utils/jwt');

// 签发
const token = createToken(
  { uid: 1, type: 'access' },
  ACCESS_SECRET,
  { expiresIn: '1h' }
);

// 验证
const payload = verifyToken(token, ACCESS_SECRET);
// { uid: 1, type: 'access', iat: ..., exp: ... }
```

#### 加密工具

```js
const { encryptPassword, comparePassword, isEncrypted } = require('@sisin/egg-core-client/app/utils/encrypt');

const hash = encryptPassword('plain_password');       // bcrypt 加密
const match = await comparePassword('plain', hash);   // 校验
const encrypted = isEncrypted(hash);                  // 是否已加密
```

#### 登录流程（框架内置）

框架内置了完整的登录、刷新、登出、改密路由：

```js
// 内置路由（app/router.js）
POST /api/public/auth/login         // 登录
POST /api/public/auth/refresh       // 刷新 token
POST /api/auth/logout               // 登出
GET  /api/auth/getUserInfo          // 用户信息
POST /api/auth/changePassword       // 修改密码
```

**登录流程**（`AuthService.login`）：
1. 查库校验密码
2. 生成 sid / jti
3. 签发 accessToken + refreshToken（双 Token）
4. 写入 Redis session + 会话索引
5. refreshToken 通过 HTTP-only Cookie 返回

**Token 刷新流程**（`AuthService.refreshToken`）：
1. 从 Cookie 获取 refreshToken
2. 校验 JWT 签名 + type
3. 校验 sid → Redis session 存在性
4. 校验 refreshJti 匹配
5. 抢分布式锁（防并发刷新）
6. 生成新 Token + 轮换 refreshJti
7. 更新 Redis session，释放锁

#### JWT 配置

```js
// app/constants/crypt.js
ACCESS_SECRET     // accessToken 密钥
REFRESH_SECRET    // refreshToken 密钥
TOKEN_EXPIRES_IN       // accessToken 过期（1小时）
REFRESH_TOKEN_EXPIRES_IN  // refreshToken 过期（7天）
SESSION_EXPIRES_IN      // Redis session 最长有效期（7天）
```

---

### 5. 错误码体系

```js
const errorCode = require('@sisin/egg-core-client/app/constants/error');

// 使用
const err = errorCode[40101];
// { code: 40101, parent: 401, msg: 'access登录已过期' }

// 可用错误码
200    // 请求成功
400    // 请求错误/操作失败
401    // 用户未登录或登录过期
40101  // accessToken 已过期
40102  // refreshToken 已过期
40103  // 非法 Token
40104  // 登录已失效
40105  // 用户不存在
40106  // 密码错误
40107  // 暂不支持当前平台登录
403    // 权限不足
40301  // 账号禁用
40302  // 权限不足
404    // 未找到资源
405    // 非法请求
422    // 数据校验不通过
500    // 服务器错误
```

HTTP 状态码常量：

```js
const { SUCCESS, BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, SERVER_ERROR } = require('@sisin/egg-core-client/app/constants/code');
// SUCCESS=0, BAD_REQUEST=400, UNAUTHORIZED=401, FORBIDDEN=403, NOT_FOUND=404, SERVER_ERROR=500
```

---

## 框架扩展 - ctx 能力

框架通过 `app/extend/context.js` 注入三个便捷属性：

### ctx.api — 统一 API 响应

```js
class UserController extends Controller {
  async list() {
    const { ctx } = this;
    const users = await ctx.service.user.list();

    ctx.api.success(users);                    // { code: 0, success: true, msg: '操作成功', data: users }
    ctx.api.fail('操作失败', 400);              // { code: 400, success: false, msg: '操作失败', data: null }
    ctx.api.page(list, total);                 // { code: 0, success: true, msg: '查询成功', data: { list, total } }
  }
}
```

### ctx.payload — 统一参数注入

自动合并 `request.body + request.query + params`：

```js
// POST /api/user/list?page=1  body: { name: 'foo' }  params: { id: 1 }
ctx.payload  // { name: 'foo', page: '1', id: 1 }
```

### ctx.encrypt — 加密工具

```js
const hash = ctx.encrypt.encryptPassword('plain');
const ok   = await ctx.encrypt.comparePassword('plain', hash);
```

### ctx.logger — 日志工具

```js
ctx.logger.info('request log');
ctx.logger.warn('something suspicious');
ctx.logger.error('error', err);
```

---

## 中间件

框架默认加载以下中间件（按顺序）：

### 1. `checkReady` — 系统初始化检查

检查 `app.initStatus.ready`，未完成初始化时返回 503。

```js
// 自定义
module.exports = {
  checkReady: { enable: true },
};
```

### 2. `errorHandler` — 全局错误处理

- 捕获所有未处理的异常
- 404 自动返回标准错误格式
- 参数校验错误（`invalid_param`）返回 422
- 已知业务错误（`err.code`）返回对应错误码

### 3. `requestLog` — 请求日志

记录每个请求的 method、url、status、duration、ip，按状态码分级（4xx→warn, 5xx→error, 其余→info）。

### 4. `jwtAuth` — JWT 认证

- 白名单路径跳过认证
- 校验 Authorization Header 中的 accessToken
- JWT 签名验证 → type 校验 → sid 存在性校验
- 校验通过后挂载 `ctx.user = { uid, sid, jti, type }`

### 其他中间件

| 中间件 | 说明 |
|---|---|
| `uploadLimit` | 文件上传大小和类型限制 |
| `permission(code)` | 权限校验（需先经 jwtAuth 中间件） |
| `loginLimit` | 登录频率限制（预留） |

---

## 配置说明

### 数据库配置 Dbs

`config/database.config.js` 或业务项目的 `config/config.*.js`：

```js
module.exports = {
  Dbs: {
    dbName: {
      type: 'mysql',        // 数据库类型
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '123456',
      database: 'db_name',
      connectionLimit: 5,   // 连接池大小
      poolTimeout: 30000,   // 连接池超时(ms)
      socketTimeout: 30000, // SQL执行超时(ms)
      connectTimeout: 30000,// 建立连接超时(ms)
    },
  },
};
```

### 日志配置 logging

`config/logging.js`：

```js
module.exports = {
  logging: {
    console: {
      level: 'info',        // 终端日志级别
      pretty: true,         // 美化输出
    },
    app: {
      level: 'warn',        // 应用日志级别
      terminal: false,      // 是否终端输出
      filePath: './logs/app',
    },
    request: {
      level: 'warn',
      terminal: false,
      filePath: './logs/request',
    },
    prisma: {
      level: 'warn',        // info/warn/error 事件日志级别
      sqlTerminal: false,   // 是否终端输出 SQL
      sqlLogLevel: 'debug', // SQL 日志文件级别
      slowQueryMs: 20000,   // 慢查询阈值(ms)
      filePath: './logs/prisma',
    },
  },
};
```

支持所有配置项通过环境变量覆盖：

```bash
CONSOLE_LOG_LEVEL=info
APP_LOG_LEVEL=warn
APP_LOG_TERMINAL=true
PRISMA_LOG_LEVEL=info
PRISMA_SQL_TERMINAL=true
PRISMA_SLOW_QUERY_MS=5000
```

### Redis 配置

```js
module.exports = {
  redis: {
    instanceName: {
      host: '127.0.0.1',
      port: 6379,
      password: '',
      db: 0,
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
    },
  },
};
```

### 认证配置 auth

```js
module.exports = {
  auth: {
    whiteList: ['/api/public'],   // JWT 白名单前缀
    allowDevice: ['pc', 'h5'],    // 允许的设备类型
  },
};
```

### 文件上传配置 fileLimit

```js
module.exports = {
  fileLimit: {
    whiteList: ['.jpg', '.png', '.pdf'],
    size: 10,  // MB
  },
};
```

### 中间件配置

```js
module.exports = {
  middleware: ['checkReady','requestLog', 'errorHandler', 'uploadLimit', 'jwtAuth'],
};
```

---

## 初始化流程

框架启动时自动执行以下初始化：

```
app.beforeStart()
  │
  ├─ 1. 加载框架 Controller → app.controller
  ├─ 2. 加载框架 Router
  │
  └─ 3. init(app)
       │
       ├─ initLogger(app)
       │    └─ app.logger = logger
       │    └─ ctx.logger  = logger
       │
       └─ initRedis(app)
            ├─ 读取 app.config.redis
            ├─ 创建 ioredis 实例（lazyConnect）
            ├─ 连接所有 Redis 实例
            ├─ app.redis = new RedisManager(clients)
            └─ 注册 beforeClose → 优雅关闭
```

初始化完成后 `app.initStatus.ready = true`。

---

## 完整的业务使用示例

### 业务项目结构

```
my-app/
├── package.json               # egg.framework → @sisin/egg-core-client
├── config/
│   ├── config.default.js       # 通用配置
│   ├── config.local.js         # 本地配置
│   └── config.prod.js          # 生产配置
├── app.js                      # 应用入口
├── prisma/
│   ├── schema.prisma
│   └── generated/
│       └── main/               # prisma generate 产出
│           └── index.js
└── app/
    ├── controller/
    │   └── user.js
    ├── service/
    │   └── user.js
    ├── middleware/
    ├── extend/
    ├── public/
    └── router.js
```

### app.js（业务项目）

```js
const { createDbManager } = require('@sisin/egg-core-client/app/core/prisma');

module.exports = (app) => {
  // 1. 创建数据库管理器
  app.db = createDbManager();

  // 2. 从配置自动注册所有数据库
  app.db.registerFromConfig(app);
};
```

### config/config.default.js

```js
module.exports = () => {
  return {
    Dbs: {
      main: {
        type: 'mysql',
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '123456',
        database: 'db_main',
        connectionLimit: 5,
      },
    },
    redis: {
      auth: {
        host: '127.0.0.1',
        port: 6379,
        password: '',
        db: 0,
      },
    },
    auth: {
      whiteList: ['/api/public'],
    },
  };
};
```

### app/controller/user.js

注：不要在controller操作数据库

```js
const Controller = require('egg').Controller;

class UserController extends Controller {
  async list() {
    const { ctx } = this;

    // 查询
    const users = await ctx.db('main').user.findMany({
      where: { status: 1 },
      select: { id: true, name: true, email: true },
    });

    ctx.api.success(users);
  }

  async create() {
    const { ctx } = this;

    // 写入
    const user = await ctx.db('main').user.create({
      data: ctx.payload,
    });

    ctx.api.success(user, '创建成功');
  }

  async transfer() {
    const { ctx } = this;

    // 事务
    await ctx.db('main').transaction(async (tx) => {
      await tx.account.update({
        where: { id: 1 },
        data: { balance: { decrement: 100 } },
      });
      await tx.account.update({
        where: { id: 2 },
        data: { balance: { increment: 100 } },
      });
      await tx.transferLog.create({
        data: { from: 1, to: 2, amount: 100 },
      });
    });

    ctx.api.success(null, '转账成功');
  }

  async stats() {
    const { ctx } = this;

    // 原生 SQL
    const result = await ctx.db('main').prisma.$queryRaw`
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM user
      GROUP BY DATE(created_at)
      ORDER BY day DESC
      LIMIT 7
    `;

    ctx.api.success(result);
  }
}

module.exports = UserController;
```

### app/router.js

```js
module.exports = (app) => {
  const { router, controller } = app;
  router.resources('user', '/api/user', controller.user);
};
```

---

## 开发与发布

```bash
# 测试
npm test

# 补丁版本
npm run publish:patch

# 次要版本
npm run publish:minor

# 主版本
npm run publish:major
```
