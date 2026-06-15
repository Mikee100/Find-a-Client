import { Module } from "@nestjs/common";
import { MediaModule } from "src/modules/media/media.module";
import { UsersController } from "src/modules/users/users.controller";
import { UsersService } from "src/modules/users/users.service";

@Module({
  imports: [MediaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
