// JWT认证
module.exports = () => {
  return async (ctx, next) => {
    const { whitelists = [] } = ctx.app.config.auth; // 白名单
    if (whitelists.includes(ctx.request.path)) {
      return next();
    }

    const token = ctx.get("Authorization");

    if (!token) {
      ctx.status = 401;
      return ctx.api.fail("未登录", 401, null);
    }

    try {
      // 验证token并获取用户信息，token格式为Bearer xxx.xxx.xxx
      const decode = ctx.app.jwt.verify(token.replace("Bearer ", ""));

      // 将用户信息存储在ctx中，供后续使用，如ctx.user.userId、ctx.user.roleCode
      ctx.user = decode;

      await next();
    } catch (e) {
      ctx.status = 401;
      return ctx.api.fail("用户未登录或登录已过期", 401, null);
    }
  };
};
