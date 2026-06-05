import { QuestionsService } from "src/modules/questions/questions.service";

describe("QuestionsService", () => {
  it("should be defined", () => {
    const service = new QuestionsService({} as never);
    expect(service).toBeDefined();
  });
});
