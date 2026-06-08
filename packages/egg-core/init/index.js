const logger = require('../app/utils/logger');
const initDatabase = require('./init-database');
const initRedis = require('./init-redis');
const initLogger = require('./init-logger');
const RouteLoader = require('../lib/loader/route-loader');
// const { formatResult, runDbChecks } = require('./db_check');

module.exports = async app => {
  logger.info('系统初始化任务执行开始...');

  try {
    app.routeLoader = new RouteLoader(app);
    // 数据库初始化
    // Redis初始化
    await Promise.all([
      initLogger(app),
      initDatabase(app),
      initRedis(app),
      app.routeLoader.load()
    ]);
  } catch (err) {
    logger.error('系统初始化任务执行失败', err);
    return;
  }

  // const dbSummary = await runDbChecks();
  // app.initStatus.tasks.db = {
  //   ok: dbSummary.ok,
  //   checkedAt: new Date().toISOString(),
  //   results: dbSummary.results,
  // };

  // for (const result of dbSummary.results) {
  //   const line = formatResult(result);
  //   if (result.ok) {
  //     logger.success(line);
  //   } else {
  //     logger.error(line);
  //   }
  // }

  // if (!dbSummary.ok) {
  //   throw new Error('Database health check failed during init');
  // }

  logger.success('系统初始化任务执行完成...');
};
