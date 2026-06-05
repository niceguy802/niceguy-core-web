import { describe, expect, it } from "vitest";
import { MiddlewareManager } from "../src/MiddlewareManager";
import type { HttpMiddleware } from "../src/types";

describe("MiddlewareManager", () => {
  it("should add middlewares", () => {
    const mgr = new MiddlewareManager();
    const mw: HttpMiddleware = async (_, next) => next();
    mgr.use(mw);
    expect(mgr.getMiddlewares()).toHaveLength(1);
  });

  it("should remove a middleware by reference", () => {
    const mgr = new MiddlewareManager();
    const mw1: HttpMiddleware = async (_, next) => next();
    const mw2: HttpMiddleware = async (_, next) => next();
    mgr.use(mw1);
    mgr.use(mw2);
    expect(mgr.remove(mw1)).toBe(true);
    expect(mgr.getMiddlewares()).toHaveLength(1);
    expect(mgr.getMiddlewares()[0]).toBe(mw2);
  });

  it("should return false when removing non-existent middleware", () => {
    const mgr = new MiddlewareManager();
    expect(mgr.remove(async (_, next) => next())).toBe(false);
  });

  it("should clear all middlewares", () => {
    const mgr = new MiddlewareManager();
    mgr.use(async (_, next) => next());
    mgr.use(async (_, next) => next());
    mgr.removeAll();
    expect(mgr.getMiddlewares()).toHaveLength(0);
  });

  it("should insert before a target middleware", () => {
    const mgr = new MiddlewareManager();
    const existing: HttpMiddleware = async (_, next) => next();
    const toInsert: HttpMiddleware = async (_, next) => next();
    mgr.use(existing);
    expect(mgr.insertBefore(existing, toInsert)).toBe(true);
    expect(mgr.getMiddlewares()[0]).toBe(toInsert);
    expect(mgr.getMiddlewares()[1]).toBe(existing);
  });

  it("should insert after a target middleware", () => {
    const mgr = new MiddlewareManager();
    const existing: HttpMiddleware = async (_, next) => next();
    const toInsert: HttpMiddleware = async (_, next) => next();
    mgr.use(existing);
    expect(mgr.insertAfter(existing, toInsert)).toBe(true);
    expect(mgr.getMiddlewares()[0]).toBe(existing);
    expect(mgr.getMiddlewares()[1]).toBe(toInsert);
  });

  it("should return false when target not found for insertBefore", () => {
    const mgr = new MiddlewareManager();
    expect(mgr.insertBefore(async (_, next) => next(), async (_, next) => next())).toBe(false);
  });

  it("should return shallow copy from getMiddlewares", () => {
    const mgr = new MiddlewareManager();
    const mw: HttpMiddleware = async (_, next) => next();
    mgr.use(mw);
    const list = mgr.getMiddlewares();
    list.push(async (_, next) => next());
    expect(mgr.getMiddlewares()).toHaveLength(1);
  });
});
