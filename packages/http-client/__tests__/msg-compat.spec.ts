// ResponseTransformMiddleware — 兼容后端 msg 字段的补充测试
import { describe, expect, it } from "vitest";
import { ResponseTransformMiddleware } from "../src/middlewares/ResponseTransformMiddleware";
import { BusinessError } from "../src/errors";
import type { HttpContext } from "../src/types";

function createCtx(): HttpContext {
  return { config: { url: "/test", headers: {} }, metadata: {} };
}

describe("ResponseTransformMiddleware — msg compatibility", () => {
  it("should use `msg` field when backend returns `msg` not `message`", async () => {
    const ctx = createCtx();
    ctx.response = {
      status: 200,
      data: { success: false, code: 401, msg: "用户未登录或登录已过期", data: null },
    } as any;
    try {
      await ResponseTransformMiddleware(ctx, async () => {});
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(BusinessError);
      expect(e.message).toBe("用户未登录或登录已过期");
    }
  });

  it("should prefer `message` over `msg` when both exist", async () => {
    const ctx = createCtx();
    ctx.response = {
      status: 200,
      data: { success: false, code: 400, message: "message-field", msg: "msg-field", data: null },
    } as any;
    try {
      await ResponseTransformMiddleware(ctx, async () => {});
      expect.unreachable("should have thrown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(BusinessError);
      expect(e.message).toBe("message-field");
    }
  });
});
