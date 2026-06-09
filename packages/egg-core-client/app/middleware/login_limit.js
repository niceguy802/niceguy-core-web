// 登录限制中间件
module.exports = () => {
  return async (ctx, next) => {
    await next();
  };
};
