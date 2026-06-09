'use strict';

const path = require('path');
const { createDbProxy } = require('./db-proxy');
const { setupLogging, buildPrismaLogDefinitions } = require('./logging');
const { registerLifecycle } = require('./lifecycle');

/**
 * 创建 DbManager —— 多数据库统一管理器
 *
 * 用法：
 *   const db = createDbManager();
 *   app.db = db;
 *   ctx.db = app.db;
 *
 *   // 手动注入（用户自行创建 PrismaClient）
 *   db.register('main', prismaClient);
 *
 *   // 自动注入（从 app.config.Dbs 读取配置，自动创建并注册）
 *   db.registerFromConfig(app);
 *
 *   // 访问
 *   await db('main').user.findMany();
 *   await db('main').order.create({ data: ... });
 *   await db('main').transaction(async (tx) => {
 *     await tx.user.create({ data: ... });
 *   });
 *   const rawClient = db('main').prisma;
 *
 * @returns {Function} 可调用函数 db(name)，返回数据库代理
 */
function createDbManager() {
  const instances = new Map();

  // ── 可调用：db('main') 返回该数据库的代理 ──
  const db = (name) => {
    if (!instances.has(name)) {
      throw new Error('[DbManager] Database "' + name + '" is not registered. ' +
        'Registered: ' + Array.from(instances.keys()).join(', '));
    }
    return instances.get(name);
  };

  // ── 手动注入 ──
  db.register = (name, prismaClient) => {
    if (!name || !prismaClient) {
      throw new Error('[DbManager] register(name, prismaClient) requires both arguments');
    }
    instances.set(name, createDbProxy(prismaClient));
  };

  // ── 自动注入（从 Egg app.config.Dbs 读取配置） ──
  db.registerFromConfig = (app) => {
    if (!app || !app.config) {
      throw new Error('[DbManager] registerFromConfig(app) requires Egg application instance');
    }

    const dbConfig = app.config.Dbs || {};
    const loggingConfig = app.config.logging;
    const logger = app.logger || console;

    for (const key in dbConfig) {
      if (!dbConfig[key]) continue;

      // 从业务项目的 prisma/generated/{key} 加载 PrismaClient
      const projectPrismaPath = path.join(app.baseDir, 'prisma', 'generated', key);
      let PrismaClient;
      try {
        const mod = require(projectPrismaPath);
        PrismaClient = mod.PrismaClient;
      } catch (_) {
        logger.warn('[DbManager] PrismaClient not found for "' + key + '" at: ' + projectPrismaPath);
        continue;
      }

      // 创建 adapter 和 client
      let adapter;
      try {
        const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
        adapter = new PrismaMariaDb(dbConfig[key]);
      } catch (_) {
        logger.warn('[DbManager] Failed to create adapter for "' + key + '"');
        continue;
      }

      const logDefs = buildPrismaLogDefinitions(loggingConfig && loggingConfig.prisma);
      const client = new PrismaClient({ adapter, log: logDefs });

      // 注册到管理器
      db.register(key, client);

      // 挂载日志
      if (loggingConfig && loggingConfig.prisma) {
        setupLogging(key, client, loggingConfig.prisma);
      }

      // 注册生命周期（应用启动自动连接，关闭自动断开）
      registerLifecycle({ client, app, name: key });
    }
  };

  // ── 检查是否已注册 ──
  db.has = (name) => instances.has(name);

  // ── 列出所有已注册的数据库名称 ──
  db.list = () => Array.from(instances.keys());

  return db;
}

module.exports = { createDbManager };
