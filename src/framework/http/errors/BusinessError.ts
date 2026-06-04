import { BaseError } from './BaseError'

export class BusinessError extends BaseError {
  constructor(
    code: string,
    message: string
  ) {
    super(code, message)
  }
}