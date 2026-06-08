const { requestLogger } = require('../utils/logger');

// 请求日志中间件
module.exports = () => {
  return async (ctx, next) => {
    const start = Date.now();
    const { method, url, ip } = ctx;

    const matched = ctx.app.router.match(ctx.path, ctx.method);
    if (!matched || !matched.route) {
      ctx.status = 404;
      ctx.api.fail('接口不存在', 404, null);
      return;
    }

    try { await next(); } catch (err) {
      const duration = Date.now() - start;
      requestLogger.error(method + ' ' + url + ' ' + (ctx.status || 500) + ' ' + duration + 'ms', { type: 'error', method, url, ip, status: ctx.status || 500, duration, message: err.message, stack: err.stack, code: err.code || '' });
      throw err;
    }

    const duration = Date.now() - start;
    const status = ctx.status || 200;
    if (status >= 500) requestLogger.error(method + ' ' + url + ' ' + status + ' ' + duration + 'ms', { type: 'response', method, url, ip, status, duration });
    else if (status >= 400) requestLogger.warn(method + ' ' + url + ' ' + status + ' ' + duration + 'ms', { type: 'response', method, url, ip, status, duration });
    else requestLogger.info(method + ' ' + url + ' ' + status + ' ' + duration + 'ms', { type: 'response', method, url, ip, status, duration });
  };
};
