import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CloudinaryService } from "src/modules/media/cloudinary.service";

interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Uploads media and stores metadata record when project context exists.
   */
  async uploadFile(userId: string, projectId: string, file: UploadFile) {
    const mime = file.mimetype;
    const isImage = ["image/jpeg", "image/png", "image/webp"].includes(mime);
    const isVideo = mime === "video/mp4";

    if (!isImage && !isVideo) {
      throw new BadRequestException("Unsupported file type");
    }

    if (isImage && file.size > 5 * 1024 * 1024) {
      throw new BadRequestException("Image file too large");
    }

    if (isVideo && file.size > 100 * 1024 * 1024) {
      throw new BadRequestException("Video file too large");
    }

    const folder = `devshowcase/${userId}/${projectId}`;
    const upload = await this.cloudinaryService.upload(file.buffer, folder, isVideo ? "video" : "image");

    if (projectId !== "avatar") {
      await this.prisma.projectMedia.create({
        data: {
          projectId,
          type: isVideo ? "VIDEO" : "IMAGE",
          url: upload.secure_url,
          caption: file.originalname,
          order: 0
        }
      });
    }

    return {
      publicId: upload.public_id,
      url: upload.secure_url,
      type: isVideo ? "VIDEO" : "IMAGE",
      width: upload.width,
      height: upload.height,
      duration: upload.duration
    };
  }

  /**
   * Deletes Cloudinary asset and optional database row.
   */
  async deleteByPublicId(publicId: string): Promise<{ deleted: true }> {
    await this.cloudinaryService.delete(publicId);
    return { deleted: true };
  }
}
