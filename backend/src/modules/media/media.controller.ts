import { Controller, Delete, Param, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser, CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { MediaService } from "src/modules/media/media.service";

interface UploadedAsset {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post("upload")
  @Throttle({ default: { limit: 20, ttl: 60 * 60 * 1000 } })
  @UseInterceptors(FileInterceptor("file"))
  upload(@CurrentUser() user: CurrentUserPayload, @UploadedFile() file: UploadedAsset) {
    return this.mediaService.uploadFile(user.sub, "general", file);
  }

  @Delete(":publicId")
  delete(@Param("publicId") publicId: string) {
    return this.mediaService.deleteByPublicId(publicId);
  }
}
