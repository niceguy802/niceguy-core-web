/**
 * 通用路由
 *
 * GET /              - 首页
 * GET /health        - 健康检查
 */
module.exports = app => {
  const { router, controller } = app;
  router.get("/", controller.home.index);
  router.get("/health", controller.common.health.index);
};
