// jwt-token
const jwt = require("jsonwebtoken");
// const { ACCESS_SECRET } = require("../constants/crypt");
/**
 * 生成签名
 * @param {*} payload token payload
 * @param {String} SECRET 密钥
 * @param {Object} options 其他选项 如expiresIn: "1h" 代表1小时过期,如 '1h'（1小时）、'30m'（30分钟）、'2d'（2天）
 * @return {string} signed access token
 */
exports.createToken = (payload, SECRET, options = {}) => {
  return jwt.sign(payload, SECRET, { ...options });
};

/**
 * 验证是否与密钥匹配
 * @param {*} token access token
 * @param {String} SECRET 密钥
 * @return {Object|null}  { ...payload, exp }  解密后的payload 或 null
 */
exports.verifyToken = (token, SECRET) => {
  return jwt.verify(token, SECRET);
};
// 签名解密
// exports.
