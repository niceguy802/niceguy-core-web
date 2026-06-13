const { createDbManager } = require('@niceguy/egg-core-client/lib/prisma');
module.exports = async (app) => {
  app.db = createDbManager();
  // 自动注入
  app.db.registerFromConfig(app);
};