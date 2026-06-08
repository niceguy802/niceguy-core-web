"use strict";

/**
 * @niceguy/egg-client - 框架内置路由
 * 设置 /api 前缀，加载认证、健康检查等内置路由
 * 业务项目可在自己的 app/router.js 中添加额外路由
 */
module.exports = app => {
  app.router.prefix("/api");
  require("./router/index")(app);
};
