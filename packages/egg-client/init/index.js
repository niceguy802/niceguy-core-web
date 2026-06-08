try { require('fs').appendFileSync('d:\\a-work-space\\code-learning\\egg-test\\debug-layer.txt', '2: init/index.js\n'); } catch(_) {}
const logger = require('../app/utils/logger');
const initDatabase = require('./init-database');
const initRedis = require('./init-redis');
const initLogger = require('./init-logger');
const initAuth = require('./init-auth');

module.exports = async (app) => {
  const log = (msg) => {
    try { app.logger && app.logger.info('[init] ' + msg); } catch (_) {}
    try { console.error('[INIT] ' + msg); } catch (_) {}
  };

  log('start');

  // Step 1: Init infra (logger, db, redis)
  try {
    await Promise.all([initLogger(app), initDatabase(app), initRedis(app)]);
  } catch (e) {
    log('step 1 failed: ' + (e && e.message));
  }

  // Step 2: Auth (may fail without DB/Redis - that's ok)
  try {
    await Promise.all([initAuth(app)]);
  } catch (e) {
    log('step 2 (auth) skipped: ' + (e && e.message));
  }

  // Step 3: Register routes - ALWAYS runs, regardless of init failures
  log('register routes');
  try {
    app.router.prefix('/api');
    require('../app/router')(app);
  } catch (e) {
    log('route registration failed: ' + (e && e.message));
  }

  log('done');
};