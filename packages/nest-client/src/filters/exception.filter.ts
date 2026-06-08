import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ERROR_CODE, CODE } from "../constants";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = CODE.SERVER_ERROR as number;
    let message = ERROR_CODE[500]?.msg || "服务器错误";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === "string" ? res : (res as any).message || message;
      code = status;
    } else if (exception instanceof Error) {
      message = exception.message;
      if ((exception as any).code) {
        code = (exception as any).code as number;
      }
    }

    response.status(status).json({
      code,
      success: false,
      msg: message,
      data: null,
    });
  }
}
