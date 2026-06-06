<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { loginApi } from "../../api/common";

const router = useRouter();
const username = ref("admin");
const password = ref("123456");
const loading = ref(false);
const errorMsg = ref("");

async function handleLogin() {
  loading.value = true;
  errorMsg.value = "";
  try {
    // AuthResponseMiddleware 自动保存 accessToken
    const res = await loginApi({ username: username.value, password: password.value });
    console.log("[Login] 登录成功", res);
    router.push("/");
  } catch (e: any) {
    errorMsg.value = e.message || "登录失败";
    console.error("[Login] 失败", e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-card">
      <h2>登录</h2>
      <p class="desc">使用 admin / 123456 测试</p>

      <form @submit.prevent="handleLogin">
        <div class="field">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="admin" />
        </div>
        <div class="field">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="123456" />
        </div>

        <div v-if="errorMsg" class="error">{{ errorMsg }}</div>

        <button type="submit" :disabled="loading" class="btn-login">
          {{ loading ? "登录中..." : "登 录" }}
        </button>
      </form>

      <p class="hint">
        cookie 模式：accessToken 存 localStorage，<br />
        session 由 Redis 管理，通过 HTTP-only cookie 传递
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex; align-items: center; justify-content: center;
  min-height: 60vh;
}
.login-card {
  width: 360px; padding: 2rem;
  background: #fff; border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.login-card h2 { text-align: center; margin-bottom: 0.25rem; }
.desc { text-align: center; color: #888; font-size: 0.85rem; margin-bottom: 1.5rem; }
.field { margin-bottom: 1rem; }
.field label { display: block; font-size: 0.875rem; margin-bottom: 0.3rem; color: #333; }
.field input {
  width: 100%; padding: 0.5rem 0.75rem;
  border: 1px solid #d9d9d9; border-radius: 4px;
  font-size: 0.9rem; box-sizing: border-box;
}
.field input:focus { border-color: #1677ff; outline: none; box-shadow: 0 0 0 2px rgba(22,119,255,0.1); }
.error { color: #ff4d4f; font-size: 0.85rem; margin-bottom: 0.75rem; }
.btn-login {
  width: 100%; padding: 0.6rem; font-size: 1rem;
  background: #1677ff; color: #fff; border: none; border-radius: 4px; cursor: pointer;
}
.btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
.hint { text-align: center; color: #999; font-size: 0.8rem; margin-top: 1.5rem; line-height: 1.6; }
</style>
