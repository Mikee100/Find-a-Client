import { MediaService } from "src/modules/media/media.service";

describe("MediaService", () => {
  it("should be defined", () => {
    const service = new MediaService({} as never, {} as never);
    expect(service).toBeDefined();
  });
});
