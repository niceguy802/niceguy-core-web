try { require('fs').appendFileSync('d:\\a-work-space\\code-learning\\egg-test\\debug-layer.txt', '1: app.js\n'); } catch (_) { }
// @niceguy/egg-client - Framework lifecycle entry
'use strict';

const init = require('./init');

module.exports = async (app) => {
  app.initStatus = { ready: false, tasks: {}, startTime: Date.now() };

  // initFramework - 鍙互琚?beforeStart 鎴栧閮ㄨ皟鐢?  app.initFramework = async () => {
  if (app._frameworkInitDone) return;
  app._frameworkInitDone = true;
  try {
    await init(app);
  } catch (e) {
    try { console.error('[app] initFramework error:', e && e.message); } catch (_) { }
  }
  app.initStatus.ready = true;
  app.beforeStart(async () => {
    await app.initFramework();
  });
};