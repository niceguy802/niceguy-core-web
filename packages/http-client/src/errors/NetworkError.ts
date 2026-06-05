import { BaseError } from "./BaseError";

export class NetworkError extends BaseError {
  constructor(message = "Network Error") {
    super("NETWORK_ERROR", message);
  }
}
