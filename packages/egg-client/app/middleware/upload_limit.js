"use strict";
// 上传文件限制中间件（大小、类型）
const path = require('path');
const { BAD_REQUEST } = require('../constants/code');

module.exports = () => {
  return async function uploadLimit(ctx, next) {
    const file = ctx.request.files?.[0];
    if (!file) { ctx.api.fail('请上传文件', BAD_REQUEST, null); return; }
    const { whiteList = [], size = 10 } = ctx.app.config.fileLimit;
    const ext = path.extname(file.filename);
    if (!whiteList.includes(ext)) { ctx.api.fail('文件格式错误', BAD_REQUEST, null); return; }
    const maxSize = size * 1024 * 1024;
    if (file.size > maxSize) { ctx.api.fail('文件大小超出限制', BAD_REQUEST, null); return; }
    await next();
  };
};
