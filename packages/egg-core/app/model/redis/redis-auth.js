const {
  USER_LOGIN_TOKEN,
  USER_LOGIN_REFRESH_TOKEN,
  USER_LOGIN,
  AUTH_SESSION,
  AUTH_USER_SESSIONS,
  AUTH_REFRESH_LOCK,
} = require("../../constants/redis");

/**
 * 用户token缓存 CRUD
 *
 * === 调用示例（Service层）===
 *   const RedisAuth = require('../../model/redis/redis-auth');
 *   const redisAuth = new RedisAuth(this.app, 'fx');
 *   await redisAuth.setLoginInfo(userId, device, { jti, refreshToken, accessTtl, refreshTtl });
 *   const jti = await redisAuth.getLoginToken(userId, device);
 *   const valid = await redisAuth.checkTokenValid(userId, device, jti);
 *   await redisAuth.removeAllUserTokens(userId); // 全设备强制登出
 */
class RedisAuth {
  constructor(app, clientName = "fx") {
    this.app = app;
    this.clientName = clientName;
    this.redis = this.app.redis.getClient(this.clientName);
  }

  // 获取底层 ioredis 客户端（scan / pipeline 等封装层未覆盖的操作）
  _client() {
    return this.app.redis.getClient(this.clientName);
  }

  // ==================== 增 ====================

  /**
   * 缓存 access_token 的 JTI
   * @param {String} userId 用户ID
   * @param {String} device 设备类型，如pc/h5/app
   * @param {String} jti token唯一标识
   * @param {Number} ttl 过期时间 分钟
   * @memberof RedisAuth
   */
  async setLoginToken(userId, device, jti, ttl) {
    const key = `${USER_LOGIN_TOKEN}:${userId}:${device}`;
    await this.redis.set(key, jti, "EX", ttl * 60);
  }

  // 缓存 refresh_token 的 JTI
  async setRefreshToken(userId, device, jti, ttl) {
    const key = `${USER_LOGIN_REFRESH_TOKEN}:${userId}:${device}`;
    await this.redis.set(key, jti, "EX", ttl * 60);
  }

  // 一次写入登录所需的全部 token 信息（推荐，减少 RTT）
  async setLoginInfo(
    userId,
    device,
    { jti, refreshJti, accessTtl, refreshTtl },
  ) {
    const accessKey = `${USER_LOGIN_TOKEN}:${userId}:${device}`;
    const refreshKey = `${USER_LOGIN_REFRESH_TOKEN}:${userId}:${device}`;
    const pipeline = this._client().pipeline();
    pipeline.set(accessKey, jti, "EX", accessTtl * 60);
    pipeline.set(refreshKey, refreshJti, "EX", refreshTtl * 60);
    await pipeline.exec();
  }

  // 缓存用户基本信息（供快速查询，避免每次查库）
  async setUserCache(userId, userInfo, ttl) {
    const key = `${USER_LOGIN}:${userId}`;
    await this.redis.set(key, userInfo, "EX", ttl * 60);
  }

  // ==================== 查 ====================

  // 获取缓存的 access_token JTI
  async getLoginToken(userId, device) {
    const key = `${USER_LOGIN_TOKEN}:${userId}:${device}`;
    return await this.redis.get(key);
  }

  // 获取缓存的 refresh_token
  async getRefreshToken(userId, device) {
    const key = `${USER_LOGIN_REFRESH_TOKEN}:${userId}:${device}`;
    return await this.redis.get(key);
  }

  // 获取缓存的用户信息
  async getUserCache(userId) {
    const key = `${USER_LOGIN}:${userId}`;
    return await this.redis.get(key);
  }

  // 校验 token 是否与缓存中的 JTI 一致（登入态判定核心）
  async checkTokenValid(userId, device, jti) {
    const cached = await this.getLoginToken(userId, device);
    return cached === jti;
  }

