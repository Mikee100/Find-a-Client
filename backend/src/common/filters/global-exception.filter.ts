import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, code } = this.resolveException(exception);

    const logLine = `${request.method} ${request.url} -> ${status}: ${message}`;
    if (status >= 500) {
      this.logger.error(logLine);
    } else {
      this.logger.warn(logLine);
    }
    if (!(exception instanceof HttpException) && exception instanceof Error) {
      this.logger.error(exception.stack ?? exception.message);
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message
      }
    });
  }

  private resolveException(exception: unknown): { status: number; message: string; code: string } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        message: exception.message,
        code: HttpStatus[status] ?? "ERROR"
      };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: "Database is temporarily unavailable. Please try again.",
        code: "DATABASE_UNAVAILABLE"
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError && (exception.code === "P1001" || exception.code === "P1002")) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: "Database is temporarily unavailable. Please try again.",
        code: "DATABASE_UNAVAILABLE"
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    };
  }
}
