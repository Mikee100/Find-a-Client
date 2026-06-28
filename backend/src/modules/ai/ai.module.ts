import { Module } from "@nestjs/common";
import { UsersModule } from "src/modules/users/users.module";
import { AiController } from "src/modules/ai/ai.controller";
import { AiService } from "src/modules/ai/ai.service";

@Module({
  imports: [UsersModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService]
})
export class AiModule {}
