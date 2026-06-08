// 用户初始化（密码加密检查、挂载 RedisAuth 模型）
const { isEncrypted, encryptPassword } = require('../app/utils/encrypt');
const logger = require('../app/utils/logger');
const RedisAuth = require('../app/model/redis/redis-auth');

module.exports = async (app) => {
  try {
    const ctx = app.createAnonymousContext();

    // 挂载 modle 命名空间
    app.modle = { redis: {}, prisma: {} };
    app.modle.redis.redisAuth = new RedisAuth(app);

    // 检查并加密现有用户密码
    if (!ctx.service || !ctx.service.authSystem || !ctx.service.authSystem.auth) {
      logger.warn('警告：authSystem.auth service 未找到，跳过用户初始化');
      return;
    }

    const userList = await ctx.service.authSystem.auth.findMany();
    const user = userList.find((item) => item.en_name === 'admin');
    if (!user) return;

    if (!isEncrypted(user.pwd)) {
      const updateUser = [];
      for (const o of userList) {
        const pwd = await encryptPassword(o.pwd);
        updateUser.push({ id: o.id, pwd });
      }
      await ctx.service.authSystem.auth.updateUserMany(updateUser);
      logger.success('用户密码强加密');
    }
  } catch (err) {
    logger.error('用户初始化失败', err);
    throw err;
  }
};
