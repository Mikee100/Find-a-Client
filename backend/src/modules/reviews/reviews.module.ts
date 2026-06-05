import { Module } from "@nestjs/common";
import { QueueModule } from "src/queue/queue.module";
import { PrismaService } from "src/prisma/prisma.service";
import { ReviewsController } from "src/modules/reviews/reviews.controller";
import { ReviewsService } from "src/modules/reviews/reviews.service";

@Module({
  imports: [QueueModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, PrismaService]
})
export class ReviewsModule {}
