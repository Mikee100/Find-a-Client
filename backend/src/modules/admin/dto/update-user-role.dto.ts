import { IsIn } from "class-validator";
import { USER_ROLE } from "src/common/constants/user-role.constant";

export class UpdateUserRoleDto {
  @IsIn([USER_ROLE.DEVELOPER, USER_ROLE.CLIENT], {
    message: "role must be DEVELOPER or CLIENT."
  })
  role!: "DEVELOPER" | "CLIENT";
}
