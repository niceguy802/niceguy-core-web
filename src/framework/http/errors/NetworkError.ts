// 网络错误（超时、无网络等）
import { BaseError } from './BaseError'

export class NetworkError extends BaseError {
  constructor(message = 'Network Error') {
    super('NETWORK_ERROR', message)
  }
}
