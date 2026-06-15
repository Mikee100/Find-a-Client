import { MessagesService } from "src/modules/messages/messages.service";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    channel: jest.fn(() => ({
      send: jest.fn()
    }))
  }))
}));

describe("MessagesService", () => {
  it("should be defined", () => {
    const service = new MessagesService({} as never, { getOrThrow: jest.fn(() => "") } as never);
    expect(service).toBeDefined();
  });
});
