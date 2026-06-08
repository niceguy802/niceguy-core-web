// 挂载日志工具
const logger = require("../app/utils/logger");

module.exports = async (app) => {
  app.logger = logger;
  app.context.logger = logger; // 将 logger 挂载到 ctx 上，供全局使用，如 ctx.logger.info(...)
};
