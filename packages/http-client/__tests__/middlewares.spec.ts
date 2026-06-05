import { describe, expect, it, vi } from "vitest";
import { createAuthMiddleware } from "../src/middlewares/AuthMiddleware";
import { createDeviceMiddleware } from "../src/middlewares/DeviceMiddleware";
import { createRefreshTokenMiddleware } from "../src/middlewares/RefreshTokenMiddleware";
import { createRetryMiddleware } from "../src/middlewares/RetryMiddleware";
import { createErrorMiddleware } from "../src/middlewares/ErrorMiddleware";
import { HttpStatusMiddleware } from "../src/middlewares/HttpStatusMiddleware";
import { ResponseTransformMiddleware } from "../src/middlewares/ResponseTransformMiddleware";
import { LoggerMiddleware } from "../src/middlewares/LoggerMiddleware";
import { createLoadingMiddleware } from "../src/middlewares/LoadingMiddleware";
import { AuthError, HttpError, NetworkError, BusinessError } from "../src/errors";
import type { HttpContext } from "../src/types";

function createCtx(): HttpContext {
  return { config: { url: "/test", headers: {} }, metadata: {} };
}

// ── AuthMiddleware ──

describe("AuthMiddleware", () => {
  it("should inject Authorization header", async () => {
    const ctx = createCtx();
    const mw = createAuthMiddleware(() => "token-abc");
    let nextCalled = false;
    await mw(ctx, async () => { nextCalled = true; });
    expect(ctx.config.headers?.Authorization).toBe("Bearer token-abc");
    expect(nextCalled).toBe(true);
  });

  it("should skip when no token", async () => {
    const ctx = createCtx();
    const mw = createAuthMiddleware(() => null);
    await mw(ctx, async () => {});
    expect(ctx.config.headers?.Authorization).toBeUndefined();
  });
});

// ── DeviceMiddleware ──

describe("DeviceMiddleware", () => {
  it("should inject X-Device header", async () => {
    const ctx = createCtx();
    const mw = createDeviceMiddleware(() => "mobile");
    await mw(ctx, async () => {});
    expect((ctx.config.headers as Record<string, string>)?.["X-Device"]).toBe("mobile");
  });
});

// ── RefreshTokenMiddleware ──

describe("RefreshTokenMiddleware", () => {
  it("should refresh token on AuthError and retry", async () => {
    const ctx = createCtx();
    const refreshFn = vi.fn(async () => "new-token");
    const successFn = vi.fn();

    const mw = createRefreshTokenMiddleware({
      getRefreshToken: () => "refresh-token",
      refreshToken: refreshFn,
      onRefreshSuccess: successFn,
    });

    let callCount = 0;
    await mw(ctx, async () => {
      callCount++;
      if (callCount === 1) throw new AuthError("expired");
    });

    expect(refreshFn).toHaveBeenCalledOnce();
    expect(successFn).toHaveBeenCalledWith("new-token");
    expect(ctx.config.headers?.Authorization).toBe("Bearer new-token");
    expect(callCount).toBe(2);
  });

  it("should throw original error if no refresh token", async () => {
    const ctx = createCtx();
    const mw = createRefreshTokenMiddleware({
      getRefreshToken: () => null,
      refreshToken: async () => "",
    });

    await expect(
      mw(ctx, async () => { throw new AuthError(); })
    ).rejects.toThrow(AuthError);
  });

  it("should pass through non-AuthError", async () => {
    const ctx = createCtx();
    const mw = createRefreshTokenMiddleware({
      getRefreshToken: () => "rt",
      refreshToken: async () => "",
    });

    await expect(
      mw(ctx, async () => { throw new Error("other"); })
    ).rejects.toThrow("other");
  });
});

// ── RetryMiddleware ──

describe("RetryMiddleware", () => {
  it("should retry on NetworkError", async () => {
    const ctx = createCtx();
    const mw = createRetryMiddleware({ maxRetries: 2, delay: 10 });
    let count = 0;
    await mw(ctx, async () => {
      count++;
      if (count <= 2) throw new NetworkError();
    });
    expect(count).toBe(3); // initial + 2 retries
  });

  it("should not retry on non-retryable error", async () => {
    const ctx = createCtx();
    const mw = createRetryMiddleware({ maxRetries: 2, delay: 10 });
    await expect(
      mw(ctx, async () => { throw new Error("not-retryable"); })
    ).rejects.toThrow("not-retryable");
  });

  it("should succeed on first try", async () => {
    const ctx = createCtx();
    const mw = createRetryMiddleware({ maxRetries: 2, delay: 10 });
    let count = 0;
    await mw(ctx, async () => { count++; });
    expect(count).toBe(1);
  });

  it("should pass through when maxRetries=0", async () => {
    const ctx = createCtx();
    const mw = createRetryMiddleware({ maxRetries: 0 });
    await expect(
      mw(ctx, async () => { throw new NetworkError(); })
    ).rejects.toThrow(NetworkError);
  });
});

