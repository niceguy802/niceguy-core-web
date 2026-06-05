import { http } from "../utils/http";
import type { ApiResponse } from "../utils/http";
// 登录
type LoginParams = {
    username: string;
    password: string;
};
export const loginApi = async (payload: LoginParams) => {
    const response: ApiResponse = await http.post("/public/auth/login", payload);
    console.log("login", response.data);
    return response.data;
};
// 获取用户信息的 API 示例
export const getUserInfoApi = async () => {
    const response: ApiResponse = await http.get("/auth/getUserInfo");
    console.log("getUserInfo", response.data);
    return response.data;
};