// framework/modules/user/user.service.js

const Service =
  require('egg').Service;

class UserService extends Service {

  async list() {

    return [
      {
        id: 1,
        name: 'Tom',
      },
    ];
  }
}

module.exports = UserService;