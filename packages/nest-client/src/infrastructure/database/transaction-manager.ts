/** 事务封装 — 对应 egg-client 的 TransactionManager */
export class TransactionManager {
  static async execute(db: any, callback: (tx: any) => Promise<any>): Promise<any> {
    return db.$transaction(async (tx: any) => {
      try {
        return await callback(tx);
      } catch (error) {
        throw error;
      }
    });
  }
}
