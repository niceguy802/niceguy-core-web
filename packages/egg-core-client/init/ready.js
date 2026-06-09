const logger = require('../app/utils/logger');
// const initAuth = require('./init-auth');
// const { formatResult, runDbChecks } = require('./db_check');

module.exports = async app => {

    try {
        // await Promise.all([
        //     initAuth(app),
        // ])
    } catch (err) {
        logger.error('其他初始化任务执行失败', err);
        return;
    }
};