  // 获取用户所有已登录设备及其 JTI，返回 { device: jti }
  async getUserDevices(userId) {
    const pattern = `${USER_LOGIN_TOKEN}:${userId}:*`;
    const client = this._client();
    const devices = {};
    let cursor = "0";
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      for (const key of keys) {
        const device = key.split(":").pop();
        const jti = await this.redis.get(key);
        if (jti !== null) devices[device] = jti;
      }
    } while (cursor !== "0");
    return devices;
  }

  // 检查用户是否在指定设备登录
  async hasDevice(userId, device) {
    const jti = await this.getLoginToken(userId, device);
    return jti && jti !== null;
  }

  // ==================== 删 ====================

  // 删除单设备 access_token
  async removeLoginToken(userId, device) {
    const key = `${USER_LOGIN_TOKEN}:${userId}:${device}`;
    await this.redis.del(key);
  }

  // 删除单设备 refresh_token
  async removeRefreshToken(userId, device) {
    const key = `${USER_LOGIN_REFRESH_TOKEN}:${userId}:${device}`;
    await this.redis.del(key);
  }

  // 删除单设备全部 token（access + refresh，单设备登出推荐）
  async removeDeviceTokens(userId, device) {
    const accessKey = `${USER_LOGIN_TOKEN}:${userId}:${device}`;
    const refreshKey = `${USER_LOGIN_REFRESH_TOKEN}:${userId}:${device}`;
    Promise.all([
      await this.redis.del(accessKey),
      await this.redis.del(refreshKey),
    ]);
  }

  // 删除用户所有 token（全设备强制登出）
  async removeAllUserTokens(userId) {
    const patterns = [
      `${USER_LOGIN_TOKEN}:${userId}:*`,
      `${USER_LOGIN_REFRESH_TOKEN}:${userId}:*`,
      `${USER_LOGIN}:${userId}`,
    ];
    const client = this.redis;
    const toDelete = [];
    for (const pattern of patterns) {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100,
        );
        cursor = nextCursor;
        toDelete.push(...keys);
      } while (cursor !== "0");
    }
    if (toDelete.length > 0) {
      await client.del(...toDelete);
    }
  }

  // ==================== 辅助 ====================

  /**
   * 续期 access_token TTL（保留原有 JTI）
   * @param {String} userId 用户ID
   * @param {String} device 设备类型
   * @param {Number} ttl 过期时长 分钟
   */
  async refreshLoginTokenTtl(userId, device, ttl) {
    const key = `${USER_LOGIN_TOKEN}:${userId}:${device}`;
    await this.redis.expire(key, ttl * 60);
  }

  /**
   * 续期 refresh_token TTL
   * @param {String} userId 用户ID
   * @param {String} device 设备类型
   * @param {Number} ttl 过期时长 分钟
   */
  async refreshRefreshTokenTtl(userId, device, ttl) {
    const key = `${USER_LOGIN_REFRESH_TOKEN}:${userId}:${device}`;
    await this.redis.expire(key, ttl * 60);
  }

  /**
   * 存续用户信息user:logion:id
   * @param {String} userId 用户ID
   * @param {Number} ttl 过期时长 分钟
   * @memberof RedisAuth
   */
  async userCacheTtl(userId, ttl = 15) {
    const key = `${USER_LOGIN}:${userId}`;
    await this.redis.expire(key, ttl * 60);
  }

  // ==================== Session ====================

  /**
   * 存储登录会话 —— 文档规范 auth:session:{sid}
   * @param {String} sid 会话ID
   * @param {Object} data { uid, refreshJti, platform, iat, lastRefreshTime }
   * @param {Number} ttl 过期时间 秒
   */
  async setAuthSession(sid, data, ttl) {
    const key = `${AUTH_SESSION}:${sid}`;
    await this.redis.set(key, JSON.stringify(data), "EX", ttl);
  }

  /**
   * 获取登录会话 auth:session:{sid}
   * @param {String} sid
   * @returns {Object|null}
   */
  async getAuthSession(sid) {
    const key = `${AUTH_SESSION}:${sid}`;
    const raw = await this.redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  /**
   * 删除登录会话 auth:session:{sid}
   * @param {String} sid
   */
  async delAuthSession(sid) {
    const key = `${AUTH_SESSION}:${sid}`;
    await this.redis.del(key);
  }

  /**
   * 续期 auth:session:{sid} 的 TTL（滑动过期）
   * @param {String} sid
   * @param {Number} ttl 秒
   */
  async expireAuthSession(sid, ttl) {
    const key = `${AUTH_SESSION}:${sid}`;
    await this.redis.expire(key, ttl);
  }

  // ==================== 会话索引 ====================

  /**
   * 添加到用户会话索引 auth:user:{uid}:sessions（Set）
   * @param {Number|String} uid
   * @param {String} sid
   */
  async addUserSession(uid, sid) {
    const key = `${AUTH_USER_SESSIONS}:${uid}`;
    await this.redis.sadd(key, sid);
  }

  /**
   * 从用户会话索引中移除
   * @param {Number|String} uid
   * @param {String} sid
   */
  async removeUserSession(uid, sid) {
    const key = `${AUTH_USER_SESSIONS}:${uid}`;
    await this.redis.srem(key, sid);
  }

  /**
   * 获取用户所有会话ID列表
   * @param {Number|String} uid
   * @returns {Array} sid 数组
   */
  async getUserSessions(uid) {
    const key = `${AUTH_USER_SESSIONS}:${uid}`;
    return await this.redis.smembers(key);
  }

  /**
   * 删除用户的会话索引（全量清除用于全端登出）
   * @param {Number|String} uid
   */
  async clearUserSessions(uid) {
    const key = `${AUTH_USER_SESSIONS}:${uid}`;
    await this.redis.del(key);
  }

  // ==================== 分布式锁（刷新抢锁） ====================

  /**
   * 尝试获取刷新锁
   * @param {String} sid 会话ID
   * @param {Number} ttl 锁超时 秒
   * @returns {Boolean} 是否成功获取锁
   */
  async acquireRefreshLock(sid, ttl = 5) {
    const key = `${AUTH_REFRESH_LOCK}:${sid}`;
    const result = await this.redis.set(key, "1", "NX", "EX", ttl);
    return result === "OK";
  }

  /**
   * 释放刷新锁
   * @param {String} sid 会话ID
   */
  async releaseRefreshLock(sid) {
    const key = `${AUTH_REFRESH_LOCK}:${sid}`;
    await this.redis.del(key);
  }
}

module.exports = RedisAuth;
