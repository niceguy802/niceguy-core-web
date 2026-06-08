# @niceguy/nest-client

NestJS 核心框架包 — 将 egg-client 的通用基础设施能力迁移到 NestJS，提供中间件、数据层、认证、日志、Redis 等开箱即用的能力。

## 核心特性

- **即拉即用**：安装依赖 + 导入模块，所有封装自动生效
- **NestJS 原生集成**：基于 `@nestjs/common`，完美融入模块化体系
- **多项目复用**：一套核心逻辑应用于多个业务项目

## 安装

```bash
npm install @niceguy/nest-client
```

## 使用方式

### 1. 导入模块

在 AppModule 中导入 `NestClientModule`：

```typescript
import { Module } from '@nestjs/common';
import { NestClientModule } from '@niceguy/nest-client';

@Module({
  imports: [
    NestClientModule.forRoot({
      Dbs: {
        fx: {
          type: 'mysql',
          host: '127.0.0.1',
          port: 3306,
          user: 'root',
          password: '123456',
          database: 'db_base',
        },
      },
      redis: {
        fx: { host: '127.0.0.1', port: 6379, password: '123456', db: 0 },
      },
    }),
  ],
})
export class AppModule {}
```

### 2. 在业务中使用

```typescript
import { Injectable } from '@nestjs/common';
import { DatabaseService, RedisService, BaseRepository, AuthService } from '@niceguy/nest-client';

@Injectable()
export class UserService {
  constructor(
    private databaseService: DatabaseService,
    private redisService: RedisService,
    private authService: AuthService,
  ) {}

  async getUser(id: number) {
    const db = this.databaseService.getClient('fx');
    return db.user_info.findUnique({ where: { id } });
  }
}
```

### 3. 注册全局拦截器和过滤器

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor, GlobalExceptionFilter } from '@niceguy/nest-client';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(3000);
}
bootstrap();
```

### 4. JWT 认证守卫

```typescript
import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard, IS_PUBLIC_KEY } from '@niceguy/nest-client';
import { SetMetadata } from '@nestjs/common';

@Controller('/api')
export class AppController {
  // 公开接口（无需登录）
  @SetMetadata(IS_PUBLIC_KEY, true)
  @Post('public/hello')
  hello() { return 'world'; }

  // 需要登录
  @UseGuards(JwtAuthGuard)
  @Post('user/info')
  getUserInfo(@Req() req) {
    return req.user; // { uid, sid, jti, type }
  }
}
```

## 目录结构

```
packages/nest-client/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts                    # 主入口
    ├── nest-client.module.ts       # 主模块（可配 DynamicModule）
    ├── constants/                  # 状态码、错误码、Redis key 等
    ├── config/                     # 配置接口和默认配置
    ├── infrastructure/
    │   ├── database/               # 数据库（Prisma）多库管理
    │   └── redis/                  # Redis 多实例管理
    ├── logger/                     # Pino 日志服务
    ├── auth/                       # 认证模块（登录/登出/刷新Token）
    │   ├── guards/                 # JWT 守卫、权限守卫
    │   └── types/                  # 认证相关类型定义
    ├── interceptors/               # 统一响应格式拦截器
    ├── filters/                    # 全局异常过滤器
    ├── guards/                     # 通用守卫
    └── utils/                      # 加密、JWT、通用工具
```

## 提供的能力

| 模块 | 提供能力 | 使用方式 |
|------|---------|---------|
| **拦截器** | 统一 API 响应格式 | `app.useGlobalInterceptors(new ResponseInterceptor())` |
| **过滤器** | 全局异常处理 | `app.useGlobalFilters(new GlobalExceptionFilter())` |
| **守卫** | JWT 认证 / 权限校验 | `@UseGuards(JwtAuthGuard)` |
| **认证服务** | login / logout / refresh / changePassword | `AuthService` |
| **数据库** | Prisma 多库管理 / CRUD Repository | `DatabaseService.getClient('fx')` |
| **Redis** | 多实例客户端 | `RedisService.getClient('fx')` |
| **日志** | 按日切割 / 终端彩显 / Prisma SQL 日志 | `NestLoggerService` |
| **常量** | HTTP 状态码 / 错误码 / Redis key | `import { CODE, ERROR_CODE } from '@niceguy/nest-client'` |
| **工具类** | 加密 / JWT / 时间格式化 | `import { encryptPassword, createToken } from '@niceguy/nest-client'` |

## License

MIT
