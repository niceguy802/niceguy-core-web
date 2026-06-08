const Service = require('egg').Service;
const { comparePassword, encryptPassword } = require('../../utils/encrypt');
const { createToken, verifyToken } = require('../../utils/jwt');
const { TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN, ACCESS_SECRET, REFRESH_SECRET, SESSION_EXPIRES_IN } = require('../../constants/crypt');
const { randomUUID } = require('crypto');

class AuthService extends Service {

  async login({ username, password }) {
    const { ctx, app } = this;
    const user = await this.findByUser({ username });
    if (!user) return { ok: false, code: 40105 };
    if (user.status !== 1) return { ok: false, code: 40301 };

    const valid = await comparePassword(password, user.pwd);
    if (!valid) return { ok: false, code: 40106 };

    const sid = randomUUID();
    const accessJti = randomUUID();
    const refreshJti = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const accessToken = createToken({ uid: user.id, sid, jti: accessJti, type: 'access', iat: now }, ACCESS_SECRET, { expiresIn: TOKEN_EXPIRES_IN + 'm' });
    const refreshToken = createToken({ uid: user.id, sid, jti: refreshJti, type: 'refresh', iat: now }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN + 'm' });

    const sessionTtl = SESSION_EXPIRES_IN * 60;
    const redis = app.modle.redis.redisAuth;
    await redis.setAuthSession(sid, { uid: user.id, refreshJti, platform: 'unknown', iat: now, lastRefreshTime: now }, sessionTtl);
    await redis.addUserSession(user.id, sid);
    await redis.setUserCache(user.id, JSON.stringify({ userId: user.id, enName: user.en_name, roles: [], status: user.status }), REFRESH_TOKEN_EXPIRES_IN);

    return { ok: true, data: { accessToken, refreshToken, sid } };
  }

  async verifyAccessToken({ token }) {
    const { app } = this;
    let payload;
    try { payload = verifyToken(token, ACCESS_SECRET); }
    catch (err) { return { ok: false, code: err.name === 'TokenExpiredError' ? 40101 : 40103 }; }
    if (!payload || payload.type !== 'access') return { ok: false, code: 40103 };
    const session = await app.modle.redis.redisAuth.getAuthSession(payload.sid);
    if (!session) return { ok: false, code: 40104 };
    return { ok: true, payload };
  }

  async refreshToken({ token }) {
    const { ctx, app } = this;
    let payload;
    try { payload = verifyToken(token, REFRESH_SECRET); }
    catch (err) { return { ok: false, code: err.name === 'TokenExpiredError' ? 40102 : 40103 }; }
    if (payload.type !== 'refresh') return { ok: false, code: 40103 };
    const { uid, sid, jti } = payload;
    const redis = app.modle.redis.redisAuth;
    const session = await redis.getAuthSession(sid);
    if (!session) return { ok: false, code: 40104 };
    if (session.refreshJti !== jti) return { ok: false, code: 401 };

    const locked = await redis.acquireRefreshLock(sid);
    if (!locked) return { ok: false, code: 401 };
    try {
      const sessionAfterLock = await redis.getAuthSession(sid);
      if (!sessionAfterLock || sessionAfterLock.refreshJti !== jti) return { ok: false, code: 401 };
      const now = Math.floor(Date.now() / 1000);
      const newRefreshJti = randomUUID();
      const newAccessJti = randomUUID();
      const newAccessToken = createToken({ uid, sid, jti: newAccessJti, type: 'access', iat: now }, ACCESS_SECRET, { expiresIn: TOKEN_EXPIRES_IN + 'm' });
      const newRefreshToken = createToken({ uid, sid, jti: newRefreshJti, type: 'refresh', iat: now }, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN + 'm' });
      sessionAfterLock.refreshJti = newRefreshJti;
      sessionAfterLock.lastRefreshTime = now;
      await redis.setAuthSession(sid, sessionAfterLock, SESSION_EXPIRES_IN * 60);
      return { ok: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } };
    } finally { await redis.releaseRefreshLock(sid); }
  }

  async logout({ uid, sid }) {
    const { app } = this;
    const redis = app.modle.redis.redisAuth;
    await redis.delAuthSession(sid);
    await redis.removeUserSession(uid, sid);
  }

  async kickout({ uid }) {
    const { app } = this;
    const redis = app.modle.redis.redisAuth;
    const { AUTH_SESSION, AUTH_USER_SESSIONS } = require('../../constants/redis');
    const sids = await redis.getUserSessions(uid);
    const pipeline = redis._client().pipeline();
    for (const sid of sids) pipeline.del(AUTH_SESSION + ':' + sid);
    pipeline.del(AUTH_USER_SESSIONS + ':' + uid);
    await pipeline.exec();
  }

  async changePassword({ uid, oldPassword, newPassword }) {
    const { ctx, app } = this;
    const { Raw } = ctx.repository.fx;
    const user = await Raw('user_info').findOne({ where: { id: uid } });
    if (!user) return { ok: false, code: 40105 };
    const valid = await comparePassword(oldPassword, user.pwd);
    if (!valid) return { ok: false, code: 40106 };
    const newHash = encryptPassword(newPassword);
    await Raw('user_info').updateByFilter({ where: { id: uid }, data: { pwd: newHash, update_time: new Date() } });
    await this.kickout({ uid });
    return { ok: true };
  }

  async refreshUserCache({ id }) {
    if (!id) return null;
    const { ctx, app } = this;
    const { Raw } = ctx.repository.fx;
    const user = await Raw('user_info').findOne({ where: { id } });
    if (!user) return null;
    const payload = { userId: id, enName: user.en_name, roles: [], status: user.status };
    await app.modle.redis.redisAuth.setUserCache(id, JSON.stringify(payload), TOKEN_EXPIRES_IN);
    return user;
  }

  async findByUser({ username }) {
    const { ctx } = this;
    const { Raw } = ctx.repository.fx;
    return await Raw('user_info').findOne({ where: { en_name: username } });
  }

  async findMany(query = {}) {
    const { ctx } = this;
    const { Raw } = ctx.repository.fx;
    return await Raw('user_info').findMany(query);
  }

  async updateUserMany(user) {
    const { ctx } = this;
    if (!Array.isArray(user)) user = [user];
    const { transaction } = ctx.repository.fx;
    const dateTime = new Date();
    await transaction(async (db) => {
      for (const o of user) {
        const { id, ...data } = o;
        if (!id) continue;
        await db.Raw('user_info').updateByFilter({ where: { id }, data: { ...data, update_time: dateTime } });
      }
    });
  }
}

module.exports = AuthService;
