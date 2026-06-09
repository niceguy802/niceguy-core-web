const loggingConfig = {
  console: {
    level: process.env.CONSOLE_LOG_LEVEL || "info", // 控制台日志级别
    pretty: true, // 始终美化终端输出
  },
  request: {
    level: process.env.REQUEST_LOG_LEVEL || "warn", // 日志级别 (info, warn, error)
    terminal: process.env.REQUEST_LOG_TERMINAL === "true", // 是否终端输出
    filePath: process.env.REQUEST_LOG_FILE_PATH || "./logs/request", // 日志文件路径
  },
  app: {
    level: process.env.APP_LOG_LEVEL || "warn", // 日志级别 (info, warn, error)
    pretty: true,//process.env.APP_LOG_PRETTY !== "false", // 是否美化输出
    terminal: process.env.APP_LOG_TERMINAL === "true", // 是否终端输出
    filePath: process.env.APP_LOG_FILE_PATH || "./logs/app", // 日志文件路径
  },
  prisma: {
    level: process.env.PRISMA_LOG_LEVEL || "warn", // 日志级别 (info, warn, error)
    sqlTerminal: true, // process.env.PRISMA_SQL_TERMINAL !== "false", // 是否终端输出日志
    sqlLogLevel: process.env.PRISMA_SQL_LOG_LEVEL || "debug", // 日志级别 (info, warn, error)
    slowQueryMs: Number(process.env.PRISMA_SLOW_QUERY_MS || 20000), // 慢查询阈值
    filePath: process.env.PRISMA_LOG_FILE_PATH || "./logs/prisma", // 日志文件路径
  },
};

module.exports = { loggingConfig };
