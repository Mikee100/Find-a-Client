import { Module } from "@nestjs/common";
import { ReviewsController } from "src/modules/reviews/reviews.controller";
import { ReviewsService } from "src/modules/reviews/reviews.service";

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService]
})
export class ReviewsModule {}
