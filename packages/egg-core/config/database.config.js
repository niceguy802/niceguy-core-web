// 数据库配置文件
module.exports = {
    fx: { // 登录库
        type: 'mysql',// 数据库类型
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '123456',
        database: 'db_base',
        connectionLimit: 5,// 连接池大小 - 按worker
        poolTimeout: 30000,// 连接池超时时间 ms
        socketTimeout: 30000,// SQL执行超时时间
        connectTimeout: 30000,// 建立连接超时
    },
    business: { // 业务库
        type: 'mysql',// 数据库类型
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '123456',
        database: 'db_business',
        connectionLimit: 5,// 连接池大小 - 按worker
        poolTimeout: 30000,// 连接池超时时间 ms
        socketTimeout: 30000,// SQL执行超时时间
        connectTimeout: 30000,// 建立连接超时
    }
};