const logger = require('../app/utils/logger');
const initDatabase = require('./init-database');
const initRedis = require('./init-redis');
const initLogger = require('./init-logger');

module.exports = async app => {
  logger.info('系统初始化任务执行开始..');

  try {
    await Promise.all([
      initLogger(app),
      initDatabase(app),
      initRedis(app),
    ]);
  } catch (err) {
    logger.error('系统初始化任务执行失败', err);
    return;
  }

  logger.success('系统初始化任务执行完成..');
};
