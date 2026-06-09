'use strict';
// 统一返回格式 & 参数注入 & 数据库访问
const { SUCCESS, SERVER_ERROR } = require('../constants/code');
const BaseRepository = require('../core/repository/base-repository');
const TransactionManager = require('../core/database/transaction-manager');
const encrypt = require('../utils/encrypt');
module.exports = {
     /**
   * 统一 API 响应
   */
  get api() {
    const ctx = this;
    return {
      success(data = null, msg = '操作成功', code = SUCCESS) {
        ctx.body = { code, success: true, msg, data };
      },
      fail(msg = '操作失败', code = SERVER_ERROR, data = null) {
        ctx.body = { code, success: false, msg, data };
      },
      page(list = [], total = 0, msg = '查询成功', code = SUCCESS) {
        ctx.body = { code, success: true, msg, data: { list, total } };
      },
    };
  },

  /**
   * 统一参数注入（合并 body + query + params）
   */
  get payload() {
    return { ...this.request.body, ...this.request.query, ...this.params };
  },

  /**
   * 统一数据库访问
   * 使用: ctx.repository.fx.Raw('user_info').findOne({ where: { id: 1 } })
   * 事务: ctx.repository.fx.transaction(async (db) => { await db.Raw('user_info').create({...}) })
   */
  get repository() {
    if (!this._repository) {
      this._repository = {};
      const Dbs = this.Dbs || {};
      for (const key in Dbs) {
        if (!Dbs[key]) continue;
        this._repository[key] = {
          Raw(modelName) { return new BaseRepository(Dbs[key][modelName]); },
          transaction(callback) { return TransactionManager.execute(Dbs[key], async (tx) => {
            const db = { Raw(modelName) { return new BaseRepository(tx[modelName]); } };
            return await callback(db);
          }); },
        };
      }
    }
    return this._repository;
  },

  get encrypt() { return encrypt; },
};
