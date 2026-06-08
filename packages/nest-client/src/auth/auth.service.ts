import { Injectable, Inject, Optional } from "@nestjs/common";
import { createToken, verifyToken, comparePassword, encryptPassword } from "../utils";
import { ACCESS_SECRET, REFRESH_SECRET, TOKEN_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN, SESSION_EXPIRES_IN } from "../constants";
import { RedisService } from "../infrastructure";
import { DatabaseService } from "../infrastructure";
import { NEST_CLIENT_OPTIONS } from "../logger";
import { NestClientOptions } from "../config";
import { randomUUID } from "crypto";
import { AuthResult, JwtPayload, AuthSession } from "./types";

@Injectable()
export class AuthService {
  constructor(
    private redisService: RedisService,
    private databaseService: DatabaseService,
    @Optional() @Inject(NEST_CLIENT_OPTIONS) private options?: NestClientOptions,
  ) {}

  async login(username: string, password: string): Promise<AuthResult> {
    const user = await this.findByUser(username);
    if (!user) return { ok: false, code: 40105 };
    if (user.status !== 1) return { ok: false, code: 40301 };

    const valid = await comparePassword(password, user.pwd);
    if (!valid) return { ok: false, code: 40106 };

    const sid = randomUUID();
    const accessJti = randomUUID();
    const refreshJti = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const accessToken = createToken(
      { uid: user.id, sid, jti: accessJti, type: "access", iat: now },
      ACCESS_SECRET,
      { expiresIn: `${TOKEN_EXPIRES_IN}m` },
    );

    const refreshToken = createToken(
      { uid: user.id, sid, jti: refreshJti, type: "refresh", iat: now },
      REFRESH_SECRET,
      { expiresIn: `${REFRESH_TOKEN_EXPIRES_IN}m` },
    );

    const redis = this.redisService.getClient("fx");
    const sessionTtl = SESSION_EXPIRES_IN * 60;

    const session: AuthSession = {
      uid: user.id,
      refreshJti,
      platform: "unknown",
      iat: now,
      lastRefreshTime: now,
    };
    await redis.set(`auth:session:${sid}`, JSON.stringify(session), "EX", sessionTtl);
    await redis.sadd(`auth:user:${user.id}:sessions`, sid);
    await redis.set(
      `user:login:${user.id}`,
      JSON.stringify({ userId: user.id, enName: user.en_name, roles: [], status: user.status }),
      "EX",
      REFRESH_TOKEN_EXPIRES_IN * 60,
    );

    return { ok: true, data: { accessToken, refreshToken, sid } };
  }

  async verifyAccessToken(token: string): Promise<AuthResult> {
    try {
      const payload = verifyToken(token, ACCESS_SECRET) as JwtPayload;
      if (!payload || payload.type !== "access") return { ok: false, code: 40103 };

      const redis = this.redisService.getClient("fx");
      const sessionRaw = await redis.get(`auth:session:${payload.sid}`);
      if (!sessionRaw) return { ok: false, code: 40104 };

      return { ok: true, payload };
    } catch (err: any) {
      const code = err.name === "TokenExpiredError" ? 40101 : 40103;
      return { ok: false, code };
    }
  }

  async refreshToken(token: string): Promise<AuthResult> {
    let payload: JwtPayload;
    try {
      payload = verifyToken(token, REFRESH_SECRET) as JwtPayload;
    } catch (err: any) {
      const code = err.name === "TokenExpiredError" ? 40102 : 40103;
      return { ok: false, code };
    }

    if (payload.type !== "refresh") return { ok: false, code: 40103 };

    const { uid, sid, jti } = payload;
    const redis = this.redisService.getClient("fx");
    const sessionRaw = await redis.get(`auth:session:${sid}`);
    if (!sessionRaw) return { ok: false, code: 40104 };

    const session: AuthSession = JSON.parse(sessionRaw);
    if (session.refreshJti !== jti) return { ok: false, code: 401 };

    // Use raw redis command for locking
    const locked = await (redis as any).set(`auth:refresh:lock:${sid}`, "1", "NX", "EX", 5);
    if (!locked) return { ok: false, code: 401 };
    try {
      const sessionAfterLockRaw = await redis.get(`auth:session:${sid}`);
      if (!sessionAfterLockRaw) return { ok: false, code: 401 };
      const sessionAfterLock: AuthSession = JSON.parse(sessionAfterLockRaw);
      if (sessionAfterLock.refreshJti !== jti) return { ok: false, code: 401 };

      const now = Math.floor(Date.now() / 1000);
      const newRefreshJti = randomUUID();
      const newAccessJti = randomUUID();

      const newAccessToken = createToken(
        { uid, sid, jti: newAccessJti, type: "access", iat: now },
        ACCESS_SECRET,
        { expiresIn: `${TOKEN_EXPIRES_IN}m` },
      );
      const newRefreshToken = createToken(
        { uid, sid, jti: newRefreshJti, type: "refresh", iat: now },
        REFRESH_SECRET,
        { expiresIn: `${REFRESH_TOKEN_EXPIRES_IN}m` },
      );

      sessionAfterLock.refreshJti = newRefreshJti;
      sessionAfterLock.lastRefreshTime = now;
      await redis.set(`auth:session:${sid}`, JSON.stringify(sessionAfterLock), "EX", SESSION_EXPIRES_IN * 60);

      return { ok: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } };
    } finally {
      await redis.del(`auth:refresh:lock:${sid}`);
    }
  }

  async logout(uid: string | number, sid: string): Promise<void> {
    const redis = this.redisService.getClient("fx");
    await redis.del(`auth:session:${sid}`);
    await redis.srem(`auth:user:${uid}:sessions`, sid);
  }

  async changePassword(uid: string | number, oldPassword: string, newPassword: string): Promise<AuthResult> {
    const db = this.databaseService.getClient("fx");
    const user = await (db as any).user_info.findUnique({ where: { id: uid as any } });
    if (!user) return { ok: false, code: 40105 };

    const valid = await comparePassword(oldPassword, user.pwd);
    if (!valid) return { ok: false, code: 40106 };

    const newHash = encryptPassword(newPassword);
    await (db as any).user_info.update({
      where: { id: uid as any },
      data: { pwd: newHash, update_time: new Date() },
    });

    await this.kickout(uid);
    return { ok: true };
  }

  async findByUser(username: string): Promise<any> {
    const db = this.databaseService.getClient("fx");
    return (db as any).user_info.findFirst({ where: { en_name: username } });
  }

  async findMany(query: any = {}): Promise<any[]> {
    const db = this.databaseService.getClient("fx");
    return (db as any).user_info.findMany(query);
  }

  async updateUserMany(users: Array<{ id: number; [key: string]: any }>): Promise<void> {
    const db = this.databaseService.getClient("fx");
    const dateTime = new Date();
    for (const user of users) {
      const { id, ...data } = user;
      if (!id) continue;
      await (db as any).user_info.update({
        where: { id },
        data: { ...data, update_time: dateTime },
      });
    }
  }

  private async kickout(uid: string | number): Promise<void> {
    const redis = this.redisService.getClient("fx");
    const sids = await redis.smembers(`auth:user:${uid}:sessions`);
    const pipeline = redis.pipeline();
    for (const sid of sids) {
      pipeline.del(`auth:session:${sid}`);
    }
    pipeline.del(`auth:user:${uid}:sessions`);
    await pipeline.exec();
  }
}
