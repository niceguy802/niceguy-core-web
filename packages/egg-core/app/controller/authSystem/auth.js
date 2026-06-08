const Controller = require("egg").Controller;
const errorCode = require("../../constants/error");
const {
  REFRESH_TOKEN_EXPIRES_IN,
  SESSION_COOKIE_NAME,
} = require("../../constants/crypt");
console.log('framework/app/controller/authSystem/auth.js')
class AuthController extends Controller {
  /**
   * 登录：校验 → 调用 service → 返回 accessToken + 设置 refreshToken cookie
   */
  async login() {
    const { ctx } = this;
    ctx.validate(
      {
        username: { type: "string", required: true, min: 3, max: 20 },
        password: { type: "string", required: true, min: 6, max: 20 },
      },
      ctx.payload,
    );

    const result = await ctx.service.authSystem.auth.login(ctx.payload);
    if (!result.ok) {
      return ctx.api.fail(errorCode[result.code]?.msg, result.code, null);
    }

    // 设置 refreshToken 为 HTTP-only cookie
    const maxAge = REFRESH_TOKEN_EXPIRES_IN * 60 * 1000;
    ctx.cookies.set(SESSION_COOKIE_NAME, result.data.refreshToken, {
      httpOnly: true,
      sameSite: "Strict",
      path: "/",
      maxAge,
      signed: false,
    });

    return ctx.api.success({ accessToken: result.data.accessToken });
  }

  /**
   * 刷新 accessToken：从 cookie 获取 refreshToken → 调用 service → 返回新 token
   */
  async refresh() {
    const { ctx } = this;
    const token = ctx.cookies.get(SESSION_COOKIE_NAME, { signed: false });
    if (!token) {
      return ctx.api.fail(errorCode[401]?.msg, 401, null);
    }

    const result = await ctx.service.authSystem.auth.refreshToken({ token });
    if (!result.ok) {
      ctx.cookies.set(SESSION_COOKIE_NAME, null, { maxAge: 0, path: "/" });
      return ctx.api.fail(errorCode[result.code]?.msg, result.code, null);
    }

    // 设置新 refreshToken cookie
    const maxAge = REFRESH_TOKEN_EXPIRES_IN * 60 * 1000;
    ctx.cookies.set(SESSION_COOKIE_NAME, result.data.refreshToken, {
      httpOnly: true,
      sameSite: "Strict",
      path: "/",
      maxAge,
      signed: false,
    });

    return ctx.api.success({ accessToken: result.data.accessToken });
  }

  /**
   * 登出：调用 service → 清除 cookie
   */
  async logout() {
    const { ctx } = this;
    const { uid, sid } = ctx.user;
    await ctx.service.authSystem.auth.logout({ uid, sid });
    ctx.cookies.set(SESSION_COOKIE_NAME, null, { maxAge: 0, path: "/" });
    return ctx.api.success(null);
  }

  /**
   * 用户信息查询（保留，仅做代理）
   */
  async getUserInfo() {
    const { ctx } = this;
    const { username } = ctx.payload;
    const data = await ctx.service.authSystem.auth.findByUser({ username });
    return ctx.api.success(data);
  }

  /**
   * 修改密码：校验 → 调用 service → 清除 cookie
   */
  async changePassword() {
    const { ctx } = this;
    ctx.validate(
      {
        oldPassword: { type: "string", required: true, min: 6, max: 20 },
        newPassword: { type: "string", required: true, min: 6, max: 20 },
      },
      ctx.payload,
    );

    const { uid } = ctx.user;
    const result = await ctx.service.authSystem.auth.changePassword({
      uid,
      oldPassword: ctx.payload.oldPassword,
      newPassword: ctx.payload.newPassword,
    });
    if (!result.ok) {
      return ctx.api.fail(errorCode[result.code]?.msg, result.code, null);
    }

    // 密码已改，全端已登出 → 清除 cookie
    ctx.cookies.set(SESSION_COOKIE_NAME, null, { maxAge: 0, path: "/" });
    return ctx.api.success(null);
  }
}

module.exports = AuthController;
