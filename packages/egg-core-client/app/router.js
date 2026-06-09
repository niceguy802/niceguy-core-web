'use strict';
module.exports = app => {
  const { router, controller } = app;
  // 不能使用 prefix()，否则会改变已注册路由的路径
  router.post("/api/public/auth/login", controller.authSystem.auth.login);
  router.post("/api/public/auth/refresh", controller.authSystem.auth.refresh);
  router.post("/api/auth/logout", controller.authSystem.auth.logout);
  router.post("/api/auth/changePassword", controller.authSystem.auth.changePassword);
  router.get("/api/auth/getUserInfo", controller.authSystem.auth.getUserInfo);
};
