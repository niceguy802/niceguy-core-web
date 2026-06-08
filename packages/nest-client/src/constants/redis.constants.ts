// Redis key 前缀常量
export const REDIS_KEYS = {
  USER_LOGIN: 'user:login',
  USER_LOGIN_TOKEN: 'login:token',
  USER_LOGIN_REFRESH_TOKEN: 'login:refresh',
  USER_LOGIN_SESSION: 'login:session',
  USER_SESSION: 'user:session',
  AUTH_SESSION: 'auth:session',
  AUTH_USER_SESSIONS: 'auth:user:sessions',
  AUTH_REFRESH_LOCK: 'auth:refresh:lock',

  DEVICE_OPTION: {
    PC: 'pc', APP: 'app', MINIAPP: 'miniapp',
    WXAPP: 'wxapp', ALIPAY: 'alipay', BAIDU: 'baidu',
    TIKTOK: 'tiktok', QQ: 'qq', DOUYIN: 'douyin', H5: 'h5',
  } as const,
} as const;

// Redis key 构建辅助函数
export const redisKeys = {
  authSession: (sid: string) => `auth:session:${sid}`,
  authUserSessions: (uid: string | number) => `auth:user:${uid}:sessions`,
  authRefreshLock: (sid: string) => `auth:refresh:lock:${sid}`,
  userLogin: (userId: string | number) => `user:login:${userId}`,
};
