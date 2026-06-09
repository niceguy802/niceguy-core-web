'use strict';

// ── Prisma 模块入口 ──────────────────────────────────────
// 统一导出所有 Prisma 相关能力

const { createPrismaClient, createPrismaClientFromPath } = require('./client-factory');
const { connect, disconnect, registerLifecycle } = require('./lifecycle');
const { checkHealth, formatHealthResult, runHealthChecks } = require('./health-check');
const { executeTransaction } = require('./transaction');
const { buildPrismaLogDefinitions, setupLogging } = require('./logging');
const { call } = require('./unified-call');
const { createDbProxy } = require('./db-proxy');
const { createDbManager } = require('./db-manager');

module.exports = {
  // 客户端创建
  createPrismaClient,
  createPrismaClientFromPath,

  // 生命周期
  connect,
  disconnect,
  registerLifecycle,

  // 健康检查
  checkHealth,
  formatHealthResult,
  runHealthChecks,

  // 事务
  executeTransaction,

  // 日志
  buildPrismaLogDefinitions,
  setupLogging,

  // 统一调用
  call,

  // 多库管理（核心新增）
  createDbManager,
  createDbProxy,
};
