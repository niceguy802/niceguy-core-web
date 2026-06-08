// 权限中间件（预留，由业务项目扩展）
module.exports = (permissionCode) => {
  return async (ctx, next) => {
    const permissions = ctx.user.permissions || [];
    if (!permissions.includes(permissionCode)) { return ctx.api.fail('No permission', 403, null); }
    await next();
  };
};
