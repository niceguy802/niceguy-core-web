/**
 * 构建 Prisma 数据库连接 URL
 *
 * @param {Object} options
 * @param {string} options.type - 数据库类型，如 "mysql"
 * @param {number} [options.connectLimit=5] - 连接数限制
 * @param {number} [options.socketTimeout=30000] - Socket 超时时间 (ms)
 * @param {number} [options.poolTimeout=30000] - 连接池超时 (ms)
 * @param {number} [options.connectTimeout=30000] - 连接超时 (ms)
 * @param {Object} [options.rest] - 额外配置
 * @returns {string} 数据库连接 URL
*/
function buildDataBaseUrl({ type, user, password, host, port, database, pool = {}, ...config }) {
  const { connectLimit = 5, socketTimeout = 30000, poolTimeout = 30000, connectTimeout = 30000, } = pool
  if (type === "mysql") {
    return `${type}://${user}:${password}@${host}:${port}/${database}?connect_limit=${connectLimit}&socket_timeout=${socketTimeout}&pool_timeout=${poolTimeout}&connect_timeout=${connectTimeout}`;
  }
  throw new Error(`暂不支持当前数据库类型：${type}`);
}

module.exports = { buildDataBaseUrl };
