import { Module } from "@nestjs/common";
import { QuestionsService } from "src/modules/questions/questions.service";

@Module({
  providers: [QuestionsService],
  exports: [QuestionsService]
})
export class QuestionsModule {}
