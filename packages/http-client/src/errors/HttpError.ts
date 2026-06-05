import { BaseError } from "./BaseError";

export class HttpError extends BaseError {
  status: number;

  constructor(status: number, message: string) {
    super("HTTP_ERROR", message);
    this.status = status;
  }
}
