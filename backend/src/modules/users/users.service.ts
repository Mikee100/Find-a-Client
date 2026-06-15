import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateUserDto } from "src/modules/users/dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns public profile with published projects.
   */
  async getPublicProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        projects: {
          where: { status: "PUBLISHED", deletedAt: null },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  /**
   * Updates current authenticated user profile.
   */
  async updateMe(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto
    });
  }

  /**
   * Updates avatar URL after successful media upload.
   */
  async updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl }
    });
  }

  /**
   * Lists bookmarked projects for a user.
   */
  async getSavedProjects(userId: string) {
    return this.prisma.saved.findMany({
      where: { userId },
      include: { project: true },
      orderBy: { createdAt: "desc" }
    });
  }
}