// ── ErrorMiddleware ──

describe("ErrorMiddleware", () => {
  it("should call onError handler", async () => {
    const onError = vi.fn();
    const mw = createErrorMiddleware({ onError });
    const ctx = createCtx();
    await expect(
      mw(ctx, async () => { throw new Error("boom"); })
    ).rejects.toThrow("boom");
    expect(onError).toHaveBeenCalled();
  });

  it("should re-throw the error", async () => {
    const mw = createErrorMiddleware();
    await expect(
      mw(createCtx(), async () => { throw new Error("boom"); })
    ).rejects.toThrow("boom");
  });

  it("should use console.warn by default (no handler)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mw = createErrorMiddleware();
    await expect(
      mw(createCtx(), async () => { throw new BusinessError("BIZ_001", "bad"); })
    ).rejects.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ── HttpStatusMiddleware ──

describe("HttpStatusMiddleware", () => {
  it("should throw AuthError on 401", async () => {
    const ctx = createCtx();
    ctx.response = { status: 401 } as any;
    await expect(HttpStatusMiddleware(ctx, async () => {})).rejects.toThrow(AuthError);
  });

  it("should throw HttpError on 500", async () => {
    const ctx = createCtx();
    ctx.response = { status: 500 } as any;
    await expect(HttpStatusMiddleware(ctx, async () => {})).rejects.toThrow(HttpError);
  });

  it("should pass on 200", async () => {
    const ctx = createCtx();
    ctx.response = { status: 200 } as any;
    await expect(HttpStatusMiddleware(ctx, async () => {})).resolves.toBeUndefined();
  });
});

// ── ResponseTransformMiddleware ──

describe("ResponseTransformMiddleware", () => {
  it("should pass successful ApiResponse to result", async () => {
    const ctx = createCtx();
    ctx.response = { data: { success: true, data: { id: 1 }, code: 0, message: "ok" } } as any;
    await ResponseTransformMiddleware(ctx, async () => {});
    expect(ctx.result).toEqual({ success: true, data: { id: 1 }, code: 0, message: "ok" });
  });

  it("should throw BusinessError on unsuccessful ApiResponse", async () => {
    const ctx = createCtx();
    ctx.response = { data: { success: false, code: 1001, message: "bad", data: null } } as any;
    await expect(ResponseTransformMiddleware(ctx, async () => {})).rejects.toThrow(BusinessError);
  });

  it("should pass through non-ApiResponse", async () => {
    const ctx = createCtx();
    ctx.response = { data: "raw string" } as any;
    await ResponseTransformMiddleware(ctx, async () => {});
    expect(ctx.result).toBeUndefined();
  });

  it("should handle null body", async () => {
    const ctx = createCtx();
    ctx.response = { data: null } as any;
    await ResponseTransformMiddleware(ctx, async () => {});
    expect(ctx.result).toBeUndefined();
  });

  it("should handle missing response", async () => {
    const ctx = createCtx();
    await ResponseTransformMiddleware(ctx, async () => {});
    expect(ctx.result).toBeUndefined();
  });
});

// ── LoggerMiddleware ──

describe("LoggerMiddleware", () => {
  it("should set timing metadata", async () => {
    const ctx = createCtx();
    await LoggerMiddleware(ctx, async () => {});
    expect(ctx.metadata.startTime).toBeGreaterThan(0);
    expect(ctx.metadata.endTime).toBeGreaterThanOrEqual(ctx.metadata.startTime!);
  });
});

// ── LoadingMiddleware ──

describe("LoadingMiddleware", () => {
  it("should call start/stop", async () => {
    const start = vi.fn();
    const stop = vi.fn();
    const mw = createLoadingMiddleware({ start, stop });
    await mw(createCtx(), async () => {});
    expect(start).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();
  });

  it("should stop even on error", async () => {
    const start = vi.fn();
    const stop = vi.fn();
    const mw = createLoadingMiddleware({ start, stop });
    await expect(
      mw(createCtx(), async () => { throw new Error("boom"); })
    ).rejects.toThrow();
    expect(start).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();
  });
});
