import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof HttpException ? exception.message : "Internal server error";

    this.logger.error(`${request.method} ${request.url} -> ${status}: ${message}`);
    if (!(exception instanceof HttpException) && exception instanceof Error) {
      this.logger.error(exception.stack ?? exception.message);
    }

    response.status(status).json({
      success: false,
      error: {
        code: HttpStatus[status] ?? "ERROR",
        message
      }
    });
  }
}
