import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ErrorCodes } from "@allinle/shared";

@Injectable()
export class JwtAdminGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      ip?: string;
      user?: {
        id: string;
        type: string;
        username: string;
        role: string;
      };
    }>();
    const token = this.extractToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException({
        message: "缺少管理员登录态",
        code: ErrorCodes.AUTH_UNAUTHORIZED,
      });
    }

    try {
      const payload = this.jwtService.verify<{
        sub: string;
        username: string;
        type: string;
        role: string;
        exp: number;
      }>(token, {
        secret:
          process.env.ADMIN_JWT_SECRET ||
          process.env.JWT_SECRET ||
          "dev-only-change-me",
      });

      if (payload.type !== "ADMIN") {
        throw new UnauthorizedException({
          message: "请使用管理员账号登录",
          code: ErrorCodes.AUTH_UNAUTHORIZED,
        });
      }

      request.user = {
        id: payload.sub,
        type: payload.type,
        username: payload.username,
        role: payload.role,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      const msg =
        error instanceof Error && error.name === "TokenExpiredError"
          ? "登录已过期，请重新登录"
          : "管理员登录态无效";
      const code =
        error instanceof Error && error.name === "TokenExpiredError"
          ? ErrorCodes.AUTH_TOKEN_EXPIRED
          : ErrorCodes.AUTH_UNAUTHORIZED;
      throw new UnauthorizedException({ message: msg, code });
    }
  }

  private extractToken(authorization?: string): string | undefined {
    if (!authorization) return undefined;
    const [type, token] = authorization.split(" ");
    return type === "Bearer" ? token : undefined;
  }
}
