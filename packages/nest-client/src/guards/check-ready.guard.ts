import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * 系统初始化状态检查守卫
 * 对应 egg-client 的 check_ready middleware
 */
@Injectable()
export class CheckReadyGuard implements CanActivate {
  private ready = false;

  setReady(value: boolean) {
    this.ready = value;
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    if (!this.ready) {
      return false;
    }
    return true;
  }
}
