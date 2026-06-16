export const PROJECT_CATEGORY = {
  WEB_APP: "WEB_APP",
  MOBILE_APP: "MOBILE_APP",
  API: "API",
  DESKTOP: "DESKTOP",
  AI_ML: "AI_ML",
  ECOMMERCE: "ECOMMERCE",
  MANAGEMENT_SYSTEM: "MANAGEMENT_SYSTEM",
  OTHER: "OTHER"
} as const;

export type ProjectCategory = (typeof PROJECT_CATEGORY)[keyof typeof PROJECT_CATEGORY];

export const PROJECT_STATUS = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED"
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const PRICING_TYPE = {
  FIXED: "FIXED",
  NEGOTIABLE: "NEGOTIABLE",
  FREE: "FREE",
  CONTACT: "CONTACT"
} as const;

export type PricingType = (typeof PRICING_TYPE)[keyof typeof PRICING_TYPE];

export const NOTIFICATION_TYPE = {
  NEW_MESSAGE: "NEW_MESSAGE",
  NEW_QUESTION: "NEW_QUESTION",
  NEW_REVIEW: "NEW_REVIEW",
  PROJECT_FEATURED: "PROJECT_FEATURED",
  DEAL_INTEREST: "DEAL_INTEREST"
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];