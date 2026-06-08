const Controller = require('egg').Controller;

class HealthController extends Controller {
  async index() {
    const { ctx } = this;

    return ctx.api.success({
      ready: this.app.initStatus.ready,
      tasks: this.app.initStatus.tasks,
      uptime: process.uptime(),
    });
  }
}

module.exports = HealthController;
