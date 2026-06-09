// 数据库初始化
const { initDatabases } = require('../app/core/database');
const logger = require('../app/utils/logger');

module.exports = async (app) => {
  const dbConfig = app.config.Dbs;
  if (!dbConfig || Object.keys(dbConfig).length === 0) {
    logger.warn('[数据库] 配置为空，跳过数据库初始化');
    return;
  }

  logger.info('[数据库] 正在初始化...');

  try {
    const clients = initDatabases(app);

    // 测试连通性
    for (const db in clients) {
      if (!clients[db]) continue;
      await clients[db].$connect();
      logger.success('[数据库] ' + db + ' 连接成功');
    }

    // 挂载到 app 和 ctx
    app.Dbs = clients;
    app.context.Dbs = clients;

    // 应用关闭时释放连接
    app.beforeClose(async () => {
      for (const db in clients) {
        if (!clients[db]) continue;
        try { await clients[db].$disconnect(); } catch (_) {}
      }
    });
  } catch (err) {
    logger.warn('[数据库] PrismaClient 初始化失败，跳过数据库（不影响应用启动）');
  }
};