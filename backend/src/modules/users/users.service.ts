import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateUserDto } from "src/modules/users/dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        bio: true,
        skills: true,
        location: true,
        contactEmail: true,
        phoneNumber: true,
        websiteUrl: true,
        githubUrl: true,
        linkedinUrl: true
      }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

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

  /**
   * Lists projects created by current authenticated user.
   */
  async getMyProjects(userId: string) {
    return this.prisma.project.findMany({
      where: {
        authorId: userId,
        deletedAt: null
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        category: true,
        status: true,
        techStack: true,
        likeCount: true,
        viewCount: true,
        thumbnailUrl: true,
        backgroundUrl: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
}
