// 数据库健康检查
const { initDatabases } = require('./index');

async function checkClient(name, prisma, query) {
  const startedAt = Date.now();
  try {
    await prisma.\();
    const result = await query(prisma);
    return { name, ok: true, duration: Date.now() - startedAt, detail: result };
  } catch (error) {
    return { name, ok: false, duration: Date.now() - startedAt, detail: error instanceof Error ? error.message : String(error) };
  } finally {
    await prisma.\();
  }
}

function formatResult(result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  return '[' + status + '] ' + result.name + ' (' + result.duration + 'ms) ' + result.detail;
}

async function runDbChecks(app) {
  const clients = initDatabases(app);
  const checks = [];
  for (const key in clients) {
    if (!clients[key]) continue;
    checks.push(
      checkClient(key + ':connect-and-query', clients[key], async (prisma) => {
        await prisma.\\SELECT 1 AS ok\;
        return 'connected';
      })
    );
  }
  const results = await Promise.all(checks);
  const failed = results.filter((r) => !r.ok);
  return { ok: failed.length === 0, results };
}

module.exports = { formatResult, runDbChecks };
