// 就绪后的额外初始化任务
const initAuth = require('./init-auth');
const logger = require('../app/utils/logger');

module.exports = async (app) => {
  try { await Promise.all([initAuth(app)]); }
  catch (err) { logger.error('其他初始化任务执行失败', err); return; }
};
