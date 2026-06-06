import { http, getTokenStatus, clearTokens } from "../utils/http";
import type { ApiResponse } from "../utils/http";

// ── 类型 ──

type LoginParams = {
  username: string;
  password: string;
};

// ── Auth ──

export const loginApi = async (payload: LoginParams) => {
  const response: ApiResponse = await http.post("/public/auth/login", payload);
  return response.data;
};

export const getUserInfoApi = async () => {
  const response: ApiResponse = await http.get("/auth/getUserInfo");
  return response.data;
};

export const refreshTokenApi = async () => {
  const response: ApiResponse = await http.post("/public/auth/refresh");
  return response.data;
};

export const logoutApi = () => {
  clearTokens();
};

// ── Token 状态（供组件展示用）──

export { getTokenStatus, clearTokens };
