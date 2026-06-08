'use strict';

const Service = require('egg').Service;
console.log('framework service loaded');
console.log(__filename);

class TestService extends Service {
  constructor(ctx) {
    super(ctx);
    this.config = this.app.config.test;
  }

  async get(id) {
    return { id, name: this.config.key };
  }
}

module.exports = TestService;
