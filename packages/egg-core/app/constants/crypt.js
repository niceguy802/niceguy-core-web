// JWT 配置
module.exports = {
  ALG: 'HS256',
  ACCESS_SECRET: 'niceguy328597wndvhefn8935nx',
  REFRESH_SECRET: 'niceguyondgnos0sdfodf0ssfs34',
  SESSION_EXPIRES_IN: 7 * 24 * 60,              // 会话最长有效时长 7天，单位 分钟
  TOKEN_EXPIRES_IN: 1,                           // jwt过期时长 1小时，单位 分钟
  REFRESH_TOKEN_EXPIRES_IN: 7 * 24 * 60,        // 刷新token过期时长 7天，单位 分钟
  SESSION_COOKIE_NAME: 'sessionId',
};
