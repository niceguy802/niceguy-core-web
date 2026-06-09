'use strict';
const fs = require('fs');
const path = require('path');
// const { AppWorkerLoader } = require('egg-core');
console.log(require('egg-core'))
const { AppWorkerLoader } = require('egg');
class FrameworkLoader extends AppWorkerLoader {

  load() {

    super.load();

    this.loadFrameworkController();

    this.loadFrameworkRouter();
  }

  loadFrameworkController() {
    console.log(this.options.baseDir)
    console.log(this.options)
    console.log(this.app.baseDir)
    const controllerDir = path.join(
      __dirname,
      'app/controller'
    );

    if (!fs.existsSync(controllerDir)) {
      return;
    }

    this.loadToApp(
      controllerDir,
      'controller'
    );
  }

  loadFrameworkRouter() {

    const routerFile = path.join(
      __dirname,
      'app/router.js'
    );

    if (!fs.existsSync(routerFile)) {
      return;
    }

    require(routerFile)(this.app);
  }
}

module.exports = FrameworkLoader;