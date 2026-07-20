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
    const service = new MessagesService(
      {} as never,
      { getOrThrow: jest.fn(() => "") } as never,
      { upload: jest.fn() } as never,
      { dispatch: jest.fn() } as never,
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
