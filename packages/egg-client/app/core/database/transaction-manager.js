// 事务封装
class TransactionManager {
  static async execute(db, callback) {
    return db.$transaction(async (tx) => {
      try { return await callback(tx); } catch (error) { throw error; }
    });
  }
}
module.exports = TransactionManager;
