import { validateMessageAttachmentMetadata } from "src/common/utils/message-attachment-upload.util";

describe("validateMessageAttachmentMetadata", () => {
  it("accepts allowed pdf attachment", () => {
    expect(validateMessageAttachmentMetadata("contract.pdf", "application/pdf")).toBeNull();
  });

  it("accepts allowed image attachment", () => {
    expect(validateMessageAttachmentMetadata("mockup.png", "image/png")).toBeNull();
  });

  it("rejects unsupported attachment type", () => {
    expect(validateMessageAttachmentMetadata("archive.zip", "application/zip")).toBe("Unsupported attachment type");
  });

  it("rejects executable extension", () => {
    expect(validateMessageAttachmentMetadata("tool.exe", "application/pdf")).toBe("Executable and script attachments are not allowed");
  });

  it("rejects mismatched extension", () => {
    expect(validateMessageAttachmentMetadata("notes.txt", "application/pdf")).toBe("Attachment extension does not match MIME type");
  });
});
