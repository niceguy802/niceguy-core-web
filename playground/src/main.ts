import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import { createHttpPlugin } from "@sisin/http-client";

const app = createApp(App);

app.use(
  createHttpPlugin({
    baseURL: "/api",
    tokenMode: "cookie",
    loginEndpoint: "/public/auth/login",
    refreshEndpoint: "/public/auth/refresh",
    onReLogin: () => router.push("/login"),
  })
);

app.use(router);
app.mount("#app");
