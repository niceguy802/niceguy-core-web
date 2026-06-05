<script setup lang="ts">
import { useRouter } from "vue-router";
import { ACCESS_TOKEN_KEY } from "@sisin/http-client";
import { ref, watch } from "vue";

const router = useRouter();
const loggedIn = ref(!!localStorage.getItem(ACCESS_TOKEN_KEY));

watch(router.currentRoute, () => {
  loggedIn.value = !!localStorage.getItem(ACCESS_TOKEN_KEY);
});

function doLogout() {
  localStorage.removeItem("niceguy_core_web_access_token");
  localStorage.removeItem("niceguy_core_web_refresh_token");
  loggedIn.value = false;
  router.push("/login");
}
</script>

<template>
  <nav class="topnav">
    <div class="nav-inner">
      <span class="brand">⚡ Playground</span>
      <div class="nav-links">
        <router-link to="/" class="nav-link">首页（测试面板）</router-link>
        <router-link v-if="!loggedIn" to="/login" class="nav-link">登录</router-link>
        <a v-else href="#" class="nav-link logout" @click.prevent="doLogout">退出</a>
      </div>
    </div>
  </nav>

  <main>
    <router-view />
  </main>
</template>

<style scoped>
.topnav {
  background: #1a1a2e; color: #eee; padding: 0 1rem;
  position: sticky; top: 0; z-index: 100;
}
.nav-inner {
  max-width: 900px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  height: 48px;
}
.brand { font-weight: bold; font-size: 1.05rem; }
.nav-links { display: flex; gap: 1rem; }
.nav-link { color: #ccc; text-decoration: none; font-size: 0.9rem; }
.nav-link:hover { color: #fff; }
.logout { color: #ff7875 !important; }
main { max-width: 900px; margin: 1.5rem auto; padding: 0 1rem; }
</style>
