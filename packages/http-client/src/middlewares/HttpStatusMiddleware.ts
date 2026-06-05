import type { HttpContext, HttpMiddleware } from "../types";
import { AuthError, HttpError } from "../errors";

export const HttpStatusMiddleware: HttpMiddleware = async (
  ctx: HttpContext,
  next: () => Promise<void>
) => {
  await next();

  const status = ctx.response?.status;

  switch (status) {
    case 401:
      throw new AuthError();
    case 403:
      throw new HttpError(403, "Forbidden");
    case 404:
      throw new HttpError(404, "Not Found");
    case 500:
      throw new HttpError(500, "Internal Server Error");
    case 502:
      throw new HttpError(502, "Bad Gateway");
    case 503:
      throw new HttpError(503, "Service Unavailable");
    default:
      if (status && status >= 400) {
        throw new HttpError(status, `HTTP Error ${status}`);
      }
  }
};
