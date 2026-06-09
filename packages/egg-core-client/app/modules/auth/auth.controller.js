// framework/modules/user/user.controller.js

const Controller = require('egg').Controller;

class UserController extends Controller {

  async getList() {

    const data = await this.service.user.list();

    this.ctx.body = data;
  }
}

module.exports = UserController;