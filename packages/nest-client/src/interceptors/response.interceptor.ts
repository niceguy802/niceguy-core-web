import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CODE } from '../constants';

export interface ApiResponse<T = any> {
  code: number;
  success: boolean;
  msg: string;
  data: T;
}

export interface ApiPageResponse<T = any> extends ApiResponse<{ list: T[]; total: number }> {}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // 如果返回值已经是 ApiResponse 格式，直接透传
        if (data && typeof data === 'object' && 'code' in data && 'success' in data) {
          return data;
        }
        return {
          code: CODE.SUCCESS,
          success: true,
          msg: '操作成功',
          data: data ?? null,
        };
      }),
    );
  }
}
