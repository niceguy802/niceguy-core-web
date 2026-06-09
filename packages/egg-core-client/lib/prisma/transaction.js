// ── 事务封装 ─────────────────────────────────────────────
// 提供：executeTransaction —— Prisma 事务的统一调用封装

/**
 * 执行数据库事务
 * @param {import('@prisma/client').PrismaClient} client - PrismaClient 实例
 * @param {Function} callback - 事务回调，接收 tx (Prisma.TransactionClient) 参数
 * @param {Object} [options] - 事务选项
 * @param {number} [options.maxWait] - 最大等待时间（ms）
 * @param {number} [options.timeout] - 事务超时时间（ms）
 * @returns {Promise<*>} 回调返回值
 *
 * @example
 * const result = await executeTransaction(db, async (tx) => {
 *   const user = await tx.user.create({ data: { name: 'foo' } });
 *   const profile = await tx.profile.create({ data: { userId: user.id } });
 *   return { user, profile };
 * });
 */
async function executeTransaction(client, callback, options) {
  if (!client || typeof callback !== 'function') {
    throw new Error('[executeTransaction] client and callback are required');
  }

  const txOptions = options && (options.maxWait !== undefined || options.timeout !== undefined)
    ? options
    : undefined;

  return client.$transaction(callback, txOptions);
}

module.exports = {
  executeTransaction,
};
