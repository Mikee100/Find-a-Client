import { Module } from "@nestjs/common";
import { CloudinaryService } from "src/modules/media/cloudinary.service";
import { MediaController } from "src/modules/media/media.controller";
import { MediaService } from "src/modules/media/media.service";

@Module({
  controllers: [MediaController],
  providers: [MediaService, CloudinaryService],
  exports: [MediaService, CloudinaryService]
})
export class MediaModule {}
