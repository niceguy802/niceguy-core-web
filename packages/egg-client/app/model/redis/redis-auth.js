// 用户 token 缓存 CRUD（Session 模式）
const { AUTH_SESSION, AUTH_USER_SESSIONS, AUTH_REFRESH_LOCK } = require('../../constants/redis');

class RedisAuth {
  constructor(app, clientName = 'fx') {
    this.app = app;
    this.clientName = clientName;
    this.redis = this.app.redis.getClient(this.clientName);
  }

  _client() { return this.app.redis.getClient(this.clientName); }

  // ==================== Session ====================
  async setAuthSession(sid, data, ttl) {
    await this.redis.set('auth:session:' + sid, JSON.stringify(data), 'EX', ttl);
  }
  async getAuthSession(sid) {
    const raw = await this.redis.get('auth:session:' + sid);
    return raw ? JSON.parse(raw) : null;
  }
  async delAuthSession(sid) { await this.redis.del('auth:session:' + sid); }
  async expireAuthSession(sid, ttl) { await this.redis.expire('auth:session:' + sid, ttl); }

  // ==================== Session Index ====================
  async addUserSession(uid, sid) { await this.redis.sadd('auth:user:' + uid + ':sessions', sid); }
  async removeUserSession(uid, sid) { await this.redis.srem('auth:user:' + uid + ':sessions', sid); }
  async getUserSessions(uid) { return await this.redis.smembers('auth:user:' + uid + ':sessions'); }
  async clearUserSessions(uid) { await this.redis.del('auth:user:' + uid + ':sessions'); }

  // ==================== User Cache ====================
  async setUserCache(userId, userInfo, ttl) { await this.redis.set('user:login:' + userId, userInfo, 'EX', ttl * 60); }
  async getUserCache(userId) { return await this.redis.get('user:login:' + userId); }

  // ==================== Lock ====================
  async acquireRefreshLock(sid, ttl = 5) {
    const result = await this.redis.set('auth:refresh:lock:' + sid, '1', 'NX', 'EX', ttl);
    return result === 'OK';
  }
  async releaseRefreshLock(sid) { await this.redis.del('auth:refresh:lock:' + sid); }
}

module.exports = RedisAuth;