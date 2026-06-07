  it("should refresh token on BusinessError 40101 and retry (memory mode)", async () => {
    const ctx = createCtx();
    const refreshFn = vi.fn(async () => "new-token");
    const successFn = vi.fn();

    const mw = createRefreshTokenMiddleware({
      getRefreshToken: () => null,
      refreshToken: refreshFn,
      onRefreshSuccess: successFn,
      cookieModeRefresh: true,
    });

    let callCount = 0;
    await mw(ctx, async () => {
      callCount++;
      if (callCount === 1) throw new BusinessError("40101", "token过期");
    });

    expect(refreshFn).toHaveBeenCalledOnce();
    expect(successFn).toHaveBeenCalledWith("new-token");
    expect(ctx.config.headers?.Authorization).toBe("Bearer new-token");
    expect(callCount).toBe(2);
  });

  it("should call triggerReLogin when retry fails after 40101 refresh", async () => {
    const ctx = createCtx();
    const refreshFn = vi.fn(async () => "new-token");
    const onRefreshError = vi.fn();
    const onReLogin = vi.fn();

    const mw = createRefreshTokenMiddleware({
      getRefreshToken: () => null,
      refreshToken: refreshFn,
      onRefreshSuccess: successFn,
      onRefreshError,
      onReLogin,
      cookieModeRefresh: true,
    });

    let callCount = 0;
    await expect(
      mw(ctx, async () => {
        callCount++;
        if (callCount <= 2) throw new BusinessError("40101", "token过期");
      })
    ).rejects.toThrow(BusinessError);

    expect(refreshFn).toHaveBeenCalledOnce();
    expect(onRefreshError).toHaveBeenCalled();
    expect(onReLogin).toHaveBeenCalled();
  });
