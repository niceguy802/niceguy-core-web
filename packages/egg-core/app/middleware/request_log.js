const { requestLogger } = require("../utils/logger");

// 请求日志中间件 — 在全局错误处理之后、JWT 认证之前
module.exports = () => {
  return async (ctx, next) => {
    const start = Date.now();
    const { method, url, ip } = ctx;
    console.log('________________________')
    // console.log(ctx.app.router.match(ctx.path, ctx.method))
    console.table(ctx.app.router.stack.map(route => ({
      method: route.methods.join(','),
      path: route.path,
      handler: route.stack[0].name
    })));
    // console.log(ctx.app.router.match('/', ctx.method))
    // console.log(ctx.method)
    console.log('________________________')
    // 路由匹配检查 — 无匹配路由则直接返回 404，不进入后续中间件
    const matched = ctx.app.router.match(ctx.path, ctx.method);
    if (!matched || !matched.route) {
      // requestLogger.warn(`${method} ${url} 404 - 路由未匹配`, {
      //   type: "notfound",
      //   method,
      //   url,
      //   ip,
      // });
      ctx.status = 404;
      ctx.api.fail("接口不存在", 404, null);
      return;
    }

    try {
      await next();
    } catch (err) {
      const duration = Date.now() - start;
      requestLogger.error(
        `${method} ${url} ${ctx.status || 500} ${duration}ms`,
        {
          type: "error",
          method,
          url,
          ip,
          status: ctx.status || 500,
          duration,
          message: err.message,
          stack: err.stack,
          code: err.code || "",
        },
      );
      throw err;
    }

    const duration = Date.now() - start;
    const status = ctx.status || 200;

    if (status >= 500) {
      requestLogger.error(`${method} ${url} ${status} ${duration}ms`, {
        type: "response",
        method,
        url,
        ip,
        status,
        duration,
      });
    } else if (status >= 400) {
      requestLogger.warn(`${method} ${url} ${status} ${duration}ms`, {
        type: "response",
        method,
        url,
        ip,
        status,
        duration,
      });
    } else {
      requestLogger.info(`${method} ${url} ${status} ${duration}ms`, {
        type: "response",
        method,
        url,
        ip,
        status,
        duration,
      });
    }
  };
};
