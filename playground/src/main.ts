import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { http, tokenManager } from "./utils/http";
import { URL_KEY, verifyAuth } from "@sisin/http-client";

async function setupHttp() {
  // 启动时验证 token 有效性
  // - memory 模式下，refreshToken 由后端 HTTP-only cookie 管理
  // - 刷新失败（refreshToken 也过期）则自动跳转登录页
  // - 注意：memory 模式页面刷新后 accessToken 丢失，verifyAuth 会通过 cookie 刷新获取新 accessToken
  await verifyAuth({
    baseURL: "/api",
    refreshEndpoint: "/public/auth/refresh",
    loginPageUrl: "/login",
    tokenMode: "memory",
    // 传入与 createHttpClient 共享的 TokenManager，刷新后的 token 可直接同步到 http 实例
    tokenManager,
  });

  const app = createApp(App);

  // 注册全局 $url（单例，与 api 模块共用同一个实例）
  app.config.globalProperties.$url = http;
  app.provide(URL_KEY, http);

  app.use(router);
  app.mount("#app");
}

setupHttp();
