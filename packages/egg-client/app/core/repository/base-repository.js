// 通用 CRUD 封装
class BaseRepository {
  constructor(model) { this.model = model; }

  async create(data) { return this.model.create({ data }); }
  async createMany(data) { return this.model.createMany({ data }); }
  async findById(args) { return this.model.findUnique(args); }
  async findOne(args) { return this.model.findFirst(args); }
  async findMany(args) { return this.model.findMany(args); }

  async paginate(pageIndex = 1, pageSize = 10, args = {}) {
    const skip = (pageIndex - 1) * pageSize;
    const [list, total] = await Promise.all([
      this.model.findMany({ ...args, skip, take: pageSize }),
      this.model.count(args.where ? { where: args.where } : {}),
    ]);
    return { list, total, totalPages: Math.ceil(total / pageSize) };
  }

  async updateByFilter(args) { return this.model.update(args); }
  async deleteByFilter(args) { return this.model.delete(args); }
  async exists(where = {}) { const count = await this.model.count({ where }); return count > 0; }
  async count(where = {}) { return this.model.count({ where }); }
}

module.exports = BaseRepository;
