/** 通用 CRUD 封装 — 对应 egg-client 的 BaseRepository */
export class BaseRepository<T = any> {
  constructor(protected model: T) {}

  async create(data: any): Promise<any> {
    return (this.model as any).create({ data });
  }

  async createMany(data: any[]): Promise<any> {
    return (this.model as any).createMany({ data });
  }

  async findById(args: any): Promise<any> {
    return (this.model as any).findUnique(args);
  }

  async findOne(args: any): Promise<any> {
    return (this.model as any).findFirst(args);
  }

  async findMany(args?: any): Promise<any[]> {
    return (this.model as any).findMany(args);
  }

  async paginate(pageIndex = 1, pageSize = 10, args: any = {}) {
    const skip = (pageIndex - 1) * pageSize;
    const [list, total] = await Promise.all([
      (this.model as any).findMany({ ...args, skip, take: pageSize }),
      (this.model as any).count(args.where ? { where: args.where } : {}),
    ]);
    return { list, total, totalPages: Math.ceil(total / pageSize) };
  }

  async updateByFilter(args: any): Promise<any> {
    return (this.model as any).update(args);
  }

  async deleteByFilter(args: any): Promise<any> {
    return (this.model as any).delete(args);
  }

  async exists(where: any = {}): Promise<boolean> {
    const count = await (this.model as any).count({ where });
    return count > 0;
  }

  async count(where: any = {}): Promise<number> {
    return (this.model as any).count({ where });
  }
}
