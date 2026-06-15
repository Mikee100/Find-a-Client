import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UploadApiResponse, v2 as cloudinary } from "cloudinary";

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>("CLOUDINARY_CLOUD_NAME"),
      api_key: this.configService.getOrThrow<string>("CLOUDINARY_API_KEY"),
      api_secret: this.configService.getOrThrow<string>("CLOUDINARY_API_SECRET")
    });
  }

  /**
   * Uploads a file buffer to Cloudinary and returns metadata.
   */
  async upload(buffer: Buffer, folder: string, resourceType: "image" | "video"): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder, resource_type: resourceType }, (error, result) => {
        if (error || !result) {
          reject(error);
          return;
        }
        resolve(result);
      });
      stream.end(buffer);
    });
  }

  /**
   * Deletes an asset by public identifier.
   */
  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  }

  /**
   * Creates a signed URL for secure media rendering.
   */
  signedUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      secure: true,
      sign_url: true
    });
  }
}
