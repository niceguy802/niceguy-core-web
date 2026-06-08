// Windows 控制台编码修复：确保中文不乱码
if (process.platform === "win32") {
  try {
    require("child_process").execSync("chcp 65001", { stdio: "ignore" });
  } catch (_) {
    /* 忽略编码设置失败 */
  }
}

const init = require("./init");
const logger = require("./app/utils/logger");
const ready = require("./init/ready");

// 异常关闭：释放数据库 & Redis 连接后退出
async function gracefulShutdown(app, sig) {
  if (gracefulShutdown._running) return;
  gracefulShutdown._running = true;

  logger.warn(`收到 ${sig || "异常"} 信号，正在释放连接...`);

  // 关闭 Prisma 连接
  if (app.Dbs) {
    for (const db in app.Dbs) {
      if (!app.Dbs[db]) continue;
      try {
        await app.Dbs[db].$disconnect();
      } catch (_) {
        // 强制断开
      }
    }
    logger.info("[数据库]连接已释放");
  }

  // 关闭 Redis 连接
  if (app._redisClients) {
    for (const name in app._redisClients) {
      try {
        app._redisClients[name].disconnect();
      } catch (_) {
        // 强制断开
      }
    }
    logger.success("[Redis]连接已释放");
  }

  process.exit(1);
}

module.exports = (app) => {
  console.log(app.loader.options);
  console.log(23333333)
  console.log(
  app.loader.options.directory
);
  app.initStatus = {
    ready: false,
    tasks: {},
    startTime: Date.now(),
  };

  // 未捕获异常 — 记录并优雅关闭
  process.on("uncaughtException", (err) => {
    logger.error("未捕获异常", err);
    gracefulShutdown(app, "uncaughtException");
  });

  // 未处理的 Promise 拒绝 — 记录并优雅关闭
  process.on("unhandledRejection", (reason) => {
    logger.error("未处理Promise拒绝", reason);
    gracefulShutdown(app, "unhandledRejection");
  });

  app.beforeStart(async () => {
    logger.init("系统初始化开始...");
    try {
      await init(app);
      app.initStatus.ready = true;
      logger.success("系统初始化完成");
    } catch (err) {
      logger.error("系统初始化失败", err);
      await gracefulShutdown(app, "initFailed");
    }
  });

  // 其他初始化任务
  app.ready(async () => {
    try {
      const path = require('path');

const controllerPath = path.join(
  app.baseDir,
  'app/controller'
);

console.log(
  app.loader.loadFile(controllerPath)
);
      logger.info("其他初始化任务执行开始...");
      // await ready(app);
      
        console.log(Object.keys(app.controller));
        console.log(app.service);
console.log(typeof app.context.service);
      logger.success("其他初始化任务执行完成");
    } catch (err) {
      logger.error("其他初始化任务执行失败", err);
      await gracefulShutdown(app, "readyFailed");
    }
  });

  app.on("error", (err, ctx) => {
    logger.error("Unhandled app error", {
      url: ctx && ctx.url,
      method: ctx && ctx.method,
      body: ctx && ctx.request && ctx.request.body,
      err,
    });
  });
};
