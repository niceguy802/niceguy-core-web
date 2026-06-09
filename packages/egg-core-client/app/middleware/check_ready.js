// 判断系统初始化是否完成
module.exports = () => {

  return async function checkReady(ctx, next) {
    console.log('checkReady');
    if (!ctx.app.initStatus.ready) {
      ctx.status = 503;
      ctx.api.fail('系统初始化中', 503, null);

      return;
    }

    await next();
  };
};
