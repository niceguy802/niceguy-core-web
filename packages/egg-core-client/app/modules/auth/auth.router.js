// framework/modules/user/user.router.js

module.exports = app => {

  const {
    router,
    controller,
  } = app;

  router.get(
    '/user/list',
    controller.user.getList
  );
};