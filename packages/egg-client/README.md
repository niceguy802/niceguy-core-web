# @niceguy/egg-client

Egg.js 核心框架包 — 将 egg-example 中沉淀的通用基础设施封装为可复用的 Egg 框架，新建项目只需依赖此包即可直接使用中间件、数据层、认证、日志、Redis 等能力，业务项目只需关注业务层面。

## 核心特性

- **即拉即用**：安装依赖 + 配置框架名，所有封装自动生效
- **独立迭代**：框架包可独立发版更新，业务项目同步升级即可
- **多项目复用**：一套核心逻辑应用于多个业务项目
- **Egg 原生集成**：基于 Egg.js Framework 机制，完美继承 loadUnit 加载顺序

## 安装

`ash
npm install @niceguy/egg-client
`

## 使用方式

### 1. 新建 Egg.js 项目

创建标准 Egg.js 项目结构后，在 package.json 中指定框架：

`json
{
  "name": "my-business-project",
  "egg": {
    "framework": "@niceguy/egg-client"
  },
  "dependencies": {
    "@niceguy/egg-client": "^1.0.0",
    "egg": "^3.17.5"
  }
}
`

### 2. 项目结构

`
my-business-project/
├── package.json                # egg.framework: '@niceguy/egg-client'
├── app.js                      # （可选）业务项目初始化逻辑
├── config/
│   ├── config.default.js       # 覆盖框架默认配置（数据库、Redis 等）
│   └── plugin.js               # 追加业务插件
├── app/
│   ├── controller/             # 业务控制器
│   ├── router/                 # 业务路由
│   ├── service/                # 业务服务
│   └── model/                  # 业务 Prisma 模型
├── prisma/
│   ├── schema.prisma           # 数据表定义
│   └── generated/              # prisma generate 产物
│       ├── fx/                 # 数据库名称（与 config.Dbs key 对应）
│       └── business/
└── package.json
`

### 3. 配置数据库 & Redis

在你的项目 config/config.default.js 中覆盖连接信息：

`js
module.exports = (appInfo) => {
  return {
    Dbs: {
      fx: {
        type: 'mysql',
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '123456',
        database: 'db_base',
        connectionLimit: 5,
      },
      business: {
        type: 'mysql',
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '123456',
        database: 'db_business',
        connectionLimit: 5,
      },
    },
    redis: {
      fx: { host: '127.0.0.1', port: 6379, password: '123456', db: 0 },
      business: { host: '127.0.0.1', port: 6379, password: '123456', db: 1 },
    },
  };
};
`

### 4. 编写路由和控制器

`js
// app/router/user.js
module.exports = (app) => {
  const { router, controller } = app;
  router.get('/api/user/info', controller.user.info);
};

// app/controller/user.js
const Controller = require('egg').Controller;
class UserController extends Controller {
  async info() {
    const { ctx } = this;
    const user = await ctx.service.authSystem.auth.findByUser({ username: 'admin' });
    ctx.api.success(user);
  }
}
module.exports = UserController;
`

## 框架包目录结构

`
packages/egg-client/
├── package.json              # 框架声明（egg.framework: true）
├── app.js                    # 框架生命周期：初始化数据库、Redis、日志、认证
├── config/
│   ├── config.default.js     # 默认配置（合并策略：项目配置优先）
│   └── plugin.default.js     # 默认插件
├── app/
│   ├── constants/            # 状态码、错误码、密码常量、Redis key
│   ├── core/                 # 数据库客户端管理、Repository、事务封装
│   ├── extend/               # ctx.api / ctx.payload / ctx.repository / helper
│   ├── middleware/           # jwt_auth / error_handler / check_ready / etc.
│   ├── model/redis/          # RedisAuth 模型（Session CRUD）
│   ├── redis/                # Redis 客户端工厂 & 管理器
│   ├── service/authSystem/   # 认证服务（登录/登出/刷新Token/改密）
│   ├── utils/                # JWT / 加密 / 日志 / 通用工具
│   └── validate/             # 参数校验规则
└── init/                     # 初始化编排脚本（挂载日志→数据库→Redis→认证）
`

## 框架提供的能力清单

