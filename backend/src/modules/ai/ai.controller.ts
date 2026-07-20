import { Body, Controller, Post } from "@nestjs/common";
import { CurrentUser, CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { AiClientMatchDto } from "src/modules/ai/dto/ai-client-match.dto";
import { AiProposalTemplateDto } from "src/modules/ai/dto/ai-proposal-template.dto";
import { AiService } from "src/modules/ai/ai.service";

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("match/client-to-developers")
  matchClientToDevelopers(@CurrentUser() user: CurrentUserPayload, @Body() dto: AiClientMatchDto) {
    return this.aiService.matchClientToDevelopers(user, dto);
  }

  @Post("match/profile-improvements")
  getProfileImprovements(@CurrentUser() user: CurrentUserPayload) {
    return this.aiService.getProfileImprovements(user.sub);
  }

  @Post("assist/proposal-template")
  generateProposalTemplate(@CurrentUser() user: CurrentUserPayload, @Body() dto: AiProposalTemplateDto) {
    return this.aiService.generateProposalTemplate(user.sub, dto);
  }
}
