import { Module, Global } from "@nestjs/common";
import { AuthPublicController, AuthProtectedController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { PermissionGuard } from "./guards/permission.guard";

@Global()
@Module({
  controllers: [AuthPublicController, AuthProtectedController],
  providers: [AuthService, JwtAuthGuard, PermissionGuard],
  exports: [AuthService, JwtAuthGuard, PermissionGuard],
})
export class AuthModule {}

export { AuthService } from "./auth.service";
export { JwtAuthGuard, PermissionGuard, IS_PUBLIC_KEY, PERMISSION_KEY } from "./guards";
export * from "./types";
