const { loggingConfig } = require("../../../config/logging");
const { createLogger } = require("../../utils/logger");

const prismaLevelRank = {
  query: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldEnablePrismaLevel(level) {
  const configuredRank =
    prismaLevelRank[loggingConfig.prisma.level] || prismaLevelRank.warn;
  const currentRank = prismaLevelRank[level];
  return currentRank >= configuredRank;
}

function buildPrismaLogDefinitions() {
  const log = [];

  for (const level of ["info", "warn", "error"]) {
    if (shouldEnablePrismaLevel(level)) {
      log.push({ level, emit: "event" });
    }
  }

  if (
    loggingConfig.prisma.sqlTerminal ||
    loggingConfig.prisma.slowQueryMs >= 0
  ) {
    log.push({ level: "query", emit: "event" });
  }

  return log;
}

function logSQL(name, payload) {
  const level = loggingConfig.prisma.sqlLogLevel;
  const logger = sqlLogger(name);

  if (typeof logger[level] === "function") {
    logger[level](`Prisma SQL [${name}]`, payload);
    return;
  }
  logger.debug(`Prisma SQL [${name}]`, payload);
}

function sqlLogger(name) {
  if (!sqlLogger._cache) sqlLogger._cache = {};
  if (!sqlLogger._cache[name]) {
    sqlLogger._cache[name] = createLogger({
      level: loggingConfig.prisma.sqlLogLevel,
      filePath: loggingConfig.prisma.filePath,
      terminal: loggingConfig.prisma.sqlTerminal,
      pretty: loggingConfig.prisma.sqlTerminal,
    });
  }
  return sqlLogger._cache[name];
}

function prismaEventLogger(name) {
  if (!prismaEventLogger._cache) prismaEventLogger._cache = {};
  if (!prismaEventLogger._cache[name]) {
    prismaEventLogger._cache[name] = createLogger({
      level: loggingConfig.prisma.level || "info",
      filePath: loggingConfig.prisma.filePath,
      terminal: loggingConfig.prisma.sqlTerminal,
      pretty: loggingConfig.prisma.sqlTerminal,
    });
  }
  return prismaEventLogger._cache[name];
}

function setupPrismaLogging(name, prisma) {
  const elog = prismaEventLogger(name);

  prisma.$on("query", (event) => {
    const payload = {
      component: "prisma",
      database: name,
      query: event.query,
      params: event.params,
      duration: event.duration,
    };

    // 始终记录 SQL 到文件；终端输出由 config.prisma.sqlTerminal 控制
    logSQL(name, payload);

    if (event.duration > loggingConfig.prisma.slowQueryMs) {
      elog.warn(`Prisma Slow Query [${name}]`, payload);
    }
  });

  prisma.$on("info", (event) => {
    elog.info(`Prisma Info [${name}]`, {
      component: "prisma",
      database: name,
      target: event.target,
      message: event.message,
    });
  });

  prisma.$on("warn", (event) => {
    elog.warn(`Prisma Warn [${name}]`, {
      component: "prisma",
      database: name,
      target: event.target,
      message: event.message,
    });
  });

  prisma.$on("error", (event) => {
    elog.error(`Prisma Error [${name}]`, {
      component: "prisma",
      database: name,
      target: event.target,
      message: event.message,
    });
  });
}

module.exports = {
  buildPrismaLogDefinitions,
  setupPrismaLogging,
};
