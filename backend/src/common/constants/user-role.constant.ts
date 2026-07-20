export const USER_ROLE = {
  DEVELOPER: "DEVELOPER",
  CLIENT: "CLIENT",
  ADMIN: "ADMIN"
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];