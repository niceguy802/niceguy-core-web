'use strict';
// Windows 控制台编码修复：确保中文不乱码
if (process.platform === "win32") {
  try {
    require("child_process").execSync("chcp 65001", { stdio: "ignore" });
  } catch (_) {
    /* 忽略编码设置失败 */
  }
}
const path = require('path');
const is = require('is-type-of');
const init = require('./init');
const logger = require('./app/utils/logger');
const utility = require('utility');

async function gracefulShutdown(app, sig) {
  if (gracefulShutdown._running) return;
  gracefulShutdown._running = true;

  logger.warn('收到 ' + (sig || '异常') + ' 信号，正在释放连接..');

  if (app.Dbs) {
    for (const db in app.Dbs) {
      if (!app.Dbs[db]) continue;
      try { await app.Dbs[db].$disconnect(); } catch (_) {}
    }
    logger.info('[数据库]连接已释放');
  }

  if (app._redisClients) {
    for (const name in app._redisClients) {
      try { app._redisClients[name].disconnect(); } catch (_) {}
    }
    logger.success('[Redis]连接已释放');
  }

  process.exit(1);
}

/**
 * 加载框架自身的 controller 到 app.controller（egg-core 只加载 app 的）
 */
function loadFrameworkControllers(app) {
  const frameworkControllerDir = path.join(__dirname, 'app/controller');
  const FileLoader = app.loader.FileLoader;

  function wrapClass(Controller) {
    let proto = Controller.prototype;
    const ret = {};
    while (proto !== Object.prototype) {
      const keys = Object.getOwnPropertyNames(proto);
      for (const key of keys) {
        if (key === 'constructor') continue;
        const d = Object.getOwnPropertyDescriptor(proto, key);
        if (is.function(d.value) && !ret.hasOwnProperty(key)) {
          ret[key] = (async function classControllerMiddleware(...args) {
            const controller = new Controller(this);
            args = [ this ];
            return await controller[key](...args);
          });
        }
      }
      proto = Object.getPrototypeOf(proto);
    }
    return ret;
  }

  function wrapObject(obj, objPath, prefix) {
    const keys = Object.keys(obj);
    const ret = {};
    for (const key of keys) {
      if (is.function(obj[key])) {
        ret[key] = (async function objectControllerMiddleware(...args) {
          args = [ this ];
          return await obj[key](...args);
        });
      } else if (is.object(obj[key])) {
        ret[key] = wrapObject(obj[key], objPath, (prefix || '') + key + '.');
      }
    }
    return ret;
  }

  new FileLoader({
    directory: frameworkControllerDir,
    target: app.controller,
    inject: app,
    initializer: function(obj, opt) {
      if (is.function(obj) && !is.generatorFunction(obj) && !is.class(obj) && !is.asyncFunction(obj)) {
        obj = obj(app);
      }
      if (is.class(obj)) {
        obj.prototype.pathName = opt.pathName;
        obj.prototype.fullPath = opt.path;
        return wrapClass(obj);
      }
      if (is.object(obj)) {
        return wrapObject(obj, opt.path);
      }
      if (is.generatorFunction(obj) || is.asyncFunction(obj)) {
        return wrapObject({ 'module.exports': obj }, opt.path)['module.exports'];
      }
      return obj;
    },
  }).load();
}

module.exports = (app) => {
  app.initStatus = {
    ready: false,
    tasks: {},
    startTime: Date.now(),
  };

  process.on('uncaughtException', (err) => {
    logger.error('未捕获异常', err);
    gracefulShutdown(app, 'uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('未处理Promise拒绝', reason);
    gracefulShutdown(app, 'unhandledRejection');
  });

  app.beforeStart(async () => {
    loadFrameworkControllers(app);

    const frameworkRouter = require('./app/router');
    if (typeof frameworkRouter === 'function') {
      frameworkRouter(app);
    }

    logger.init('系统初始化开始..');
    try {
      await init(app);
      app.initStatus.ready = true;
      logger.success('系统初始化完成');
    } catch (err) {
      logger.error('系统初始化失败', err);
      await gracefulShutdown(app, 'initFailed');
    }
  });

  app.on('error', (err, ctx) => {
    logger.error('Unhandled app error', {
      url: ctx && ctx.url,
      method: ctx && ctx.method,
      body: ctx && ctx.request && ctx.request.body,
      err,
    });
  });
};
