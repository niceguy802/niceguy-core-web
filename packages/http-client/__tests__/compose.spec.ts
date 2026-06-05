import { describe, expect, it, vi } from "vitest";
import { compose } from "../src/compose";
import type { HttpContext, HttpMiddleware } from "../src/types";

function createCtx(): HttpContext {
  return {
    config: { url: "/test", headers: {} },
    metadata: {},
  };
}

describe("compose", () => {
  it("should execute middlewares in order", async () => {
    const order: number[] = [];
    const mws: HttpMiddleware[] = [
      async (_, next) => { order.push(1); await next(); },
      async (_, next) => { order.push(2); await next(); },
      async (_, next) => { order.push(3); await next(); },
    ];

    await compose(mws, createCtx());
    expect(order).toEqual([1, 2, 3]);
  });

  it("should support onion model (return in reverse)", async () => {
    const order: number[] = [];
    const mws: HttpMiddleware[] = [
      async (_, next) => { order.push("a"); await next(); order.push("z"); },
      async (_, next) => { order.push("b"); await next(); order.push("y"); },
      async (_, next) => { order.push("c"); await next(); order.push("x"); },
    ];
    // terminal - no more next
    await compose([...mws, async () => { order.push("terminal"); }], createCtx());
    expect(order).toEqual(["a", "b", "c", "terminal", "x", "y", "z"]);
  });

  it("should propagate errors", async () => {
    const mws: HttpMiddleware[] = [
      async (_, next) => { await next(); },
      async () => { throw new Error("boom"); },
    ];

    await expect(compose(mws, createCtx())).rejects.toThrow("boom");
  });

  it("should support retry (re-entering chain after error)", async () => {
    const ctx = createCtx();
    let callCount = 0;

    const outer: HttpMiddleware = async (ctx, next) => {
      try {
        await next();
      } catch {
        // retry once
        await next();
      }
    };

    const inner: HttpMiddleware = async () => {
      callCount++;
      if (callCount === 1) throw new Error("retry-me");
    };

    await compose([outer, inner], ctx);
    expect(callCount).toBe(2);
  });

  it("should not allow re-entering same middleware without retry", async () => {
    let depth = 0;
    const mws: HttpMiddleware[] = [
      async (_, next) => { depth++; await next(); },
      async (_, next) => {
        depth++;
        await next();
        // try to call next again (should be a no-op via dispatch guard)
        await next();
      },
    ];

    await compose(mws, createCtx());
    expect(depth).toBe(2);
  });

  it("should handle empty middleware list", async () => {
    await expect(compose([], createCtx())).resolves.toBeUndefined();
  });
});
