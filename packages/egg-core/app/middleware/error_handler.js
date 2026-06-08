// 全局错误处理中间件
const errorCode = require("../constants/error");
module.exports = () => {
  return async function errorHandler(ctx, next) {
    try {
      // 执行后续中间件
      await next();

      // 404
      if (ctx.status === 404 && !ctx.body) {
        ctx.status = 404;
        ctx.api.fail(errorCode[404].msg, 404, null);
      }
    } catch (err) {
      // 状态码 默认服务器错误
      ctx.status = err.status || 500;
      // egg 内部错误日志
      ctx.logger.error(err);
      // 已知业务异常
      if (err.code) {
        // 参数校验错误 400
        if (err.code === "invalid_param") {
          ctx.status = 200;
          const errors = err.errors[0];
          ctx.api.fail(errors.field + " " + errors.message, 422, null);
          return;
        }
        // TODO 其他具体错误
        ctx.api.fail(err.msg || err.message, err.code, err.data || null);
        return;
      }
      // 默认服务器错误 500
      ctx.api.fail(err.message || errorCode[500].msg, 500, null);
    }
  };
};
