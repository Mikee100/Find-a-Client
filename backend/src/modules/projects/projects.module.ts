import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { QuestionsModule } from "src/modules/questions/questions.module";
import { QuestionsService } from "src/modules/questions/questions.service";
import { ProjectsController } from "src/modules/projects/projects.controller";
import { ProjectsService } from "src/modules/projects/projects.service";

@Module({
  imports: [QuestionsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, QuestionsService, PrismaService],
  exports: [ProjectsService]
})
export class ProjectsModule {}
