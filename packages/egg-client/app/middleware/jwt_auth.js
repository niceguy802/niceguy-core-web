// JWT 认证中间件
const errorCode = require('../constants/error');

module.exports = () => {
  return async (ctx, next) => {
    const { allowDevice, whiteList } = ctx.app.config.auth;

    // 白名单（前缀匹配）跳过 JWT 校验
    if (whiteList.some((prefix) => ctx.request.path.startsWith(prefix))) {
      await next();
      return;
    }

    // 获取 accessToken
    let token = ctx.get('Authorization');
    if (!token) { ctx.api.fail(errorCode[401]?.msg, 401, null); return; }
    token = token.replace('Bearer ', '');

    // 调用 service 验证 accessToken
    const result = await ctx.service.authSystem.auth.verifyAccessToken({ token });
    if (!result.ok) { ctx.api.fail(errorCode[result.code]?.msg, result.code, null); return; }

    // 挂载用户信息
    ctx.user = { uid: result.payload.uid, sid: result.payload.sid, jti: result.payload.jti, type: result.payload.type };
    await next();
  };
};
