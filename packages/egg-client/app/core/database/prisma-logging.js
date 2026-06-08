// Prisma 日志定义 & 事件监听
const path = require('path');
const { createLogger } = require('../../utils/logger');

const prismaLevelRank = { query: 10, info: 20, warn: 30, error: 40 };

function shouldEnablePrismaLevel(level, config) {
  const configuredRank = prismaLevelRank[config.prisma.level] || prismaLevelRank.warn;
  const currentRank = prismaLevelRank[level];
  return currentRank >= configuredRank;
}

function buildPrismaLogDefinitions(config) {
  const log = [];
  for (const level of ['info', 'warn', 'error']) {
    if (shouldEnablePrismaLevel(level, config)) log.push({ level, emit: 'event' });
  }
  if (config.prisma.sqlTerminal || config.prisma.slowQueryMs >= 0) {
    log.push({ level: 'query', emit: 'event' });
  }
  return log;
}

function setupPrismaLogging(name, prisma, config) {
  const elog = createLogger({ level: config.prisma.level || 'info', filePath: config.prisma.filePath, terminal: config.prisma.sqlTerminal, pretty: config.prisma.sqlTerminal });
  const slog = createLogger({ level: config.prisma.sqlLogLevel, filePath: config.prisma.filePath, terminal: config.prisma.sqlTerminal, pretty: config.prisma.sqlTerminal });

  prisma.$on('query', (event) => {
    const payload = { component: 'prisma', database: name, query: event.query, params: event.params, duration: event.duration };
    if (typeof slog.debug === 'function') slog.debug('Prisma SQL [' + name + ']', payload);
    if (event.duration > config.prisma.slowQueryMs) elog.warn('Prisma Slow Query [' + name + ']', payload);
  });
  prisma.$on('info', (event) => elog.info('Prisma Info [' + name + ']', { component: 'prisma', database: name, target: event.target, message: event.message }));
  prisma.$on('warn', (event) => elog.warn('Prisma Warn [' + name + ']', { component: 'prisma', database: name, target: event.target, message: event.message }));
  prisma.$on('error', (event) => elog.error('Prisma Error [' + name + ']', { component: 'prisma', database: name, target: event.target, message: event.message }));
}

module.exports = { buildPrismaLogDefinitions, setupPrismaLogging };
