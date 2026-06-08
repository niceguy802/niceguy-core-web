import { sign, verify, SignOptions } from 'jsonwebtoken';

/** 生成 JWT token */
export function createToken(
  payload: string | Buffer | object,
  secret: string,
  options: SignOptions = {},
): string {
  return sign(payload, secret, options);
}

/** 验证 JWT token */
export function verifyToken(token: string, secret: string): any {
  return verify(token, secret);
}
