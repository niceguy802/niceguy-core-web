// ── PrismaClient 工厂 ─────────────────────────────────────
// 提供：创建 PrismaClient 实例
// 业务层只需传入 PrismaClient 类和数据库配置即可创建实例

const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { buildDataBaseUrl } = require('../../app/utils/prisma');
const { buildPrismaLogDefinitions } = require('./logging');

/**
 * PrismaClient 工厂
 * @param {Object} options
 * @param {Function} options.PrismaClient - 由 prisma generate 生成的 PrismaClient 类
 * @param {Object} [options.datasourceConfig] - 数据库连接配置（host, port, user, password, database, type 等）
 * @param {string} [options.datasourceUrl] - 直接指定连接 URL（优先级高于 datasourceConfig）
 * @param {Object} [options.adapter] - 自定义 adapter（覆盖自动创建的 PrismaMariaDb）
 * @param {Object} [options.loggingConfig] - Prisma 日志配置，见 logging.js 中的 setupLogging
 * @param {Array} [options.logDefinitions] - 自定义 Prisma log 定义（覆盖自动构建）
 * @returns {InstanceType<PrismaClient>}
 */
function createPrismaClient(options) {
  const {
    PrismaClient,
    datasourceConfig,
    datasourceUrl,
    adapter: customAdapter,
    loggingConfig,
    logDefinitions: customLogDefinitions,
  } = options;

  if (!PrismaClient) {
    throw new Error('[createPrismaClient] PrismaClient class is required');
  }

  // 构建 log 定义
  const log = customLogDefinitions || buildPrismaLogDefinitions(loggingConfig);

  // 构建 client 选项
  const clientOptions = { log };

  if (customAdapter) {
    // 使用用户传入的自定义 adapter
    clientOptions.adapter = customAdapter;
    if (datasourceUrl) {
      clientOptions.datasourceUrl = datasourceUrl;
    } else if (datasourceConfig) {
      clientOptions.datasourceUrl = datasourceConfig.url || buildDataBaseUrl(datasourceConfig);
    }
  } else if (datasourceConfig) {
    // 自动创建 adapter
    clientOptions.datasourceUrl = datasourceUrl || datasourceConfig.url || buildDataBaseUrl(datasourceConfig);
    clientOptions.adapter = new PrismaMariaDb(datasourceConfig);
  }

  return new PrismaClient(clientOptions);
}

/**
 * 从生成的 Prisma 模块路径加载并创建 PrismaClient
 * @param {Object} options
 * @param {string} options.prismaModulePath - prisma generate 产出的模块路径
 * @param {Object*} [options.rest] - 其余参数同 createPrismaClient
 * @returns {InstanceType<PrismaClient>}
 */
function createPrismaClientFromPath(options) {
  const { prismaModulePath, ...rest } = options;
  if (!prismaModulePath) {
    throw new Error('[createPrismaClientFromPath] prismaModulePath is required');
  }
  const mod = require(prismaModulePath);
  return createPrismaClient({ ...rest, PrismaClient: mod.PrismaClient });
}

module.exports = {
  createPrismaClient,
  createPrismaClientFromPath,
};
