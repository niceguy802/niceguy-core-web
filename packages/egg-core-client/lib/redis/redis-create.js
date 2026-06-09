const Redis = require("ioredis");
const logger = require("../../app/utils/logger");

function createRedis(app) {
    const clients = {};
    const configs = app.config.redis;
    for (const name in configs) {
        const config = configs[name];
        // redis实例
        const redis = new Redis({
            host: config.host,
            port: config.port,
            password: config.password,
            db: config.db,
            lazyConnect: true, // 延迟连接
            maxRetriesPerRequest: config?.maxRetriesPerRequest || 3, // 重试次数
            enableOfflineQueue: false, // 禁用离线队列
            connectTimeout: config?.connectTimeout || 10000, // 连接超时
            // 重试策略
            retryStrategy(times) {
                const delay = Math.min(times * 100, 3000);
                logger.warning(`[Redis:${name}] reconnecting ${times}`);
                return delay;
            },
            // 错误处理
            reconnectOnError(err) {
                const targetError = "READONLY";
                if (err.message.includes(targetError)) {
                    return true;
                }
                return false;
            },
        });

        // 生命周期 监听
        // redis.on('connect', () => {
        //     logger.success(`[Redis:${name}] 已连接`);
        // });
        // 连接
        redis.on("ready", () => {
            logger.success(`[Redis:${name}] 已就绪`);
        });
        // 错误
        redis.on("error", (err) => {
            logger.error(`[Redis:${name}] 错误`, err);
        });
        redis.on("close", () => {
            logger.warning(`[Redis:${name}] 连接关闭`);
        });
        // redis.on('reconnecting', () => {
        //     logger.warning(`[Redis:${name}] 正在连接...`);
        // });
        clients[name] = redis;
    }
    return clients;
}
module.exports = (app) => {
    createRedis
};
