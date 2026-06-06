import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { http } from "./utils/http";
import { URL_KEY, verifyAuth } from "@sisin/http-client";

// 启动时验证 token 有效性
// - memory 模式下，refreshToken 由后端 HTTP-only cookie 管理
// - 刷新失败（refreshToken 也过期）则自动跳转登录页
// - 注意：memory 模式页面刷新后 accessToken 丢失，verifyAuth 会通过 cookie 刷新获取新 accessToken
verifyAuth({
  baseURL: "/api",
  refreshEndpoint: "/public/auth/refresh",
  loginPageUrl: "/login",
  tokenMode: "memory",
});

const app = createApp(App);

// 注册全局 $url（单例，与 api 模块共用同一个实例）
app.config.globalProperties.$url = http;
app.provide(URL_KEY, http);

app.use(router);
app.mount("#app");