| 模块 | 提供能力 | 使用方式 |
|------|---------|---------|
| **中间件** | checkReady / errorHandler / requestLog / jwtAuth / auth / uploadLimit / loginLimit / permission | 自动注册 checkReady, errorHandler, requestLog, jwtAuth |
| **Context 扩展** | ctx.api.success/fail/page / ctx.payload / ctx.repository / ctx.encrypt | 直接使用 |
| **Helper** | ormatTime / ormDateExp / 	imeUtil / snakeToCamel / camelToSnake | ctx.helper.* |
| **认证服务** | login / logout / erifyAccessToken / efreshToken / changePassword | ctx.service.authSystem.auth.* |
| **Redis 管理** | 多实例客户端 / get/set/hset/hget/del | pp.redis.getClient(name) |
| **数据库** | Prisma 多库管理 / 事务 / 通用 CRUD Repository | ctx.repository.fx.Raw('table') |
| **日志** | 文件按日切割 / 终端彩显 / 请求日志 / Prisma SQL 日志 | pp.logger.* / ctx.logger.* |
| **WebSocket** | 可选启用 | pp.config.websocket.enable = true |

## 本地开发

### 安装依赖

```bash
# 在 monorepo 根目录
cd niceguy-core-web
npm install
```

### 测试

单元测试（不依赖外部服务）：

```bash
# 在 packages/egg-client 目录
cd packages/egg-client
npm run test:unit

# 带覆盖率
npx c8 --reporter=text --reporter=html mocha test/unit/**/*.test.js --timeout 10000
```

集成测试（依赖 egg-mock，无需真实数据库）：

```bash
npm test
```

### 发布流程

```bash
# 1. 构建检查：确保测试通过
npm run test:unit

# 2. 发布 patch 版本（0.0.1 → 0.0.2）
npm run publish:patch

# 3. 发布 minor 版本（0.0.1 → 0.1.0）
npm run publish:minor

# 4. 发布 major 版本（0.0.1 → 1.0.0）
npm run publish:major
```

## 使用本地开发版本（link 模式）

在业务项目中直接使用本地的 egg-client：

```bash
# 在 egg-client 目录注册全局 link
cd niceguy-core-web/packages/egg-client
npm link

# 在业务项目（如 egg-example）中使用本地版本
cd egg-example
npm link @niceguy/egg-client

# 恢复为 npm 版本
npm unlink @niceguy/egg-client && npm install @niceguy/egg-client
```

或者使用 npm workspaces（推荐）：

```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

然后在业务项目的 package.json 中：

```json
{
  "egg": {
    "framework": "@niceguy/egg-client"
  },
  "dependencies": {
    "@niceguy/egg-client": "^1.0.0"
  }
}
```

## 框架目录结构

```
packages/egg-client/
├── index.js                  # 框架入口，导出工具函数
├── app.js                    # 框架生命周期：初始化数据库、Redis、日志、认证
├── package.json              # 框架声明（egg.framework: true）
├── .npmignore                # npm 发布排除文件
├── .mocharc.yml              # 测试配置
├── config/
│   ├── config.default.js     # 默认配置（合并策略：项目配置优先）
│   └── plugin.default.js     # 默认插件
├── app/
│   ├── constants/            # 状态码、错误码、密码常量、Redis key
│   ├── core/                 # 数据库客户端管理、Repository、事务封装
│   ├── extend/               # ctx.api / ctx.payload / ctx.repository / helper
│   ├── middleware/           # jwt_auth / error_handler / check_ready 等
│   ├── model/redis/          # RedisAuth 模型（Session CRUD）
│   ├── redis/                # Redis 客户端工厂 & 管理器
│   ├── service/authSystem/   # 认证服务（登录/登出/刷新Token/改密）
│   ├── utils/                # JWT / 加密 / 日志 / 通用 / PrismaManager
│   └── validate/             # 参数校验规则
├── init/                     # 初始化编排脚本
└── test/                     # 测试
    ├── config/
    │   └── config.default.js # 测试环境配置
    ├── app/controller/       # 集成测试
    └── unit/                 # 单元测试
```

## License

MIT