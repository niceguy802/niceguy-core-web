/** 认证相关类型定义 */
import { Request } from 'express';

export interface JwtPayload {
  uid: string | number;
  sid: string;
  jti: string;
  type: 'access' | 'refresh';
  iat: number;
  exp?: number;
}

export interface AuthSession {
  uid: string | number;
  refreshJti: string;
  platform: string;
  iat: number;
  lastRefreshTime: number;
}

export interface UserCache {
  userId: string | number;
  enName: string;
  roles: string[];
  status: number;
}

export interface AuthResult {
  ok: boolean;
  code?: number;
  data?: any;
  payload?: JwtPayload;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string | number;
    sid: string;
    jti: string;
    type: string;
  };
}
