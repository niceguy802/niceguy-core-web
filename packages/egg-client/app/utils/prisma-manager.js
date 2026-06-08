const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { buildDataBaseUrl } = require('./prisma');
const logger = require('./logger');

const CONFIG_TPL = (key, url) => `import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/${key}/schema.prisma",
  datasource: { url: "${url}" },
});
`;

const INITIAL_SCHEMA = (key) => `generator client {
  provider = "prisma-client-js"
  output   = "../generated/${key}"
}

datasource db {
  provider = "mysql"
}
`;

class PrismaManager {
  constructor(app) {
    this.app = app;
    this.baseDir = app.baseDir;
    this.dbConfig = app.config.Dbs || {};
  }

  isReady() {
    for (const key in this.dbConfig) {
      if (!this.dbConfig[key]) continue;
      try {
        const mod = require(path.join(this.baseDir, 'prisma', 'generated', key));
        if (!mod.PrismaClient) return false;
      } catch (_) {
        return false;
      }
    }
    return true;
  }

  generateConfigs() {
    for (const key in this.dbConfig) {
      if (!this.dbConfig[key]) continue;
      const url = buildDataBaseUrl(this.dbConfig[key]);
      fs.writeFileSync(
        path.join(this.baseDir, 'prisma.' + key + '.config.ts'),
        CONFIG_TPL(key, url),
        'utf-8'
      );
    }
  }

  ensureInitialSchemas() {
    for (const key in this.dbConfig) {
      if (!this.dbConfig[key]) continue;
      const schemaDir = path.join(this.baseDir, 'prisma', key);
      fs.mkdirSync(schemaDir, { recursive: true });
      const schemaPath = path.join(schemaDir, 'schema.prisma');
      if (!fs.existsSync(schemaPath)) {
        fs.writeFileSync(schemaPath, INITIAL_SCHEMA(key), 'utf-8');
      }
    }
  }

  pullSchemas() {
    for (const key in this.dbConfig) {
      if (!this.dbConfig[key]) continue;
      const cfg = path.join(this.baseDir, 'prisma.' + key + '.config.ts');
      if (!fs.existsSync(cfg)) continue;
      try {
        execSync('npx prisma db pull --config "' + cfg + '"', {
          cwd: this.baseDir,
          stdio: 'pipe',
          timeout: 30000,
        });
      } catch (e) {
        // db pull may fail (no database, connection refused, etc.)
        // this should not crash the app
      }
    }
  }

  generateClients() {
    for (const key in this.dbConfig) {
      if (!this.dbConfig[key]) continue;
      const cfg = path.join(this.baseDir, 'prisma.' + key + '.config.ts');
      if (!fs.existsSync(cfg)) continue;
      try {
        execSync('npx prisma generate --config "' + cfg + '"', {
          cwd: this.baseDir,
          stdio: 'pipe',
          timeout: 30000,
        });
      } catch (e) {
        // generate may fail if schema pull failed
        // this should not crash the app
      }
    }
  }

  sync() {
    this.generateConfigs();
    this.ensureInitialSchemas();
    this.pullSchemas();
    this.generateClients();
  }
}

module.exports = PrismaManager;