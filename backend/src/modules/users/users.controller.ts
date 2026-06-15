import { Body, Controller, Get, Param, Put, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentUser, CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { MediaService } from "src/modules/media/media.service";
import { UpdateUserDto } from "src/modules/users/dto/update-user.dto";
import { UsersService } from "src/modules/users/users.service";

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

  @Get(":username")
  getByUsername(@Param("username") username: string) {
    return this.usersService.getPublicProfile(username);
  }

  @Put("me")
  updateMe(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.sub, dto);
  }

  @UseInterceptors(FileInterceptor("file"))
  @Put("me/avatar")
  async uploadAvatar(@CurrentUser() user: CurrentUserPayload, @UploadedFile() file: UploadedAsset) {
    const upload = await this.mediaService.uploadFile(user.sub, "avatar", file);
    return this.usersService.updateAvatar(user.sub, upload.url);
  }

  @Get("me/saved")
  getSaved(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getSavedProjects(user.sub);
  }
}
