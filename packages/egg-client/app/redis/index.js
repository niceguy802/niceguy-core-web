// Redis 客户端创建
const Redis = require('ioredis');
const logger = require('../utils/logger');

module.exports = (app) => {
  const clients = {};
  const configs = app.config.redis;
  for (const name in configs) {
    const config = configs[name];
    const redis = new Redis({
      host: config.host, port: config.port, password: config.password, db: config.db,
      lazyConnect: true,
      maxRetriesPerRequest: config?.maxRetriesPerRequest || 3,
      enableOfflineQueue: false,
      connectTimeout: config?.connectTimeout || 10000,
      retryStrategy(times) { const delay = Math.min(times * 100, 3000); logger.warning('[Redis:' + name + '] reconnecting ' + times); return delay; },
      reconnectOnError(err) { if (err.message.includes('READONLY')) return true; return false; },
    });
    redis.on('ready', () => logger.success('[Redis:' + name + '] 已就绪'));
    redis.on('error', (err) => logger.error('[Redis:' + name + '] 错误', err));
    redis.on('close', () => logger.warning('[Redis:' + name + '] 连接关闭'));
    clients[name] = redis;
  }
  return clients;
};
