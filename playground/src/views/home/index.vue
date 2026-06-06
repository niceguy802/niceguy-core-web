<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { HttpClient, createRetryMiddleware, createAuthMiddleware } from "@sisin/http-client";
import { loginApi, getUserInfoApi, refreshTokenApi, getTokenStatus, clearTokens } from "../../api/common";

const router = useRouter();

// ---- Auth 状态 ----
function refreshAuthStatus() {
  const st = getTokenStatus();
  authStatus.accessToken = st.accessToken ? st.accessToken.substring(0, 20) + "..." : "(无)";
  authStatus.refreshToken = st.refreshToken ? st.refreshToken.substring(0, 20) + "..." : "(无)";
  authStatus.loggedIn = st.loggedIn;
}

// ---- 基础测试客户端（裸 HttpClient，无中间件，用于 jsonplaceholder 测试）----
const jsonHttp = new HttpClient({ baseURL: "https://jsonplaceholder.typicode.com", timeout: 10000 });

// ---- 完整中间件链实例 ----
const httpFull = new HttpClient({ baseURL: "https://jsonplaceholder.typicode.com", timeout: 10000 });
httpFull.use(createAuthMiddleware(() => "test-token-abc"));
httpFull.use(createRetryMiddleware({ maxRetries: 1, delay: 500 }));

const result = ref("");
const loading = ref(false);
const logs = reactive<string[]>([]);

const authStatus = reactive({
  loggedIn: false, username: "", accessToken: "", refreshToken: ""
});
refreshAuthStatus();

// hijack console.log
const originalLog = console.log;
console.log = (...args: any[]) => {
  logs.push(args.map(a => typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)).join(" "));
  originalLog.apply(console, args);
};

// ---- 基础功能测试 ----
async function testGet() {
  loading.value = true; result.value = "";
  try { result.value = JSON.stringify(await jsonHttp.get("/posts/1"), null, 2); }
  catch (e: any) { result.value = "ERROR: " + e.message; }
  finally { loading.value = false; }
}

async function testPost() {
  loading.value = true; result.value = "";
  try { result.value = JSON.stringify(await jsonHttp.post("/posts", { title: "foo", body: "bar", userId: 1 }), null, 2); }
  catch (e: any) { result.value = "ERROR: " + e.message; }
  finally { loading.value = false; }
}

async function testError() {
  loading.value = true; result.value = "";
  try { await jsonHttp.get("/posts/99999"); }
  catch (e: any) { result.value = "ERROR: " + e.message; }
  finally { loading.value = false; }
}

// ---- 洋葱顺序测试 ----
async function testOnionOrder() {
  const h = new HttpClient({ baseURL: "https://jsonplaceholder.typicode.com", timeout: 10000 });
  h.use(async (_ctx, next) => { logs.push("[Onion] m1: before"); await next(); logs.push("[Onion] m1: after"); });
  h.use(async (_ctx, next) => { logs.push("[Onion] m2: before"); await next(); logs.push("[Onion] m2: after"); });
  loading.value = true; result.value = "";
  try { result.value = JSON.stringify(await h.get("/posts/1"), null, 2) + "\n\n(洋葱顺序正确)"; }
  catch (e: any) { result.value = "ERROR: " + e.message; }
  finally { loading.value = false; }
}

// ---- 重试测试 ----
async function testRetry() {
  const h = new HttpClient({ baseURL: "https://jsonplaceholder.typicode.com", timeout: 10000 });
  let callCount = 0, isFirst = true;
  h.use(async (ctx, next) => {
    callCount++;
    if (isFirst && ctx.config.url?.includes("/posts/1")) { isFirst = false; throw new Error("mock fail"); }
    await next();
  });
  h.use(createRetryMiddleware({ maxRetries: 2, delay: 200, shouldRetry: () => true }));
  loading.value = true; result.value = "";
  try { result.value = JSON.stringify(await h.get("/posts/1"), null, 2) + "\n\n(重试: " + callCount + " 次)"; }
  catch (e: any) { result.value = "ERROR: " + e.message; }
  finally { loading.value = false; }
}

// ---- 双 next 守卫 ----
async function testDoubleNextGuard() {
  const h = new HttpClient({ baseURL: "https://jsonplaceholder.typicode.com", timeout: 10000 });
  h.use(async (_ctx, next) => { logs.push("[Guard] m1: before"); await next(); logs.push("[Guard] m1: after"); });
  h.use(async (_ctx, next) => {
    logs.push("[Guard] m2: before (第1次 next)"); await next(); logs.push("[Guard] m2: after");
    logs.push("[Guard] m2: 第2次 next（应被拦截）"); await next(); logs.push("[Guard] m2: 第2次返回");
  });
  loading.value = true; result.value = "";
  try { result.value = JSON.stringify(await h.get("/posts/1"), null, 2) + "\n\n(守卫拦截成功)"; }
  catch (e: any) { result.value = "ERROR: " + e.message; }
  finally { loading.value = false; }
}

