'use strict';

const { strict: assert } = require('node:assert');
const { buildDataBaseUrl } = require('../../app/utils/prisma');

describe('test/unit/prisma.test.js', () => {
  it('buildDataBaseUrl 应该正确构建 MySQL 连接 URL', () => {
    const url = buildDataBaseUrl({
      type: 'mysql',
      user: 'root',
      password: '123456',
      host: '127.0.0.1',
      port: 3306,
      database: 'test_db',
    });

    assert(url.startsWith('mysql://'));
    assert(url.includes('root:123456'));
    assert(url.includes('127.0.0.1:3306'));
    assert(url.includes('/test_db'));
    assert(url.includes('connect_limit=5'));
    assert(url.includes('socket_timeout=30000'));
    assert(url.includes('connect_timeout=30000'));
  });

  it('buildDataBaseUrl 应该支持自定义连接限制（pool 嵌套）', () => {
    const url = buildDataBaseUrl({
      type: 'mysql',
      user: 'admin',
      password: 'secret',
      host: '10.0.0.1',
      port: 3307,
      database: 'myapp',
      pool: {
        connectLimit: 10,
        socketTimeout: 60000,
      },
    });

    assert(url.includes('connect_limit=10'));
    assert(url.includes('socket_timeout=60000'));
  });

  it('buildDataBaseUrl 应该对不支持的数据库类型抛出错误', () => {
    assert.throws(() => {
      buildDataBaseUrl({
        type: 'postgresql',
        user: 'root',
        password: '123456',
        host: 'localhost',
        port: 5432,
        database: 'test',
      });
    }, /暂不支持/);
  });
});