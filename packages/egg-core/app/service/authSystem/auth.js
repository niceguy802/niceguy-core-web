const Service = require("egg").Service;
const { comparePassword, encryptPassword } = require("../../utils/encrypt");
const { createToken, verifyToken } = require("../../utils/jwt");
const {
  TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  ACCESS_SECRET,
  REFRESH_SECRET,
  SESSION_EXPIRES_IN,
} = require("../../constants/crypt");
const { randomUUID } = require("crypto");

class AuthService extends Service {

  /**
   * 【登录】校验账号密码 → 生成 sid/jti → 签发 token → 写入 Redis session + 索引
   * @param {Object} params { username, password }
   * @returns {Object} { ok, code?, data: { accessToken, refreshToken } }
   */
  async login({ username, password }) {
    const { ctx, app } = this;

    // Step1: 查库 + 密码校验
    const user = await this.findByUser({ username });
    if (!user) return { ok: false, code: 40105 };
    if (user.status !== 1) return { ok: false, code: 40301 };

    const valid = await comparePassword(password, user.pwd);
    if (!valid) return { ok: false, code: 40106 };

    // Step2: 生成 sid / jti
    const sid = randomUUID();
    const accessJti = randomUUID();
    const refreshJti = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const platform = ctx.device || "unknown";

    // Step3: 签发 token
    const accessToken = createToken(
      { uid: user.id, sid, jti: accessJti, type: "access", iat: now },
      ACCESS_SECRET,
      { expiresIn: TOKEN_EXPIRES_IN + "m" }
    );
    const refreshToken = createToken(
      { uid: user.id, sid, jti: refreshJti, type: "refresh", iat: now },
      REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN + "m" }
    );

    // Step4: 写入 Redis session + 会话索引
    const sessionTtl = SESSION_EXPIRES_IN * 60; // 秒
    const redis = app.modle.redis.redisAuth;
    await redis.setAuthSession(sid, {
      uid: user.id,
      refreshJti,
      platform,
      iat: now,
      lastRefreshTime: now,
    }, sessionTtl);
    await redis.addUserSession(user.id, sid);
    // 缓存用户基本信息
    await redis.setUserCache(
      user.id,
      JSON.stringify({ userId: user.id, enName: user.en_name, roles: [], status: user.status }),
      REFRESH_TOKEN_EXPIRES_IN,
    );

