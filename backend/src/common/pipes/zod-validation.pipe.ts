import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown): unknown {
    return value;
  }

  static throwValidationError(message: string): never {
    throw new BadRequestException({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message
      }
    });
  }
}
