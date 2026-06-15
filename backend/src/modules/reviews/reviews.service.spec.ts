import { ReviewsService } from "src/modules/reviews/reviews.service";

describe("ReviewsService", () => {
  it("should be defined", () => {
    const service = new ReviewsService({} as never);
    expect(service).toBeDefined();
  });
});
