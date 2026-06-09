// Redis 初始化
const redisCreate = require('../app/core/redis');
const RedisManager = require('../app/core/redis/redis-manager');
const logger = require('../app/utils/logger');

module.exports = async (app) => {
  const redisConfig = app.config.redis;
  if (!redisConfig || Object.keys(redisConfig).length === 0) {
    logger.warn('[Redis] 配置为空，跳过 Redis 初始化');
    return;
  }

  logger.init('[Redis] 正在初始化...');
  const clients = await redisCreate(app);
  for (const name in clients) { await clients[name].connect(); }
  app.redis = new RedisManager(clients);
  app._redisClients = clients;
  logger.success('[Redis] 实例挂载完成');

  app.beforeClose(async () => {
    for (const name in clients) {
      try { await clients[name].quit(); } catch (_) { clients[name].disconnect(); }
    }
    logger.success('[Redis] 连接关闭');
  });
};
