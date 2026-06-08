import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '../../utils';
import { ACCESS_SECRET } from '../../constants';
import { ERROR_CODE } from '../../constants';
import { JwtPayload } from '../types';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否标记为公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException({ code: 401, msg: ERROR_CODE[401]?.msg || '未登录' });
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = verifyToken(token, ACCESS_SECRET) as JwtPayload;
      if (!payload || payload.type !== 'access') {
        throw new UnauthorizedException({ code: 40103, msg: ERROR_CODE[40103]?.msg || '非法TOKEN登录' });
      }
      request.user = {
        uid: payload.uid,
        sid: payload.sid,
        jti: payload.jti,
        type: payload.type,
      };
      return true;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedException({ code: 40101, msg: ERROR_CODE[40101]?.msg || 'access登录已过期' });
      }
      throw new UnauthorizedException({ code: 40103, msg: ERROR_CODE[40103]?.msg || '非法TOKEN登录' });
    }
  }
}
