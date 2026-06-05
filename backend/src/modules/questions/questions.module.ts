import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { QuestionsService } from "src/modules/questions/questions.service";

@Module({
  providers: [QuestionsService, PrismaService],
  exports: [QuestionsService]
})
export class QuestionsModule {}
