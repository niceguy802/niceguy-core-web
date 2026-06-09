const baseRepository = require('../base-repository');
class UserRepository extends baseRepository {
    constructor(ctx) {
        super(ctx.db.authDb.user_info);
        this.ctx = ctx;
    }
    /**
     * 查询用户
     * @param {Object} params
     * @param {Number} params.userId 用户id
     * @param {String} params.enName 用户登录账号
     */
    async findOneUser({ userId, enName, password }) {
        const user = {}
        if (userId) user.id = userId;
        if (enName) user.en_name = enName;
        if (password && enName) {
            user.password = password
            user.en_name = enName;
        }
        return await this.findOne({ ...user })
    }
}