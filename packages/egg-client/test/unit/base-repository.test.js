'use strict';

const { strict: assert } = require('node:assert');
const BaseRepository = require('../../app/core/repository/base-repository');

describe('test/unit/base-repository.test.js', () => {
  describe('paginate', () => {
    const mockModel = {
      findMany: async (args) => {
        if (args.skip === 0) return [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
        if (args.skip === 5) return [{ id: 6 }];
        return [];
      },
      count: async (where) => 6,
    };

    const repo = new BaseRepository(mockModel);

    it('第 1 页应该有 5 条记录', async () => {
      const result = await repo.paginate(1, 5);
      assert(result.list.length === 5);
      assert(result.total === 6);
      assert(result.totalPages === 2);
    });

    it('第 2 页应该有 1 条记录', async () => {
      const result = await repo.paginate(2, 5);
      assert(result.list.length === 1);
      assert(result.total === 6);
      assert(result.totalPages === 2);
    });
  });

  describe('exists', () => {
    it('should return true when count > 0', async () => {
      const mockModel = { count: async () => 1 };
      const repo = new BaseRepository(mockModel);
      const result = await repo.exists({ id: 1 });
      assert(result === true);
    });

    it('should return false when count === 0', async () => {
      const mockModel = { count: async () => 0 };
      const repo = new BaseRepository(mockModel);
      const result = await repo.exists({ id: 999 });
      assert(result === false);
    });
  });

  describe('create / findOne / findMany', () => {
    it('create 应该委托给 model.create', async () => {
      const mockModel = { create: async (args) => args.data };
      const repo = new BaseRepository(mockModel);
      const data = { en_name: 'test', pwd: 'hashed' };
      const result = await repo.create(data);
      assert(result.en_name === 'test');
    });

    it('findOne 应该委托给 model.findFirst', async () => {
      const mockModel = { findFirst: async (args) => args.where };
      const repo = new BaseRepository(mockModel);
      const result = await repo.findOne({ where: { id: 1 } });
      assert(result.id === 1);
    });
  });
});