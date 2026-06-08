'use strict';

const { strict: assert } = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('test/unit/prisma-manager.test.js', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'));
  const PrismaManager = require('../../app/utils/prisma-manager');

  let app;

  beforeEach(() => {
    // Clean up generated files from previous runs
    [path.join(tmpDir, 'prisma.fx.config.ts'), path.join(tmpDir, 'prisma.business.config.ts'), path.join(tmpDir, 'prisma')].forEach(p => {
      try { fs.rmSync(p, { recursive: true, force: true }); } catch (_) {}
    });

    app = {
      baseDir: tmpDir,
      config: {
        Dbs: {
          fx: {
            type: 'mysql',
            user: 'root',
            password: '123456',
            host: '127.0.0.1',
            port: 3306,
            database: 'test_db',
          },
        },
      },
    };
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('isReady 在无 generated client 时应返回 false', () => {
    const pm = new PrismaManager(app);
    assert(pm.isReady() === false);
  });

  it('generateConfigs 应创建 prisma.{key}.config.ts', () => {
    const pm = new PrismaManager(app);
    pm.generateConfigs();
    const configPath = path.join(tmpDir, 'prisma.fx.config.ts');
    assert(fs.existsSync(configPath));
    const content = fs.readFileSync(configPath, 'utf-8');
    assert(content.includes('defineConfig'));
    assert(content.includes('prisma/fx/schema.prisma'));
    assert(content.includes('root:123456'));
  });

  it('generateConfigs 应支持多数据库', () => {
    app.config.Dbs = {
      fx: { type: 'mysql', user: 'u1', password: 'p1', host: 'h1', port: 3306, database: 'd1' },
      business: { type: 'mysql', user: 'u2', password: 'p2', host: 'h2', port: 3307, database: 'd2' },
    };
    const pm = new PrismaManager(app);
    pm.generateConfigs();
    assert(fs.existsSync(path.join(tmpDir, 'prisma.fx.config.ts')));
    assert(fs.existsSync(path.join(tmpDir, 'prisma.business.config.ts')));
  });

  it('ensureInitialSchemas 应创建包含 generator 块的 schema', () => {
    const pm = new PrismaManager(app);
    pm.generateConfigs();
    pm.ensureInitialSchemas();
    const schemaPath = path.join(tmpDir, 'prisma', 'fx', 'schema.prisma');
    assert(fs.existsSync(schemaPath));
    const content = fs.readFileSync(schemaPath, 'utf-8');
    assert(content.includes('generator client'));
    assert(content.includes('prisma-client-js'));
    assert(content.includes('../generated/fx'));
  });

  it('ensureInitialSchemas 不应覆盖已有 schema', () => {
    const pm = new PrismaManager(app);
    pm.generateConfigs();
    pm.ensureInitialSchemas();
    const schemaPath = path.join(tmpDir, 'prisma', 'fx', 'schema.prisma');
    fs.writeFileSync(schemaPath, 'CUSTOM CONTENT', 'utf-8');
    pm.ensureInitialSchemas();
    const content = fs.readFileSync(schemaPath, 'utf-8');
    assert.strictEqual(content, 'CUSTOM CONTENT');
  });
});