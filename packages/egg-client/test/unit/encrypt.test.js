'use strict';

const { strict: assert } = require('node:assert');
const { 
  encryptPassword, 
  comparePassword 
} = require('../../app/utils/encrypt');

describe('test/unit/encrypt.test.js', () => {
  it('encryptPassword 应该返回加密后的密码字符串', () => {
    const hash = encryptPassword('myPassword123');
    assert(typeof hash === 'string');
    assert(hash.length > 10);
    assert.notStrictEqual(hash, 'myPassword123');
  });

  it('comparePassword 应该正确验证密码', async () => {
    const password = 'testPass!@#';
    const hash = encryptPassword(password);
    const valid = await comparePassword(password, hash);
    assert(valid === true);
  });

  it('comparePassword 应该拒绝错误密码', async () => {
    const hash = encryptPassword('correctPassword');
    const valid = await comparePassword('wrongPassword', hash);
    assert(valid === false);
  });

  it('相同密码每次加密结果应不同（随机 salt）', () => {
    const hash1 = encryptPassword('samePassword');
    const hash2 = encryptPassword('samePassword');
    assert.notStrictEqual(hash1, hash2);
  });
});