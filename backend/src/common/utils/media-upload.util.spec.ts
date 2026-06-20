import { validateMediaUploadMetadata } from "src/common/utils/media-upload.util";

describe("validateMediaUploadMetadata", () => {
  it("accepts allowed image mime and extension", () => {
    expect(validateMediaUploadMetadata("portfolio-image.webp", "image/webp")).toBeNull();
  });

  it("accepts allowed video mime and extension", () => {
    expect(validateMediaUploadMetadata("walkthrough.mp4", "video/mp4")).toBeNull();
  });

  it("rejects unsupported mime type", () => {
    expect(validateMediaUploadMetadata("contract.pdf", "application/pdf")).toBe("Unsupported file type");
  });

  it("rejects files without extension", () => {
    expect(validateMediaUploadMetadata("image", "image/png")).toBe("File extension is required");
  });

  it("rejects executable extension even if mime is spoofed", () => {
    expect(validateMediaUploadMetadata("installer.exe", "image/png")).toBe("Executable and script files are not allowed");
  });

  it("rejects mismatched mime and extension combinations", () => {
    expect(validateMediaUploadMetadata("preview.png", "video/mp4")).toBe("File extension does not match MIME type");
  });
});
