import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ERROR_CODE } from '../../constants';

export const PERMISSION_KEY = 'permission';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const permissions = user?.permissions || [];

    if (!permissions.includes(requiredPermission)) {
      throw new ForbiddenException({ code: 40302, msg: ERROR_CODE[40302]?.msg || '权限不足' });
    }

    return true;
  }
}
