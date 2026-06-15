import { Controller, Get, Query } from "@nestjs/common";
import { SearchService } from "src/modules/search/search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  run(@Query("q") q?: string, @Query("category") category?: string, @Query("tech") tech?: string) {
    return this.searchService.search({ q, category, tech });
  }
}