    return { ok: true, data: { accessToken, refreshToken, sid } };
  }

  /**
   * 【校验 accessToken】JWT 签名验证 → type → sid 存在性
   * @param {Object} params { token }
   * @returns {Object} { ok, code?, payload? }
   */
  async verifyAccessToken({ token }) {
    const { app } = this;

    let payload;
    try {
      payload = verifyToken(token, ACCESS_SECRET);
    } catch (err) {
      // 过期、密钥不对、格式不对
      const { name } = err;
      const code = name === "TokenExpiredError" ? 40101 : 40103;
      return { ok: false, code };
    }

    if (!payload || payload.type !== "access") {
      return { ok: false, code: 40103 };
    }

    // 查验 sid 对应的 Redis session 是否存在
    const session = await app.modle.redis.redisAuth.getAuthSession(payload.sid);
    if (!session) {
      return { ok: false, code: 40104 };
    }

    return { ok: true, payload };
  }

  /**
   * 【刷新 token】校验 refreshToken → sid + jti → 抢锁 → 轮换 → 更新
   * @param {Object} params { token }
   * @returns {Object} { ok, code?, data: { accessToken, refreshToken } }
   */
  async refreshToken({ token }) {
    const { ctx, app } = this;

    // Step1-2: 校验 JWT 签名
    let payload;
    try {
      payload = verifyToken(token, REFRESH_SECRET);
    } catch (err) {
      // 过期、密钥不对、格式不对// 过期、密钥不对、格式不对
      const { name } = err;
      const code = name === "TokenExpiredError" ? 40102 : 40103;
      return { ok: false, code };
    }

    // Step3: 校验 type
    if (payload.type !== "refresh") {
      return { ok: false, code: 40103 };
    }

    const { uid, sid, jti } = payload;
    const redis = app.modle.redis.redisAuth;

    // Step4: 校验 sid → Redis session 是否存在
    const session = await redis.getAuthSession(sid);
    if (!session) {
      return { ok: false, code: 40104 };
    }

    // Step5: 校验 refreshJti 是否匹配（防 refreshToken 被盗用）
    if (session.refreshJti !== jti) {
      return { ok: false, code: 401 };
    }

    // Step6: 抢锁（防止并发刷新竞争）
    const locked = await redis.acquireRefreshLock(sid);
    if (!locked) {
      return { ok: false, code: 401 };
    }

    try {
      // Step7: 双重检查 refreshJti
      const sessionAfterLock = await redis.getAuthSession(sid);
      if (!sessionAfterLock || sessionAfterLock.refreshJti !== jti) {
        return { ok: false, code: 401 };
      }

      // Step8: 生成新 jti 和 token
      const now = Math.floor(Date.now() / 1000);
      const newRefreshJti = randomUUID();
      const newAccessJti = randomUUID();

      const newAccessToken = createToken(
        { uid, sid, jti: newAccessJti, type: "access", iat: now },
        ACCESS_SECRET,
        { expiresIn: TOKEN_EXPIRES_IN + "m" }
      );
      const newRefreshToken = createToken(
        { uid, sid, jti: newRefreshJti, type: "refresh", iat: now },
        REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN + "m" }
      );

      // Step9: 更新 Redis session（轮换 refreshJti + 续期）
      sessionAfterLock.refreshJti = newRefreshJti;
      sessionAfterLock.lastRefreshTime = now;
      await redis.setAuthSession(sid, sessionAfterLock, SESSION_EXPIRES_IN * 60);

      return { ok: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } };
    } finally {
      // Step10: 释放锁
      await redis.releaseRefreshLock(sid);
    }
  }

  /**
   * 【登出】删除 Redis session 及会话索引
   * @param {Object} params { uid, sid }
   */
  async logout({ uid, sid }) {
    const { app } = this;
    const redis = app.modle.redis.redisAuth;
    await redis.delAuthSession(sid);
    await redis.removeUserSession(uid, sid);
  }

  /**
   * 【全端登出】删除用户所有 session
   * @param {Object} params { uid }
   */
  async kickout({ uid }) {
    const { app } = this;
    const redis = app.modle.redis.redisAuth;
    const sids = await redis.getUserSessions(uid);
    const pipeline = redis._client().pipeline();
    const { AUTH_SESSION, AUTH_USER_SESSIONS } = require("../../constants/redis");
    for (const sid of sids) {
      pipeline.del(`${AUTH_SESSION}:${sid}`);
    }
    pipeline.del(`${AUTH_USER_SESSIONS}:${uid}`);
    await pipeline.exec();
  }

  /**
   * 【修改密码】校验旧密码 → 更新 → 全端登出
   * @param {Object} params { uid, oldPassword, newPassword }
   * @returns {Object} { ok, code? }
   */
  async changePassword({ uid, oldPassword, newPassword }) {
    const { ctx, app } = this;
    const { Raw } = ctx.repository.fx;
    const user = await Raw("user_info").findOne({ where: { id: uid } });
    if (!user) return { ok: false, code: 40105 };

    const valid = await comparePassword(oldPassword, user.pwd);
    if (!valid) return { ok: false, code: 40106 };

    const newHash = encryptPassword(newPassword);
    await Raw("user_info").updateByFilter({
      where: { id: uid },
      data: { pwd: newHash, update_time: new Date() },
    });

    await this.kickout({ uid });
    return { ok: true };
  }

  /**
   * 刷新用户信息缓存（内部辅助）
   */
  async refreshUserCache({ id }) {
    if (!id) return null;
    const { ctx, app } = this;
    const { Raw } = ctx.repository.fx;
    const user = await Raw("user_info").findOne({ where: { id } });
    if (!user) return null;
    const payload = { userId: id, enName: user.en_name, roles: [], status: user.status };
    await app.modle.redis.redisAuth.setUserCache(id, JSON.stringify(payload), TOKEN_EXPIRES_IN);
    return user;
  }

  /**
   * 根据用户名查询用户
   */
  async findByUser({ username }) {
    const { ctx } = this;
    const { Raw } = ctx.repository.fx;
    return await Raw("user_info").findOne({ where: { en_name: username } });
  }
  /**
   * 查询列表
   * @param {Object} query 查询条件
   * @return {Promise<Array>} user list
   */
  async findMany(query = {}) {
    const { ctx } = this;
    const { Raw } = ctx.repository.fx;
    const users = await Raw("user_info").findMany(query);
    return users;
  }

  /**
   * 批量更新用户（保留供其他模块使用）
   */
  async updateUserMany(user) {
    const { ctx } = this;
    if (!Array.isArray(user)) user = [user];
    const { transaction } = ctx.repository.fx;
    const dateTime = new Date();
    await transaction(async (db) => {
      for (const o of user) {
        const { id, ...data } = o;
        if (!id) continue;
        await db.Raw("user_info").updateByFilter({
          where: { id },
          data: { ...data, update_time: dateTime },
        });
      }
    });
  }
}

module.exports = AuthService;
