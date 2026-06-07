import { createRouter, createWebHistory } from "vue-router";

import { getTokenStatus } from "../api/common"

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
  const token = getTokenStatus();
  if (to.meta.requiresAuth && !token.loggedIn) {
    next("/login");
  } else if (to.path === "/login" && token.loggedIn) {
    next("/");
  } else {
    next();
  }
});

export default router;
