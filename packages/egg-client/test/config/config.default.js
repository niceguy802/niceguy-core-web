// 测试用默认配置 — 不启用数据库/Redis，仅测试框架基础能力
'use strict';

module.exports = () => {
  return {
    // 跳过数据库和 Redis 初始化（测试环境无真实服务）
    Dbs: {},
    redis: {},
    // 简化中间件，跳过需要外部依赖的检查
    middleware: ['errorHandler'],
    // 使用默认密钥，不依赖环境变量
    keys: 'test-key-for-egg-client',
    jwt: {
      accessToken: 60 * 60 * 1000,
      refreshToken: 60 * 60 * 24 * 7 * 1000,
      secret: 'test-secret',
    },
    logging: {
      console: { level: 'silent', pretty: false },
      app: { level: 'silent' },
      request: { level: 'silent' },
      prisma: { level: 'error' },
    },
  };
};