// 事务封装
class TransactionManager {

  /**
   * 执行事务
   * @param {PrismaClient} db
   * @param {Function} callback
   * @example 
   * const result = await TransactionManager.execute(db, async tx => {})
   */
  static async execute(db, callback) {

    return db.$transaction(async tx => {
      try {
        return await callback(tx);
      } catch (error) {
        // Prisma会自动rollback
        throw error;
      }
    });

  }

}

module.exports = TransactionManager;