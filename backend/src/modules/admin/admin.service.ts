import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRole } from "@prisma/client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ApiPerformanceService } from "src/common/performance/api-performance.service";
import { UpdateUserAccessDto } from "src/modules/admin/dto/update-user-access.dto";
import { UpdateUserPasswordDto } from "src/modules/admin/dto/update-user-password.dto";
import { UpdateUserRoleDto } from "src/modules/admin/dto/update-user-role.dto";
import { UpdateUserVerificationDto } from "src/modules/admin/dto/update-user-verification.dto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class AdminService {
  private readonly supabaseAdmin: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly apiPerformanceService: ApiPerformanceService
  ) {
    this.supabaseAdmin = createClient(
      this.configService.getOrThrow<string>("SUPABASE_URL"),
      this.configService.getOrThrow<string>("SUPABASE_SERVICE_ROLE_KEY")
    );
  }

  performanceSummary() {
    return this.apiPerformanceService.getSummary();
  }

  performanceRoutes() {
    return this.apiPerformanceService.getRouteMetrics();
  }

  async usersOverview() {
    const [developers, clients] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: UserRole.DEVELOPER },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          title: true,
          role: true,
          location: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              projects: true
            }
          }
        }
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.CLIENT },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          location: true,
          isVerified: true,
          createdAt: true,
          _count: {
            select: {
              sentHireRequests: true
            }
          }
        }
      })
    ]);

    return {
      developers: developers.map((user) => ({
        id: user.id,
        role: user.role,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        title: user.title,
        location: user.location,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        projectsCount: user._count.projects
      })),
      clients: clients.map((user) => ({
        id: user.id,
        role: user.role,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        location: user.location,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        hireRequestsCount: user._count.sentHireRequests
      }))
    };
  }

  async userDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        title: true,
        role: true,
        location: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
            sentHireRequests: true,
            receivedHireRequests: true,
            sentMessages: true
          }
        }
      }
    });

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    const accountState = await this.readSupabaseAccountState(user.id);

    return {
      ...user,
      counts: {
        projects: user._count.projects,
        sentHireRequests: user._count.sentHireRequests,
        receivedHireRequests: user._count.receivedHireRequests,
        sentMessages: user._count.sentMessages
      },
      accountState
    };
  }

  async setUserAccess(userId: string, dto: UpdateUserAccessDto) {
    await this.ensureUserExists(userId);

    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: dto.disabled ? "876000h" : "none"
    });

    if (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }

    if (dto.disabled) {
      await this.prisma.refreshSession.deleteMany({ where: { userId } });
    }

    return this.userDetails(userId);
  }

  async setUserPassword(userId: string, dto: UpdateUserPasswordDto) {
    await this.ensureUserExists(userId);
    this.assertStrongPassword(dto.newPassword);

    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(userId, {
      password: dto.newPassword
    });

    if (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }

    await this.prisma.refreshSession.deleteMany({ where: { userId } });

    return this.userDetails(userId);
  }

  async setUserRole(userId: string, dto: UpdateUserRoleDto) {
    const user = await this.ensureUserExists(userId);

    if (user.role === UserRole.ADMIN) {
      throw new HttpException("Admin accounts cannot be re-assigned from this panel.", HttpStatus.BAD_REQUEST);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role }
    });

    const { error } = await this.supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        role: dto.role,
        username: user.username,
        fullName: user.fullName
      }
    });

    if (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }

    await this.prisma.refreshSession.deleteMany({ where: { userId } });

    return this.userDetails(userId);
  }

  async setUserVerification(userId: string, dto: UpdateUserVerificationDto) {
    await this.ensureUserExists(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: dto.isVerified }
    });

    return this.userDetails(userId);
  }

  /**
   * Lists pending moderation projects.
   */
  async moderationQueue() {
    return this.prisma.project.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Toggles project featured status.
   */
  async setFeatured(projectId: string, isFeatured: boolean) {
    return this.prisma.project.update({ where: { id: projectId }, data: { isFeatured } });
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, username: true, fullName: true }
    });

    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND);
    }

    return user;
  }

  private async readSupabaseAccountState(userId: string): Promise<{ disabled: boolean; bannedUntil: string | null; lastSignInAt: string | null }> {
    const { data, error } = await this.supabaseAdmin.auth.admin.getUserById(userId);

    if (error || !data.user) {
      return {
        disabled: false,
        bannedUntil: null,
        lastSignInAt: null
      };
    }

    const bannedUntil = data.user.banned_until ?? null;
    const disabled = Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());

    return {
      disabled,
      bannedUntil,
      lastSignInAt: data.user.last_sign_in_at ?? null
    };
  }

  private assertStrongPassword(value: string) {
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    if (!hasUpper || !hasLower || !hasNumber) {
      throw new HttpException(
        "Password must include uppercase, lowercase, and number characters.",
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
