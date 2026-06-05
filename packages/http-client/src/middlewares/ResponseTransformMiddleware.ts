import type { HttpMiddleware, ApiResponse } from "../types";
import { BusinessError } from "../errors";

export const ResponseTransformMiddleware: HttpMiddleware = async (
  ctx,
  next
) => {
  await next();

  const body = ctx.response?.data;

  // 无响应体 → 直接返回
  if (body == null) return;

  // 只对符合 ApiResponse 结构的响应做处理
  if (
    body &&
    typeof body === "object" &&
    "success" in body &&
    "data" in body
  ) {
    const apiRes = body as ApiResponse & { msg?: string };
    if (!apiRes.success) {
      // 后端可能返回 msg 或 message，兼容两种
      throw new BusinessError(
        String(apiRes.code),
        apiRes.message ?? apiRes.msg ?? ""
      );
    }
    // 把完整 ApiResponse 挂到 result，前端可读取 .message/.data
    ctx.result = body;
  }
  // 非 ApiResponse 格式（如 jsonplaceholder）透传
};
