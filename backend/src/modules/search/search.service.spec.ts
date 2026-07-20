import { SearchService } from "src/modules/search/search.service";

describe("SearchService", () => {
  it("should be defined", () => {
    const service = new SearchService(
      {} as never,
      {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        composeKey: jest.fn(),
        invalidateNamespace: jest.fn()
      } as never
    );
    expect(service).toBeDefined();
  });
});
