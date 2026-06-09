'use strict';
module.exports = app => {
  const { router, controller } = app;
  router.prefix("/api");
  router.post("/public/auth/login", controller.authSystem.auth.login);
  router.post("/public/auth/refresh", controller.authSystem.auth.refresh);
  router.post("/auth/logout", controller.authSystem.auth.logout);
  router.post("/auth/changePassword", controller.authSystem.auth.changePassword);
  router.get("/auth/getUserInfo", controller.authSystem.auth.getUserInfo);
};
