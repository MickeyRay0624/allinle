import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ErrorCodes } from "@allinle/shared";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === "object" && payload && "message" in payload
          ? Array.isArray((payload as { message: unknown }).message)
            ? (payload as { message: string[] }).message.join("; ")
            : String((payload as { message: unknown }).message)
          : exception.message;

      const code =
        typeof payload === "object" && payload && "code" in payload
          ? String((payload as { code: unknown }).code)
          : this.codeFromStatus(status);

      return response.status(status).json({
        success: false,
        message,
        code,
      });
    }

    // Don't leak internal errors in production
    if (process.env.NODE_ENV === "production") {
      console.error("[ApiError]", (exception as Error)?.message);
    } else {
      console.error(exception);
    }

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message:
        process.env.NODE_ENV === "production"
          ? "服务器内部错误"
          : (exception as Error)?.message || "服务器内部错误",
      code: ErrorCodes.INTERNAL_SERVER_ERROR,
    });
  }

  private codeFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: ErrorCodes.BUSINESS_ERROR,
      401: ErrorCodes.AUTH_UNAUTHORIZED,
      403: ErrorCodes.AUTH_FORBIDDEN,
      404: ErrorCodes.RESOURCE_NOT_FOUND,
      409: "CONFLICT",
      429: ErrorCodes.RATE_LIMITED,
    };
    return map[status] || "HTTP_ERROR";
  }
}
