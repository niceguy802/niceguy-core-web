'use strict';
// 统一返回格式 & 参数注入 & 数据库访问
const { SUCCESS, SERVER_ERROR } = require('../constants/code');
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

  get encrypt() { return encrypt; },
};
