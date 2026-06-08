'use strict';

const path = require('path');
const egg = require('egg');

const EGG_PATH = Symbol.for('egg#eggPath');

class FrameworkApplication extends egg.Application {
  get [EGG_PATH]() {
    return path.join(__dirname);
  }
}

Object.assign(exports, egg);
exports.Application = FrameworkApplication;

const customExports = {
  prisma:       () => require('./app/utils/prisma'),
  PrismaManager:() => require('./app/utils/prisma-manager'),
  BaseRepository:   () => require('./app/core/repository/base-repository'),
  TransactionManager:() => require('./app/core/database/transaction-manager'),
  encrypt:      () => require('./app/utils/encrypt'),
  jwt:          () => require('./app/utils/jwt'),
  common:       () => require('./app/utils/common'),
  logger:       () => require('./app/utils/logger'),
  permission:   () => require('./app/utils/permission'),
};

for (const [name, loader] of Object.entries(customExports)) {
  Object.defineProperty(exports, name, { enumerable: true, get: loader });
}