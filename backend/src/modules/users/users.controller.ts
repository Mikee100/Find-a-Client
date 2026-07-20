import { Body, Controller, Get, Param, Put, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser, CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { Public } from "src/common/decorators/public.decorator";
import { mediaUploadMulterOptions } from "src/common/utils/media-upload.util";
import { MediaService } from "src/modules/media/media.service";
import { SearchDevelopersDto } from "src/modules/users/dto/search-developers.dto";
import { UpdateUserDto } from "src/modules/users/dto/update-user.dto";
import { UsersService } from "src/modules/users/users.service";
import { Query } from "@nestjs/common";

interface UploadedAsset {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly mediaService: MediaService
  ) {}

  @Get("me")
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getMe(user.sub);
  }

  @Get("me/completeness")
  getProfileCompleteness(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfileCompleteness(user.sub);
  }

  @Get("me/dashboard")
  getDeveloperDashboard(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getDeveloperDashboard(user.sub);
  }

  @Put("me")
  updateMe(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.sub, dto);
  }

  @UseInterceptors(FileInterceptor("file", mediaUploadMulterOptions))
  @Put("me/avatar")
  async uploadAvatar(@CurrentUser() user: CurrentUserPayload, @UploadedFile() file: UploadedAsset) {
    const upload = await this.mediaService.uploadFile(user.sub, "avatar", file);
    return this.usersService.updateAvatar(user.sub, upload.url);
  }

  @Get("me/saved")
  getSaved(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getSavedProjects(user.sub);
  }

  @Get("me/likes")
  getLikedProjects(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getLikedProjects(user.sub);
  }

  @Get("me/projects")
  getMyProjects(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getMyProjects(user.sub);
  }

  @Public()
  @Get("developers/search")
  searchDevelopers(@Query() query: SearchDevelopersDto) {
    return this.usersService.searchDevelopers(query);
  }

  @Public()
  @Get(":username")
  getByUsername(@Param("username") username: string) {
    return this.usersService.getPublicProfile(username);
  }
}
