// 全局错误处理中间件
const errorCode = require('../constants/error');

module.exports = () => {
  return async function errorHandler(ctx, next) {
    try {
      await next();
      if (ctx.status === 404 && !ctx.body) {
        ctx.status = 404;
        ctx.api.fail(errorCode[404].msg, 404, null);
      }
    } catch (err) {
      ctx.status = err.status || 500;
      ctx.logger.error(err);
      if (err.code) {
        if (err.code === 'invalid_param') {
          ctx.status = 200;
          const errors = err.errors[0];
          ctx.api.fail(errors.field + ' ' + errors.message, 422, null);
          return;
        }
        ctx.api.fail(err.msg || err.message, err.code, err.data || null);
        return;
      }
      ctx.api.fail(err.message || errorCode[500].msg, 500, null);
    }
  };
};
