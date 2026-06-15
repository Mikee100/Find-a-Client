import { Module } from "@nestjs/common";
import { SearchController } from "src/modules/search/search.controller";
import { SearchService } from "src/modules/search/search.service";

@Module({
  controllers: [SearchController],
  providers: [SearchService]
})
export class SearchModule {}
