class RedisManager {
  constructor(clients) { this.clients = clients; }

  getClient(name = 'fx') {
    const client = this.clients[name];
    if (!client) throw new Error('Redis client "' + name + '" not found');
    return client;
  }

  async set(clientName, key, value, expire = null) {
    const client = this.getClient(clientName);
    const data = typeof value === 'string' ? value : JSON.stringify(value);
    return expire ? await client.set(key, data, 'EX', expire) : await client.set(key, data);
  }

  async hset(clientName, key, field, value) {
    const client = this.getClient(clientName);
    const data = typeof value === 'string' ? value : JSON.stringify(value);
    return await client.hset(key, field, data);
  }

  async get(clientName, key) {
    const client = this.getClient(clientName);
    const data = await client.get(key);
    try { return JSON.parse(data); } catch { return data; }
  }

  async hget(clientName, key, field) {
    const client = this.getClient(clientName);
    const data = await client.hget(key, field);
    try { return JSON.parse(data); } catch { return data; }
  }

  async hgetall(clientName, key, parse = false) {
    const client = this.getClient(clientName);
    const data = await client.hgetall(key);
    if (!parse) return data;
    const result = {};
    for (const field in data) { try { result[field] = JSON.parse(data[field]); } catch { result[field] = data[field]; } }
    return result;
  }

  async del(clientName, key) { return await this.getClient(clientName).del(key); }
}

module.exports = RedisManager;
