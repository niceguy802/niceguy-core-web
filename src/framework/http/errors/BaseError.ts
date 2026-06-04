// 基础错误类
export class BaseError extends Error {
  code: string
  success: boolean

  constructor(
    code: string,
    message: string,
    success: boolean = false
  ) {
    super(message)

    this.name = this.constructor.name
    this.code = code
    this.success = success
  }
}