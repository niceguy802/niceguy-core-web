const BaseRepository = require('../base-repository');

class UserRepository extends BaseRepository {
  constructor(ctx) { super(ctx.Dbs.fx.user_info); this.ctx = ctx; }

  async findOneUser({ userId, enName, password }) {
    const where = {};
    if (userId) where.id = userId;
    if (enName) where.en_name = enName;
    return await this.findOne({ where });
  }
}

module.exports = UserRepository;
