class RedisManager {
    constructor(clients) {
        this.clients = clients;
    }
    // 获取指定名称的redis实例，默认使用auth
    // 使用示例 const client = app.redis.getClient('auth'); client.get('key'); // 原生能力
    // 或者 const client = app.redis.get('auth','key'); // 自定义封装
    getClient(name = 'auth') {
        const client = this.clients[name];
        if (!client) {
            throw new Error(`Redis client "${name}" not found`);
        }
        return client;
    }
    // 设置string类型数据，自动序列化对象，支持过期时间（秒）
    async set(clientName, key, value, expire = null) {
        const client = this.getClient(clientName);
        const data = typeof value === 'string' ? value : JSON.stringify(value);

        if (expire) {
            return await client.set(key, data, 'EX', expire);
        }
        return await client.set(key, data);
    }
    // 设置hash类型数据，自动序列化对象
    // 批量存储时推荐使用批量命令管道->redis.pipeline();完成后pipeline.exec()->hset()*n...->关闭pipeline，效率更高
    async hset(clientName, key, field, value) {
        const client = this.getClient(clientName);
        const data = typeof value === 'string' ? value : JSON.stringify(value);
        return await client.hset(key, field, data);
    }
    // 获取string类型数据，自动尝试解析JSON
    async get(clientName, key) {
        const client = this.getClient(clientName);
        const data = await client.get(key);
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }
    // 获取hash类型数据，自动尝试解析JSON
    async hget(clientName, key, field) {
        const client = this.getClient(clientName);
        const data = await client.hget(key, field);
        try {
            return JSON.parse(data);
        } catch {
            return data;
        }
    }
    // 获取所有hash类型数据，自动尝试解析JSON
    async hgetall(clientName, key, parse = false) {
        const client = this.getClient(clientName);
        const data = await client.hgetall(key);
        if (!parse) return data;
        const result = {};
        for (const field in data) {
            try {
                result[field] = JSON.parse(data[field]);
            } catch {
                result[field] = data[field];
            }
        }
        return result;
    }
    // 删除数据
    async del(clientName, key) {
        return await this.getClient(clientName).del(key);
    }
}

module.exports = RedisManager;
