// ── 数据库健康检查 ──────────────────────────────────────
// 提供：checkHealth —— 检查指定数据库是否正常工作

/**
 * 执行健康检查
 * @param {import('@prisma/client').PrismaClient} client
 * @param {Object} options
 * @param {string} options.name - 检查名称
 * @param {Function} [options.query] - 自定义查询函数，接收 prisma 实例，返回检查结果
 * @returns {Promise<{name:string, ok:boolean, duration:number, detail:*}>}
 */
async function checkHealth(client, options) {
  const { name, query } = options;
  const startedAt = Date.now();

  try {
    await client.$connect();
    const result = query
      ? await query(client)
      : await client.$queryRaw`SELECT 1 AS ok`;

    return {
      name,
      ok: true,
      duration: Date.now() - startedAt,
      detail: result,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      duration: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.$disconnect();
  }
}

/**
 * 格式化健康检查结果（用于终端输出）
 * @param {{name:string, ok:boolean, duration:number, detail:*}} result
 * @returns {string}
 */
function formatHealthResult(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  return `[${status}] ${result.name} (${result.duration}ms) ${result.detail}`;
}

/**
 * 批量检查多个数据库
 * @param {Array<{client:import('@prisma/client').PrismaClient, name:string, query?:Function}>} checks
 * @returns {Promise<{ok:boolean, results:Array}>}
 */
async function runHealthChecks(checks) {
  const results = await Promise.all(
    checks.map((c) => checkHealth(c.client, { name: c.name, query: c.query }))
  );
  const failed = results.filter((r) => !r.ok);

  return {
    ok: failed.length === 0,
    results,
  };
}

module.exports = {
  checkHealth,
  formatHealthResult,
  runHealthChecks,
};
