// ── Prisma 日志系统 ─────────────────────────────────────────
// 提供：日志定义构建、事件日志挂载
// 所有日志输出受 loggingConfig 控制：terminal 控制终端输出，level 控制日志等级
// 默认不输出终端（terminal=false），默认等级 warn

const { createLogger } = require('../../app/utils/logger');

const prismaLevelRank = {
  query: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/**
 * 判断指定级别是否应启用
 * @param {string} level - query | info | warn | error
 * @param {Object} config - prisma 日志配置
 * @returns {boolean}
 */
function shouldEnablePrismaLevel(level, config) {
  const configuredRank = prismaLevelRank[config.level] || prismaLevelRank.warn;
  const currentRank = prismaLevelRank[level];
  return currentRank >= configuredRank;
}

/**
 * 构建 PrismaClient 的 log 定义数组
 * @param {Object} [config] - prisma 日志配置
 * @param {string} [config.level=warn] - 日志等级 info|warn|error
 * @param {boolean} [config.sqlTerminal] - 是否终端输出 SQL
 * @param {number} [config.slowQueryMs=20000] - 慢查询阈值，>=0 时启用 query 事件
 * @returns {Array<{level:string, emit:string}>}
 */
function buildPrismaLogDefinitions(config) {
  if (!config) return [];
  const log = [];

  for (const level of ['info', 'warn', 'error']) {
    if (shouldEnablePrismaLevel(level, config)) {
      log.push({ level, emit: 'event' });
    }
  }

  if (config.sqlTerminal || config.slowQueryMs >= 0) {
    log.push({ level: 'query', emit: 'event' });
  }

  return log;
}

// ── 内部：SQL 日志（文件），受 sqlLogLevel 和 sqlTerminal 控制 ──
function _logSQL(name, payload, config) {
  const logger = _sqlLogger(name, config);
  const level = config.sqlLogLevel || 'debug';
  if (typeof logger[level] === 'function') {
    logger[level]('' + 'Prisma SQL [' + name + ']', payload);
    return;
  }
  logger.debug('' + 'Prisma SQL [' + name + ']', payload);
}

const _sqlLoggerCache = {};
function _sqlLogger(name, config) {
  if (!_sqlLoggerCache[name]) {
    _sqlLoggerCache[name] = createLogger({
      level: config.sqlLogLevel || 'debug',
      filePath: config.filePath,
      terminal: config.sqlTerminal === true,
      pretty: config.sqlTerminal === true,
    });
  }
  return _sqlLoggerCache[name];
}

const _eventLoggerCache = {};
function _eventLogger(name, config) {
  if (!_eventLoggerCache[name]) {
    _eventLoggerCache[name] = createLogger({
      level: config.level || 'warn',
      filePath: config.filePath,
      terminal: config.terminal === true,
      pretty: config.terminal === true,
    });
  }
  return _eventLoggerCache[name];
}

/**
 * 为 PrismaClient 挂载事件日志监听
 * @param {string} name - 数据库名称
 * @param {import('@prisma/client').PrismaClient} prisma - PrismaClient 实例
 * @param {Object} config - prisma 日志配置
 * @param {string} [config.level=warn] - info|warn|error
 * @param {string} [config.sqlLogLevel=debug] - SQL 日志文件级别
 * @param {number} [config.slowQueryMs=20000] - 慢查询阈值（ms）
 * @param {boolean} [config.terminal=false] - 是否终端输出事件日志
 * @param {boolean} [config.sqlTerminal=false] - 是否终端输出 SQL
 * @param {string} [config.filePath] - 日志文件路径
 */
function setupLogging(name, prisma, config) {
  if (!name || !prisma || !config) return;

  const elog = _eventLogger(name, config);

  prisma.$on('query', (event) => {
    const payload = {
      component: 'prisma',
      database: name,
      query: event.query,
      params: event.params,
      duration: event.duration,
    };

    // SQL 日志：始终写入文件，终端输出由 config.sqlTerminal 控制
    _logSQL(name, payload, config);

    // 慢查询日志
    if (event.duration > config.slowQueryMs) {
      elog.warn('' + 'Prisma Slow Query [' + name + '] (' + event.duration + 'ms)', payload);
    }
  });

  prisma.$on('info', (event) => {
    elog.info('' + 'Prisma Info [' + name + ']', {
      component: 'prisma',
      database: name,
      target: event.target,
      message: event.message,
    });
  });

  prisma.$on('warn', (event) => {
    elog.warn('' + 'Prisma Warn [' + name + ']', {
      component: 'prisma',
      database: name,
      target: event.target,
      message: event.message,
    });
  });

  prisma.$on('error', (event) => {
    elog.error('' + 'Prisma Error [' + name + ']', {
      component: 'prisma',
      database: name,
      target: event.target,
      message: event.message,
    });
  });
}

module.exports = {
  buildPrismaLogDefinitions,
  setupLogging,
};
