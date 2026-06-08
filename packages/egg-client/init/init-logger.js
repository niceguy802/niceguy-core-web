// 挂载日志工具到 app 和 ctx
module.exports = async (app) => {
  const { createLogger, requestLogger, prismaLogger, appLogger } = require('../app/utils/logger');
  const loggingConfig = app.config.logging;

  // 根据实际配置创建带文件路径的 logger
  const appLoggerInstance = createLogger(loggingConfig.app);
  const requestLoggerInstance = createLogger(loggingConfig.request);
  const prismaLoggerInstance = createLogger({ level: loggingConfig.prisma.sqlLogLevel, filePath: loggingConfig.prisma.filePath, terminal: loggingConfig.prisma.sqlTerminal, pretty: loggingConfig.prisma.sqlTerminal });

  app.logger = appLoggerInstance;
  app.context.logger = appLoggerInstance;

  // 替换模块级 logger 的引用（确保文件写入生效）
  // 由于模块缓存，直接覆盖 exports 无效，通过挂载到 app 上供后续使用
  app.requestLogger = requestLoggerInstance;
  app.prismaLogger = prismaLoggerInstance;
};
