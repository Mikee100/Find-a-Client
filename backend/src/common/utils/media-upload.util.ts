import { BadRequestException } from "@nestjs/common";
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { extname } from "path";

const ALLOWED_MEDIA_MIME_TO_EXTENSIONS: Partial<Record<string, string[]>> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"]
};

const BLOCKED_EXTENSIONS = new Set<string>([
  ".exe",
  ".msi",
  ".bat",
  ".cmd",
  ".com",
  ".scr",
  ".pif",
  ".jar",
  ".ps1",
  ".sh",
  ".bash",
  ".zsh",
  ".apk",
  ".ipa",
  ".app",
  ".deb",
  ".rpm"
]);

export const MEDIA_UPLOAD_MAX_BYTES = 100 * 1024 * 1024;

export function validateMediaUploadMetadata(originalName: string, mimeType: string): string | null {
  if (!mimeType) {
    return "Unsupported file type";
  }

  const allowedExtensions = ALLOWED_MEDIA_MIME_TO_EXTENSIONS[mimeType];
  if (!allowedExtensions) {
    return "Unsupported file type";
  }

  const extension = extname(originalName).toLowerCase();
  if (!extension) {
    return "File extension is required";
  }

  if (BLOCKED_EXTENSIONS.has(extension)) {
    return "Executable and script files are not allowed";
  }

  if (!allowedExtensions.includes(extension)) {
    return "File extension does not match MIME type";
  }

  return null;
}

export const mediaUploadMulterOptions: MulterOptions = {
  limits: {
    fileSize: MEDIA_UPLOAD_MAX_BYTES,
    files: 1
  },
  fileFilter: (_request, file, callback) => {
    const error = validateMediaUploadMetadata(file.originalname, file.mimetype);
    if (error) {
      callback(new BadRequestException(error), false);
      return;
    }

    callback(null, true);
  }
};
