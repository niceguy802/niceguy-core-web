// 加密 用户密码加密-不可逆哈希
const bcrypt = require("bcryptjs");

// 加密强度
const SALT_ROUNDS = 10;

/**
 * 密码加密
 * @param {string} password 明文密码
 * @return {string} 密文
 */
function encryptPassword(password) {
  if (isEncrypted(password)) {
    return password;
  }
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/**
 * 校验密码
 * @param {string} password 明文
 * @param {string} hash 密文
 * @return {boolean} 是否匹配
 */
function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * 判断是否已加密
 * @param {string} password 密码
 */
function isEncrypted(password) {
  return /^\$2[aby]\$\d{2}\$/.test(password);
}

module.exports = {
  encryptPassword,
  comparePassword,
  isEncrypted,
};
