import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { HttpClient } from "../src/HttpClient";
import type { HttpMiddleware } from "../src/types";
import axios from "axios";

describe("HttpClient", () => {
  let client: HttpClient;

  beforeEach(() => {
    // Mock axios.create → mock request → 避免真实 HTTP 请求导致 AbortError
    vi.spyOn(axios, "create").mockReturnValue({
      request: vi.fn().mockRejectedValue(new Error("mocked")),
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      defaults: {},
    } as any);

    client = new HttpClient({ baseURL: "http://test.local" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create instance with default config", () => {
    const c = new HttpClient();
    expect(c).toBeInstanceOf(HttpClient);
  });

  it("should add middlewares", () => {
    const mw: HttpMiddleware = async (_, next) => next();
    client.use(mw);
    expect(() => client.use(mw)).not.toThrow();
  });

  it("should remove middlewares", () => {
    const mw: HttpMiddleware = async (_, next) => next();
    client.use(mw);
    expect(client.removeMiddleware(mw)).toBe(true);
    expect(client.removeMiddleware(mw)).toBe(false);
  });

  it("should clear all middlewares and not throw synchronously", async () => {
    client.use(async (_, next) => next());
    client.use(async (_, next) => next());
    client.clearMiddlewares();
    // request 会立即 reject（mock），不应同步抛
    await client.get("/test").catch(() => {});
  });

  it("should expose axios instance", () => {
    expect(client.axios).toBeDefined();
    expect(typeof client.axios.request).toBe("function");
  });

  it("should create instance with provided config", () => {
    // axios.create 已被 beforeEach mock，检查调用参数即可
    vi.mocked(axios.create).mockClear();
    const c = new HttpClient({ baseURL: "/api", timeout: 5000 });
    expect(vi.mocked(axios.create)).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: "/api", timeout: 5000 })
    );
  });
});
