/**
 * @param {Egg.Application} app - egg application
 */
'use strict';
module.exports = app => {
  const { router, controller } = app;
  
  app.router.prefix('/api');
    router.post("/public/auth/login", controller.authSystem.auth.login);
    // 刷新refresh
    router.post("/public/auth/refresh", controller.authSystem.auth.refresh);
    // 用户登出（需鉴权）
    router.post("/auth/logout", controller.authSystem.auth.logout);
    // 修改密码（需鉴权）
    router.post("/auth/changePassword", controller.authSystem.auth.changePassword);
    // 获取用户信息
    router.get("/auth/getUserInfo", controller.authSystem.auth.getUserInfo);

};
