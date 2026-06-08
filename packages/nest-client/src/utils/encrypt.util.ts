import * as bcrypt from 'bcrypt';
import { SALT_ROUNDS } from '../constants';

/** 密码是否已加密（bcrypt 哈希格式） */
export function isEncrypted(password: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(password);
}

/** 密码加密（如果已加密则原样返回） */
export function encryptPassword(password: string): string {
  if (isEncrypted(password)) return password;
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/** 校验密码 */
export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
