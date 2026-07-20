export const PLATFORM_FEE_RATE = 0.1;

export function calculatePlatformFee(amount: number): number {
  return Number((amount * PLATFORM_FEE_RATE).toFixed(2));
}
