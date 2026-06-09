// jwt认证 - 文档 Step5 流程：获取 token → 校验 JWT 签名 → 校验 type → 校验 sid 存在性 → 挂载 ctx.user
const errorCode = require("../constants/error");
module.exports = () => {
  return async (ctx, next) => {
    const { allowDevice, whiteList } = ctx.app.config.auth;

    // 0. 设备检测（先于白名单，白名单路径也需要 device）
    // const device = ctx.get("X-Device");
    // if (!device || !allowDevice.includes(device)) {
    //   ctx.api.fail(errorCode[40107]?.msg, 40107, null);
    //   return;
    // }
    // ctx.device = device;

    // 1. 白名单（前缀匹配）跳过 JWT 校验
    if (whiteList.some((prefix) => ctx.request.path.startsWith(prefix))) {
      await next();
      return;
    }

    // 2. 获取 accessToken
    let token = ctx.get("Authorization");
    if (!token) {
      ctx.api.fail(errorCode[401]?.msg, 401, null);
      return;
    }
    token = token.replace("Bearer ", "");

    // 3. 调用 service 验证 accessToken（JWT 签名 → type → sid 存在性）
    const result = await ctx.service.authSystem.auth.verifyAccessToken({ token });

    // 4. 校验未通过 → 直接返回
    if (!result.ok) {
      ctx.api.fail(errorCode[result.code]?.msg, result.code, null);
      return;
    }

    // 5. 校验通过 → 挂载用户信息到 ctx.user
    ctx.user = {
      uid: result.payload.uid,
      sid: result.payload.sid,
      jti: result.payload.jti,
      type: result.payload.type,
    };

    await next();
  };
};