// ---- 本地后端测试（通过 api 模块统一调用）----
async function testLogin() {
  loading.value = true; result.value = "";
  try {
    const data = await loginApi({ username: "admin", password: "123456" });
    result.value = JSON.stringify(data, null, 2);
    logs.push("[Auth] 登录成功"); refreshAuthStatus();
  } catch (e: any) { result.value = "登录失败: " + e.message; logs.push("[Auth] 登录失败"); }
  finally { loading.value = false; }
}

async function testGetUserInfo() {
  loading.value = true; result.value = "";
  try {
    result.value = JSON.stringify(await getUserInfoApi(), null, 2);
    logs.push("[Auth] 获取用户信息成功");
  } catch (e: any) { result.value = "失败: " + e.message; }
  finally { loading.value = false; }
}

async function testRefreshAuth() {
  loading.value = true; result.value = "";
  try {
    const data = await refreshTokenApi();
    result.value = "刷新成功: " + JSON.stringify(data);
    logs.push("[Auth] 刷新成功"); refreshAuthStatus();
  } catch (e: any) { result.value = "刷新失败: " + e.message; }
  finally { loading.value = false; }
}

function testLogout() {
  clearTokens();
  result.value = "已登出";
  logs.push("[Auth] 已登出");
  refreshAuthStatus();
}

function clearLogs() { logs.splice(0, logs.length); }
</script>

<template>
  <div class="container">
    <h1>HTTP Framework 测试面板</h1>

    <div class="section-divider"></div>

    <h2>基础功能测试</h2>
    <div class="controls">
      <button :disabled="loading" @click="testGet">GET /posts/1</button>
      <button :disabled="loading" @click="testPost">POST /posts</button>
      <button :disabled="loading" @click="testError">GET 404</button>
      <button :disabled="loading" @click="testOnionOrder">Onion Order</button>
      <button :disabled="loading" @click="testDoubleNextGuard">Double next Guard</button>
      <button :disabled="loading" @click="testRetry">Retry</button>
      <button @click="clearLogs">Clear Logs</button>
    </div>

    <div class="section-divider"></div>

    <h2>本地后端测试</h2>
    <div class="auth-status">
      <span>状态: <strong>{{ authStatus.loggedIn ? "已登录" : "未登录" }}</strong></span>
      <span>accessToken: <code>{{ authStatus.accessToken }}</code></span>
      <span>refreshToken: <code>{{ authStatus.refreshToken }}</code></span>
    </div>
    <div class="controls">
      <button :disabled="loading" class="btn-primary" @click="testLogin">登录 (admin/123456)</button>
      <button :disabled="loading || !authStatus.loggedIn" class="btn-success" @click="testGetUserInfo">获取用户信息</button>
      <button :disabled="loading || !authStatus.loggedIn" class="btn-warning" @click="testRefreshAuth">刷新 Token</button>
      <button :disabled="!authStatus.loggedIn" class="btn-danger" @click="testLogout">登出</button>
    </div>

    <div v-if="loading" class="loading">Loading...</div>

    <div class="panel">
      <h2>Response</h2>
      <pre>{{ result || "(no request yet)" }}</pre>
    </div>

    <div class="panel">
      <h2>Logs</h2>
      <div class="log-list">
        <div v-for="(log, i) in logs" :key="i" class="log-line">{{ log }}</div>
        <div v-if="logs.length === 0" class="log-line muted">(no logs)</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container { max-width: 840px; margin: 2rem auto; font-family: system-ui, sans-serif; padding: 0 1rem; }
h1 { font-size: 1.4rem; margin-bottom: 0.5rem; }
h2 { font-size: 1.1rem; margin: 0.75rem 0 0.5rem; }
.section-divider { border-top: 2px dashed #ccc; margin: 1rem 0; }
.controls { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
button { padding: 0.4rem 0.8rem; cursor: pointer; font-size: 0.875rem; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #1677ff; color: #fff; border: 1px solid #1677ff; }
.btn-success { background: #52c41a; color: #fff; border: 1px solid #52c41a; }
.btn-warning { background: #faad14; color: #fff; border: 1px solid #faad14; }
.btn-danger { background: #ff4d4f; color: #fff; border: 1px solid #ff4d4f; }
.auth-status { display: flex; gap: 1rem; flex-wrap: wrap; background: #f6f8fa; padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.85rem; }
.auth-status code { background: #e8e8e8; padding: 0.1rem 0.4rem; border-radius: 3px; font-size: 0.8rem; }
.loading { padding: 0.5rem; background: #fff3cd; border-radius: 4px; margin-bottom: 1rem; }
.panel { margin-bottom: 1rem; }
.panel h2 { font-size: 1rem; margin-bottom: 0.3rem; }
pre { background: #f5f5f5; padding: 0.8rem; border-radius: 4px; overflow-x: auto; min-height: 3rem; white-space: pre-wrap; }
.log-list { background: #1e1e1e; color: #d4d4d4; padding: 0.5rem; border-radius: 4px; max-height: 350px; overflow-y: auto; font-family: monospace; font-size: 0.85rem; }
.log-line { padding: 2px 0; border-bottom: 1px solid #333; }
.muted { color: #666; }
</style>
