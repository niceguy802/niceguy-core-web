/**
 * 认证路由
 *
 * POST /api/public/auth/login        - 用户登录
 * POST /api/public/auth/refresh      - 刷新 accessToken
 * POST /api/auth/logout              - 登出（需鉴权）
 * POST /api/auth/changePassword      - 修改密码（需鉴权）
 * GET  /api/auth/getUserInfo         - 获取用户信息
 */
module.exports = (app) => {
  const { router, controller } = app;
  router.post("/public/auth/login", controller.authSystem.auth.login);
  router.post("/public/auth/refresh", controller.authSystem.auth.refresh);
  router.post("/auth/logout", controller.authSystem.auth.logout);
  router.post("/auth/changePassword", controller.authSystem.auth.changePassword);
  router.get("/auth/getUserInfo", controller.authSystem.auth.getUserInfo);
};
