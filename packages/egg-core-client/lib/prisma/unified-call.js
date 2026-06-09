// ── 统一调用方法 ─────────────────────────────────────────
// 提供：call —— 统一的数据库操作调用入口
// 封装自动连接、事务、日志、断开等职责

const { connect, disconnect } = require('./lifecycle');
const { executeTransaction } = require('./transaction');
const { setupLogging } = require('./logging');

/**
 * 统一数据库操作调用
 * 按需自动 connect → 执行操作（可选事务）→ 按需自动 disconnect
 *
 * @param {import('@prisma/client').PrismaClient} client - PrismaClient 实例
 * @param {Function} callback - 业务操作回调 (client) => result
 * @param {Object} [options]
 * @param {string} [options.name] - 数据库名称（用于日志）
 * @param {boolean} [options.autoConnect=true] - 是否自动 connect
 * @param {boolean} [options.autoDisconnect=false] - 完成后是否自动 disconnect
 * @param {boolean} [options.useTransaction=false] - 是否在事务中执行
 * @param {Object} [options.transactionOptions] - 事务选项（maxWait, timeout）
 * @param {Object} [options.loggingConfig] - 日志配置（传此参数则自动 setupLogging）
 * @returns {Promise<*>} 回调返回值
 *
 * @example
 * // 简单查询
 * const users = await call(client, (db) => db.user.findMany(), { name: 'default' });
 *
 * // 事务
 * const result = await call(client, async (tx) => {
 *   const a = await tx.account.create({ data });
 *   const b = await tx.log.create({ data });
 *   return { a, b };
 * }, { useTransaction: true, name: 'default' });
 */
async function call(client, callback, options = {}) {
  const {
    name = 'default',
    autoConnect = true,
    autoDisconnect = false,
    useTransaction = false,
    transactionOptions,
    loggingConfig,
  } = options;

  if (!client) throw new Error('[prisma/call] client is required');
  if (typeof callback !== 'function') {
    throw new Error('[prisma/call] callback must be a function');
  }

  // 挂载日志（仅首次调用自动挂载，幂等性由内部缓存保证）
  if (loggingConfig) {
    setupLogging(name, client, loggingConfig);
  }

  // 自动连接
  if (autoConnect) {
    await connect(client);
  }

  try {
    // 事务模式
    if (useTransaction) {
      return await executeTransaction(client, callback, transactionOptions);
    }
    // 普通模式
    return await callback(client);
  } finally {
    // 自动断开
    if (autoDisconnect) {
      await disconnect(client);
    }
  }
}

module.exports = {
  call,
};
