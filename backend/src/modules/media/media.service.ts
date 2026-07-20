import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CloudinaryService } from "src/modules/media/cloudinary.service";

interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

type UploadMediaType = "IMAGE" | "VIDEO" | "SCREENSHOT" | "THUMBNAIL";

@Injectable()
export class MediaService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Uploads media and stores metadata record when project context exists.
   */
  async uploadFile(
    userId: string,
    projectId: string,
    file: UploadFile,
    mediaType?: UploadMediaType,
    caption?: string
  ) {
    const mime = file.mimetype;
    const isImage = ["image/jpeg", "image/png", "image/webp"].includes(mime);
    const isVideo = ["video/mp4", "video/webm", "video/quicktime"].includes(mime);

    if (!isImage && !isVideo) {
      throw new BadRequestException("Unsupported file type");
    }

    if (isImage && file.size > 5 * 1024 * 1024) {
      throw new BadRequestException("Image file too large");
    }

    if (isVideo && file.size > 100 * 1024 * 1024) {
      throw new BadRequestException("Video file too large");
    }

    if (mediaType === "VIDEO" && !isVideo) {
      throw new BadRequestException("Media type VIDEO requires a supported video file");
    }

    if ((mediaType === "THUMBNAIL" || mediaType === "SCREENSHOT" || mediaType === "IMAGE") && !isImage) {
      throw new BadRequestException("Selected media type requires an image file");
    }

    const folder = `devshowcase/${userId}/${projectId}`;
    const upload = await this.cloudinaryService.upload(file.buffer, folder, isVideo ? "video" : "image");

    const isAvatarUpload = projectId === "avatar";
    const isGeneralUpload = projectId === "general";
    const isProjectScopedUpload = !isAvatarUpload && !isGeneralUpload;

    if (isProjectScopedUpload) {
      const project = await this.prisma.project.findUnique({ where: { id: projectId } });
      if (!project || project.deletedAt) {
        throw new NotFoundException("Project not found");
      }

      if (project.authorId !== userId) {
        throw new ForbiddenException("Not project owner");
      }

      if (mediaType === "THUMBNAIL") {
        await this.prisma.project.update({
          where: { id: projectId },
          data: { thumbnailUrl: upload.secure_url }
        });
      } else {
        const resolvedMediaType: "IMAGE" | "VIDEO" | "SCREENSHOT" =
          mediaType === "SCREENSHOT" ? "SCREENSHOT" : mediaType === "VIDEO" ? "VIDEO" : isVideo ? "VIDEO" : "IMAGE";

        await this.prisma.projectMedia.create({
          data: {
            projectId,
            type: resolvedMediaType,
            url: upload.secure_url,
            caption: caption?.trim() || file.originalname,
            order: 0
          }
        });

        if (resolvedMediaType === "VIDEO") {
          await this.prisma.project.update({
            where: { id: projectId },
            data: { videoUrl: upload.secure_url }
          });
        }
      }
    }

    return {
      publicId: upload.public_id,
      url: upload.secure_url,
      type: mediaType ?? (isVideo ? "VIDEO" : "IMAGE"),
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
