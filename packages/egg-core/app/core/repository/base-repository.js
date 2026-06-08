// 通用的 CRUD 能力封装
// create
// createMany

// findById
// findOne
// findMany

// updateById
// deleteById

// pagination

// exists

// count

// transaction支持
/**
 * BaseRepository 是一个通用的 CRUD 能力封装类，提供了基本的数据库操作方法，如创建、查询、更新和删除等。它使用 Prisma 作为 ORM 工具，支持分页查询、事务处理等功能。通过继承 BaseRepository，可以快速构建针对特定数据模型的仓库类，简化数据库操作，提高开发效率。
 * @class BaseRepository
 * @constructor BaseRepository
 */
class BaseRepository {
    constructor(model) {
        this.model = model;
    }

    /**
     * 创建
     * @param {Object} data - 要创建的数据对象
     * @return {Promise<Object>} - 创建后的数据对象
     * @example
     * const user = await ctx.repository.auth('user_info').create({ name: 'Alice', email: ''});
     */
    async create(data) {
        return this.model.create({
            data,
        });
    }

    /**
     * 批量创建
     * @param {Array<Object>} data - 要创建的数据对象数组
     * @return {Object} - 包含创建结果的对象 {count:number 创建成功数量}
     */
    async createMany(data) {
        return this.model.createMany({
            data,
        });
    }

    /**
     * 根据ID查询
     * @param {number} id - 数据ID
     * @param {Object} select - 选择的字段对象，如 { id: true, name: true }
     * @returns {Promise<Object>} - 查询结果对象
     */
    async findById(args) {
        return this.model.findUnique(args);
    }

    /**
     * 查询单条
     * @param {Object} where - 查询条件
     * @param {Object} orderBy - 排序条件 { id: 'desc' }
     */
    async findOne(args) {
        return this.model.findFirst(args);
    }

    /**
     * 查询列表
     */
    async findMany(args) {
        return this.model.findMany(args)
    }

    /**
     * 分页查询
     */
    async paginate(pageIndex = 1, pageSize = 10, args = {}) {
        const skip = (pageIndex - 1) * pageSize;

        const [list, total] = await Promise.all([
            this.model.findMany({ ...args, skip, take: pageSize }),
            this.model.count(args.where ? { where: args.where } : {}),
        ]);
        return {
            list,
            total,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    /**
     * 更新
     * @param {Object} where - 更新条件 example { id: 1 }
     * @param {Object} data - 更新数据 example { name: 'Bob' }
     * @return {Promise<Object>} - 更新后的数据对象
     */
    async updateByFilter(args) {
        return this.model.update(args);
    }

    /**
     * 删除
     * @param {Object} where - 删除条件 example { id: 1 }
     * @return {Promise<Object>} - 删除后的数据对象
     */
    async deleteByFilter(args) {
        return this.model.delete(args);
    }

    /**
     * 是否存在
     * @param {Object} where - 查询条件 example { id: 1 }
     * @return {Promise<boolean>} - 是否存在
     */
    async exists(where = {}) {
        const count = await this.model.count({
            where,
        });

        return count > 0;
    }

    /**
     * 统计
     * @param {Object} where - 查询条件 example { id: 1 }
     * @return {Promise<number>} - 统计数量
     */
    async count(where = {}) {
        return this.model.count({
            where,
        });
    }
}

module.exports = BaseRepository;
