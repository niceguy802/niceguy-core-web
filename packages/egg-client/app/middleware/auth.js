// JWT 认证（旧版，兼容）
module.exports = () => {
  return async (ctx, next) => {
    const { whitelists = [] } = ctx.app.config.auth;
    if (whitelists.includes(ctx.request.path)) { return next(); }
    const token = ctx.get('Authorization');
    if (!token) { ctx.status = 401; return ctx.api.fail('未登录', 401, null); }
    try {
      ctx.user = ctx.app.jwt.verify(token.replace('Bearer ', ''));
      await next();
    } catch (e) {
      ctx.status = 401;
      return ctx.api.fail('用户未登录或登录已过期', 401, null);
    }
  };
};
