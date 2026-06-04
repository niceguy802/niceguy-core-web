// 用户登录授权错误
import { BaseError } from './BaseError'

export class AuthError extends BaseError {
  constructor(
    message = 'Unauthorized'
  ) {
    super('AUTH_ERROR', message)
  }
}