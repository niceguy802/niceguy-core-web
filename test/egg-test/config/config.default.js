'use strict';

const path = require('path');

module.exports = (appInfo) => {
  const config = {
    // 集群监听
    cluster: {
      listen: {
        path: '',
        port: 7001,
      },
    },

    // Cookie 签名密钥
    keys: appInfo.name + '_niceguy_egg_client_key',

    // 密码是否加密
    isPwdEncrypt: true,

    // WebSocket 配置
    websocket: {
      enable: false,
    },

    // 数据库连接配置（业务项目覆盖具体连接信息）
    Dbs: {
      fx: { // 登录库
        type: 'mysql',// 数据库类型
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '123456',
        database: 'db_base',
        pool: {
          connectLimit: 5,// 连接池大小 - 按worker
          poolTimeout: 30000,// 连接池超时时间 ms
          socketTimeout: 30000,// SQL执行超时时间
          connectTimeout: 30000,// 建立连接超时
        }
      },
      business: { // 业务库
        type: 'mysql',// 数据库类型
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '123456',
        database: 'db_business',
        pool: {
          connectLimit: 5,// 连接池大小 - 按worker
          poolTimeout: 30000,// 连接池超时时间 ms
          socketTimeout: 30000,// SQL执行超时时间
          connectTimeout: 30000,// 建立连接超时
        }
      }
    },

    // Redis 连接配置（业务项目覆盖具体连接信息）
    redis: {
      fx: {
        // 登录库
        host: "127.0.0.1",
        port: 6379,
        password: "123456",
        db: 0,
      },
      bussiness: {
        host: "127.0.0.1",
        port: 6379,
        password: "123456",
        db: 1,
      },
    },

    // 日志配置（框架内置，亦可被项目覆盖）
    logging: {
      console: {
        level: 'info',
        pretty: true,
      },
      request: {
        level: 'warn',
        terminal: false,
        filePath: path.join(appInfo.baseDir, 'logs', 'request'),
      },
      app: {
        level: 'warn',
        pretty: true,
        terminal: false,
        filePath: path.join(appInfo.baseDir, 'logs', 'app'),
      },
      prisma: {
        level: 'warn',
        sqlTerminal: true,
        sqlLogLevel: 'debug',
        slowQueryMs: 20000,
        filePath: path.join(appInfo.baseDir, 'logs', 'prisma'),
      },
    },

    // CSRF 安全配置（API 使用 JWT Header 鉴权，不依赖 Cookie）
    security: {
      csrf: {
        enable: false,
        ignore: (ctx) => ctx.path.startsWith('/api'),
      },
    },

    // 全局中间件
    middleware: ["test"],

    // 文件上传限制
    fileLimit: {
      whiteList: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.xlsx', '.xls', '.doc', '.docx'],
      size: 10, // MB
    },

    // 认证配置
    auth: {
      whiteList: ['/api/public'],           // API 白名单（前缀匹配，跳过 jwt 校验）
    },
  };

  return config;
};