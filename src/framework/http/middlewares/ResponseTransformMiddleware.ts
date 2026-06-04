// 统一处理返回：将完整 ApiResponse 结构（含 code/message/success/data）放到 ctx.result
// 前端可直接使用 result.message 做提示、result.data 获取实际数据
import type { HttpMiddleware, ApiResponse } from '../types';
import { BusinessError } from '../errors';

export const ResponseTransformMiddleware: HttpMiddleware = async (ctx, next) => {
  await next()

  const body = ctx.response?.data
  if (!body) {
    return
  }

  // 只对符合 ApiResponse 结构的响应做处理
  if (typeof body === 'object' && 'success' in body && 'data' in body) {
    const apiRes = body as ApiResponse
    if (!apiRes.success) {
      throw new BusinessError(
        String(apiRes.code),
        apiRes.message
      )
    }
    // 返回完整 ApiResponse，前端可读取 .message 做提示、.data 取数据
    ctx.result = body
  }

  // 非 ApiResponse 格式的响应（如 jsonplaceholder）透传，不做处理
}
