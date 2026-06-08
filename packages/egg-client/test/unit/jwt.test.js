'use strict';

const { strict: assert } = require('node:assert');
const { createToken, verifyToken } = require('../../app/utils/jwt');
const { ACCESS_SECRET, TOKEN_EXPIRES_IN } = require('../../app/constants/crypt');

describe('test/unit/jwt.test.js', () => {
  const payload = { uid: 1, type: 'access' };

  it('createToken 应该生成有效的 JWT 字符串', () => {
    const token = createToken(payload, ACCESS_SECRET, { expiresIn: '1h' });
    assert(typeof token === 'string');
    assert(token.split('.').length === 3); // header.payload.signature
  });

  it('verifyToken 应该正确解析有效 Token', () => {
    const token = createToken(payload, ACCESS_SECRET, { expiresIn: '1h' });
    const decoded = verifyToken(token, ACCESS_SECRET);
    assert(decoded.uid === 1);
    assert(decoded.type === 'access');
  });

  it('verifyToken 应该拒绝无效签名', () => {
    const token = createToken(payload, 'wrong-secret', { expiresIn: '1h' });
    assert.throws(() => {
      verifyToken(token, ACCESS_SECRET);
    });
  });
});