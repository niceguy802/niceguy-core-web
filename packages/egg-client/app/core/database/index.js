// 数据库模块入口
const createDatabaseClients = require('./database-manager');
const { setupPrismaLogging } = require('./prisma-logging');

/**
 * 初始化所有数据库客户端
 * @param {Egg.Application} app
 * @returns {Object} { dbName: PrismaClient }
 */
function initDatabases(app) {
  const clients = createDatabaseClients(app);
  const loggingConfig = app.config.logging;
  for (const key in clients) {
    if (clients[key]) setupPrismaLogging(key, clients[key], loggingConfig);
  }
  return clients;
}

module.exports = { initDatabases };
