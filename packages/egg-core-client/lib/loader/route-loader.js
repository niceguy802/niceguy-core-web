class RouteLoader {
    constructor(app) {
        this.app = app;
    }
    load() {
        const { router, controller } = this.app;
        console.log("RouteLoader load");
        console.log(this.app.controller)
        router.prefix('/api');
        this.app.router.post("/public/auth/login", this.app.controller.authSystem.auth.login);
        // 刷新refresh
        this.app.router.post("/public/auth/refresh", this.app.controller.authSystem.auth.refresh);
        // 用户登出（需鉴权）
        this.app.router.post("/auth/logout", this.app.controller.authSystem.auth.logout);
        // 修改密码（需鉴权）
        this.app.router.post("/auth/changePassword", this.app.controller.authSystem.auth.changePassword);
        // 获取用户信息
        this.app.router.get("/auth/getUserInfo", this.app.controller.authSystem.auth.getUserInfo);
    }
}
module.exports = RouteLoader;