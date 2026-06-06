import { createRouter, createWebHistory } from "vue-router";
import { ACCESS_TOKEN_KEY, buildStorageKey } from "@sisin/http-client";

const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/home/index.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("../views/login/index.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫：未登录跳转登录页
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem(buildStorageKey(ACCESS_TOKEN_KEY));
  if (to.meta.requiresAuth && !token) {
    next("/login");
  } else if (to.path === "/login" && token) {
    next("/");
  } else {
    next();
  }
});

export default router;