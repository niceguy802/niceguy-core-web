import { Controller, Post, Body, Req, Res, UseGuards, HttpCode } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { ERROR_CODE, SESSION_COOKIE_NAME, REFRESH_TOKEN_EXPIRES_IN } from "../constants";
import { Response } from "express";
import { AuthenticatedRequest } from "./types";

@Controller("/api/public/auth")
export class AuthPublicController {
  constructor(private authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: { username: string; password: string }, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(body.username, body.password);
    if (!result.ok) {
      return { code: result.code, success: false, msg: ERROR_CODE[result.code!]?.msg || "操作失败", data: null };
    }

    const maxAge = REFRESH_TOKEN_EXPIRES_IN * 60 * 1000;
    res.cookie(SESSION_COOKIE_NAME, result.data.refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge,
    });

    return { code: 0, success: true, msg: "登录成功", data: { accessToken: result.data.accessToken } };
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    const token = (req as any).cookies?.[SESSION_COOKIE_NAME];
    if (!token) {
      return { code: 401, success: false, msg: ERROR_CODE[401]?.msg || "未登录", data: null };
    }

    const result = await this.authService.refreshToken(token);
    if (!result.ok) {
      res.cookie(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
      return { code: result.code, success: false, msg: ERROR_CODE[result.code!]?.msg || "操作失败", data: null };
    }

    const maxAge = REFRESH_TOKEN_EXPIRES_IN * 60 * 1000;
    res.cookie(SESSION_COOKIE_NAME, result.data.refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge,
    });

    return { code: 0, success: true, msg: "刷新成功", data: { accessToken: result.data.accessToken } };
  }
}

@Controller("/api/auth")
export class AuthProtectedController {
  constructor(private authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(200)
  async logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
    const { uid, sid } = req.user!;
    await this.authService.logout(uid, sid);
    res.cookie(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return { code: 0, success: true, msg: "登出成功", data: null };
  }

  @UseGuards(JwtAuthGuard)
  @Post("changePassword")
  @HttpCode(200)
  async changePassword(@Req() req: AuthenticatedRequest, @Body() body: { oldPassword: string; newPassword: string }) {
    const { uid } = req.user!;
    const result = await this.authService.changePassword(uid, body.oldPassword, body.newPassword);
    if (!result.ok) {
      return { code: result.code, success: false, msg: ERROR_CODE[result.code!]?.msg || "操作失败", data: null };
    }
    return { code: 0, success: true, msg: "密码修改成功", data: null };
  }
}
