'use strict';

/**
 * 创建 PrismaClient 代理包装
 * 提供便捷的访问模式：
 *   db.user.findMany()       → 直接模型访问
 *   db.transaction(fn)       → $transaction 包装
 *   db.prisma                → 原始 PrismaClient
 *   db.get('user')           → 等价于 db.user
 *
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @returns {Proxy}
 */
function createDbProxy(prismaClient) {
  if (!prismaClient) {
    throw new Error('[createDbProxy] prismaClient is required');
  }

  return new Proxy(prismaClient, {
    get(target, prop) {
      // 原始 PrismaClient 兜底访问
      if (prop === 'prisma') return target;

      // 事务封装
      if (prop === 'transaction') {
        return (fn, options) => target.$transaction(fn, options);
      }

      // get 方法：proxy.get('user') → proxy.user
      if (prop === 'get') {
        return (key) => target[key];
      }

      // 其余属性/方法委托给原始 PrismaClient
      // 包括：模型访问(user, order...)、自有方法($connect, $on...)
      return target[prop];
    },
  });
}

module.exports = { createDbProxy };
