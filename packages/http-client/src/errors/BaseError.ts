export class BaseError extends Error {
  code: string;
  success: boolean;

  constructor(code: string, message: string, success = false) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.success = success;
  }
}
