import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { SearchController } from "src/modules/search/search.controller";
import { SearchService } from "src/modules/search/search.service";

@Module({
  controllers: [SearchController],
  providers: [SearchService, PrismaService]
})
export class SearchModule {}
