// 数据库实例管理器
// 根据 app.config.Dbs 动态创建 PrismaClient 实例
// Prisma 生成客户端从业务项目的 prisma/generated/{key} 加载
const path = require('path');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { buildPrismaLogDefinitions } = require('./prisma-logging');
const { buildDataBaseUrl } = require('../../utils/prisma');

/**
 * 创建所有配置的数据库客户端实例
 * @param {Egg.Application} app
 * @returns {Object} { dbName: PrismaClient }
 */
function createDatabaseClients(app) {
  const dbConfig = app.config.Dbs || {};
  const loggingConfig = app.config.logging;
  const clients = {};

  for (const key in dbConfig) {
    if (!dbConfig[key]) continue;

    let PrismaClient;
    // 优先从业务项目的 prisma/generated/{key} 加载
    const projectPrismaPath = path.join(app.baseDir, 'prisma', 'generated', key);
    try {
      const mod = require(projectPrismaPath);
      PrismaClient = mod.PrismaClient;
    } catch (_) {
      app.logger && app.logger.warn('[数据库] ' + key + ' PrismaClient 未在项目 prisma/generated 中找到: ' + projectPrismaPath);
      continue;
    }

    const adapter = new PrismaMariaDb(dbConfig[key]);
    clients[key] = new PrismaClient({
      adapter,
      log: buildPrismaLogDefinitions(loggingConfig),
    });
  }

  return clients;
}

module.exports = createDatabaseClients;
