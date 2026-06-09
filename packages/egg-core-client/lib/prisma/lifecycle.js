// ── 数据库生命周期管理 ──────────────────────────────────
// 提供：connect、disconnect、registerLifecycle
// 自动连接 / 自动断开，注册到 Egg 应用的生命周期钩子

/**
 * 连接数据库
 * @param {import('@prisma/client').PrismaClient} client
 */
async function connect(client) {
  if (!client) throw new Error('[prisma/connect] client is required');
  await client.$connect();
}

/**
 * 断开数据库连接
 * @param {import('@prisma/client').PrismaClient} client
 */
async function disconnect(client) {
  if (!client) throw new Error('[prisma/disconnect] client is required');
  await client.$disconnect();
}

/**
 * 注册 Egg 应用生命周期钩子（自动连接 + 自动断开）
 * @param {Object} options
 * @param {import('@prisma/client').PrismaClient} options.client - PrismaClient 实例
 * @param {Egg.Application} options.app - Egg 应用实例
 * @param {string} [options.name] - 数据库名称（仅日志用）
 */
function registerLifecycle(options) {
  const { client, app, name } = options;
  if (!client || !app) return;

  // 应用启动时自动连接
  app.beforeStart(async () => {
    await connect(client);
    app.logger.info('[prisma] Database "%s" connected', name || 'default');
  });

  // 应用关闭时自动断开
  app.beforeClose(async () => {
    await disconnect(client);
    app.logger.info('[prisma] Database "%s" disconnected', name || 'default');
  });
}

module.exports = {
  connect,
  disconnect,
  registerLifecycle,
};
