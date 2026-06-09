// 数据库健康状态检查
// const db = require('../app/core/database');
const { clients } = require('../database');

async function checkClient(name, prisma, query) {
    const startedAt = Date.now();

    try {
        await prisma.$connect();
        const result = await query(prisma);
        const duration = Date.now() - startedAt;

        return {
            name,
            ok: true,
            duration,
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
        await prisma.$disconnect();
    }
}

function formatResult(result) {
    const status = result.ok ? 'PASS' : 'FAIL';
    return `[${status}] ${result.name} (${result.duration}ms) ${result.detail}`;
}

async function runDbChecks() {
    const checks = [];
    for (let key in clients) {
        checks.push(
            checkClient(`${key}:connect-and-query`, clients[key], async prisma => {
                await prisma.$queryRaw`SELECT 1 AS ok`;
                const count = await prisma[key === 'fx' ? 'user_info' : 'cd_user'].count();
                return `user_info.count=${count}`;
            })
        )
    }

    const results = await Promise.all(checks);
    const failed = results.filter(result => !result.ok);

    return {
        ok: failed.length === 0,
        results,
    };
}

module.exports = {
    formatResult,
    runDbChecks,
};
