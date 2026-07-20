import { ProjectsService } from "src/modules/projects/projects.service";

describe("ProjectsService", () => {
  it("should be defined", () => {
    const service = new ProjectsService(
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
