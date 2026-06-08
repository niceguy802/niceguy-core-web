'use strict';
console.log('test controller loaded');

const Controller = require('egg').Controller;

class TestController extends Controller {
  async index() {
    this.ctx.body = 'ok';
  }
}

module.exports = TestController;