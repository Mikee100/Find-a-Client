import { SearchService } from "src/modules/search/search.service";

describe("SearchService", () => {
  it("should be defined", () => {
    const service = new SearchService({} as never);
    expect(service).toBeDefined();
  });
});
