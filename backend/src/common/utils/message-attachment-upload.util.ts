import { BadRequestException } from "@nestjs/common";
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";
import { extname } from "path";

const ALLOWED_ATTACHMENT_MIME_TO_EXTENSIONS: Partial<Record<string, string[]>> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
  "text/plain": [".txt"]
};

const BLOCKED_ATTACHMENT_EXTENSIONS = new Set<string>([
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

export const MESSAGE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export function validateMessageAttachmentMetadata(originalName: string, mimeType: string): string | null {
  if (!mimeType) {
    return "Unsupported attachment type";
  }

  const allowedExtensions = ALLOWED_ATTACHMENT_MIME_TO_EXTENSIONS[mimeType];
  if (!allowedExtensions) {
    return "Unsupported attachment type";
  }

  const extension = extname(originalName).toLowerCase();
  if (!extension) {
    return "Attachment extension is required";
  }

  if (BLOCKED_ATTACHMENT_EXTENSIONS.has(extension)) {
    return "Executable and script attachments are not allowed";
  }

  if (!allowedExtensions.includes(extension)) {
    return "Attachment extension does not match MIME type";
  }

  return null;
}

export const messageAttachmentMulterOptions: MulterOptions = {
  limits: {
    fileSize: MESSAGE_ATTACHMENT_MAX_BYTES,
    files: 1
  },
  fileFilter: (_request, file, callback) => {
    const error = validateMessageAttachmentMetadata(file.originalname, file.mimetype);
    if (error) {
      callback(new BadRequestException(error), false);
      return;
    }

    callback(null, true);
  }
};
