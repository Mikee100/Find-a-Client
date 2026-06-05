import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { QueueModule } from "src/queue/queue.module";
import { CloudinaryService } from "src/modules/media/cloudinary.service";
import { MediaController } from "src/modules/media/media.controller";
import { MediaService } from "src/modules/media/media.service";

@Module({
  imports: [QueueModule],
  controllers: [MediaController],
  providers: [MediaService, CloudinaryService, PrismaService],
  exports: [MediaService, CloudinaryService]
})
export class MediaModule {}
