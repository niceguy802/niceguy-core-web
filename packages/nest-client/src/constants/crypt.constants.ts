// JWT 和加密相关常量
export const SALT_ROUNDS = 10;
export const ALG = 'HS256';
export const ACCESS_SECRET = 'niceguy328597wndvhefn8935nx';
export const REFRESH_SECRET = 'niceguyondgnos0sdfodf0ssfs34';
export const SESSION_EXPIRES_IN = 7 * 24 * 60;           // 会话最长有效时长 7天，单位分钟
export const TOKEN_EXPIRES_IN = 60;                       // accessToken 过期时长 1小时，单位分钟
export const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60;     // refreshToken 过期时长 7天，单位分钟
export const SESSION_COOKIE_NAME = 'sessionId';
