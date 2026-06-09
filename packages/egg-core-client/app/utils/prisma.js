function buildDataBaseUrl({
  type,
  connectLimit = 5,
  socketTimeout = 30000,
  poolTimeout = 30000,
  connectTimeout = 30000,
  ...config
}) {
  if (type === "mysql") {
    return `${type}://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}?connect_limit=${connectLimit}&socket_timeout=${socketTimeout}&pool_timeout=${poolTimeout}&connect_timeout=${connectTimeout}`;
  } else {
    throw new Error(`暂未支持当前数据库类型：${type}`);
  }
}

module.exports = {
  buildDataBaseUrl,
};
