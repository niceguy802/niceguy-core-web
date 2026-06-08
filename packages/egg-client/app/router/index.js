"use strict";

/**
 * 框架内置路由：认证、健康检查
 */
module.exports = app => {
  for (const routeFile of ["./auth", "./common"]) {
    const register = require(routeFile);
    if (typeof register === "function") {
      register(app);
    }
  }
};
