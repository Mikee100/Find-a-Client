/**
 * ─── ENGINE INTERFACE CONTRACTS ────────────────────────────────────────────────
 *
 * Every platform engine exposes a typed interface.
 * Verticals configure engines — they never implement them.
 * The Sales Engine is the orchestrator that delegates to all others.
 */

// ── Shared primitives ──────────────────────────────────────────────────────────

export type ChannelType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'ONLINE' | 'POS';
export type StockAdjustReason = 'SALE' | 'WASTE' | 'TRANSFER' | 'DAMAGE' | 'RECIPE' | 'COUNT';

// ── Pricing Engine ─────────────────────────────────────────────────────────────

export interface IPricingContext {
  entityId: string;
  tenantId: string;
  branchId: string;
  variantId?: string;
  channelType: ChannelType;
  timestamp: Date;
  customerId?: string; // for loyalty-tier pricing
}

export interface IPriceResult {
  basePrice: number;
  finalPrice: number;
  discountApplied: number;
  discountReason?: string; // 'HAPPY_HOUR' | 'MARKDOWN' | 'LOYALTY_TIER' | 'MANUAL'
  currency: string;
  taxExcluded: boolean;
}

export interface PriceRule {
  id: string;
  entityId: string;
  ruleType: string;
  params: Record<string, unknown>;
  priority: number;
}

export interface IPricingEngine {
  calculatePrice(context: IPricingContext): Promise<IPriceResult>;
  previewMarkdown(entityId: string, markdownPct: number): Promise<IPriceResult>;
  getPriceRules(entityId: string): Promise<PriceRule[]>;
}

// ── Inventory Engine ───────────────────────────────────────────────────────────

export interface StockLevel {
  entityId: string;
  variantId?: string;
  branchId: string;
  onHand: number;
  reserved: number;
  available: number;
  unit: string;
  belowReorder: boolean;
}

export interface StockDeductionLine {
  entityId: string;
  variantId?: string;
  branchId: string;
  quantity: number;
  unit: string;
  reason: StockAdjustReason;
}

export interface StockDeductionResult {
  success: boolean;
  deducted: StockDeductionLine[];
  insufficientStock?: { entityId: string; available: number; requested: number }[];
}

export interface RecipeDeductionResult {
  success: boolean;
  ingredientsDeducted: { ingredientId: string; qty: number; unit: string }[];
}

export interface StockReceiptLine {
  entityId: string;
  variantId?: string;
  branchId: string;
  quantity: number;
  unit: string;
  purchaseOrderId?: string;
}

export interface StockAdjustment {
  entityId: string;
  variantId?: string;
  branchId: string;
  quantity: number; // positive = add, negative = remove
  unit: string;
  reason: StockAdjustReason;
  notes?: string;
  operatorId: string;
}

export interface ReorderAlert {
  entityId: string;
  entityName: string;
  branchId: string;
  onHand: number;
  reorderPoint: number;
  suggestedQty: number;
  supplierId?: string;
}

export interface IInventoryEngine {
  getStockLevel(entityId: string, variantId?: string, branchId?: string): Promise<StockLevel>;
  deductStock(lines: StockDeductionLine[]): Promise<StockDeductionResult>;
  deductByRecipe(entityId: string, qty: number, branchId: string): Promise<RecipeDeductionResult>;
  receiveStock(lines: StockReceiptLine[]): Promise<void>;
  adjustStock(adjustment: StockAdjustment): Promise<void>;
  getReorderAlerts(tenantId: string, branchId?: string): Promise<ReorderAlert[]>;
}

// ── Tax Engine ─────────────────────────────────────────────────────────────────

export interface TaxContext {
  tenantId: string;
  branchId: string;
  channelType: ChannelType;
  customerId?: string; // for tax-exempt customers
}

export interface TaxResult {
  taxableAmount: number;
  taxAmount: number;
  taxRate: number;
  taxClassName: string;
  inclusive: boolean; // is tax included in price or added on top?
}

export interface TaxClass {
  id: string;
  name: string;
  rate: number;
  inclusive: boolean;
  appliesToChannel: ChannelType[] | null; // null = all channels
}

export interface TaxedCartLine {
  entityId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  taxResult: TaxResult;
  lineTotal: number;
}

export interface TaxedCart {
  lines: TaxedCartLine[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
}

export interface CartLine {
  entityId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
}

export interface ITaxEngine {
  calculateTax(entityId: string, price: number, context: TaxContext): Promise<TaxResult>;
  getTaxClasses(tenantId: string): Promise<TaxClass[]>;
  applyTaxToCart(cart: CartLine[], context: TaxContext): Promise<TaxedCart>;
}

// ── Booking Engine ─────────────────────────────────────────────────────────────

export interface AvailabilityQuery {
  entityId: string; // the service
  branchId: string;
  date: Date;
  staffId?: string; // if customer wants a specific staff member
  partySize?: number;
}

export interface AvailabilitySlot {
  startTime: Date;
  endTime: Date;
  staffId: string;
  staffName: string;
  available: boolean;
}

export interface SlotHold {
  entityId: string;
  branchId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
  holdExpiresAt: Date;
}

export interface HoldResult {
  holdId: string;
  expiresAt: Date;
}

export interface Booking {
  id: string;
  entityId: string;
  customerId: string;
  staffId: string;
  branchId: string;
  startTime: Date;
  endTime: Date;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  notes?: string;
}

export interface IBookingEngine {
  checkAvailability(params: AvailabilityQuery): Promise<AvailabilitySlot[]>;
  holdSlot(params: SlotHold): Promise<HoldResult>;
  confirmBooking(holdId: string, customerId: string): Promise<Booking>;
  cancelBooking(bookingId: string, reason: string): Promise<void>;
  getStaffCalendar(staffId: string, date: Date): Promise<Booking[]>;
}

// ── Sales Engine ───────────────────────────────────────────────────────────────
// The orchestrator. Every sale flows through the Sales Engine,
// which delegates to other engines in a defined execution order.

export interface CartInputLine {
  entityId: string;
  variantId?: string;
  quantity: number;
  channelType: ChannelType;
  notes?: string;
}

export interface Cart {
  tenantId: string;
  branchId: string;
  lines: CartInputLine[];
  pricedLines: TaxedCartLine[];
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  currency: string;
  sessionId: string; // optimistic concurrency lock
}

export interface PaymentInput {
  method: 'CASH' | 'CARD' | 'WALLET' | 'SPLIT';
  amountTendered: number;
  referenceId?: string;
}

export interface SaleReceipt {
  saleId: string;
  tenantId: string;
  branchId: string;
  total: number;
  tax: number;
  change: number;
  currency: string;
  createdAt: Date;
  /** Side-effects triggered by engine execution — useful for debugging & audit */
  events: string[];
}

export interface ReturnLine {
  entityId: string;
  variantId?: string;
  quantity: number;
  reason: string;
}

export interface VoidResult {
  voided: boolean;
  refundAmount: number;
  restockedLines: ReturnLine[];
}

export interface ISalesEngine {
  /** Pre-sale: validate, price, tax — returns a fully costed cart */
  buildCart(tenantId: string, branchId: string, lines: CartInputLine[]): Promise<Cart>;
  /** Commit: executes all engine side-effects in defined order */
  commitSale(cart: Cart, payment: PaymentInput, operatorId: string): Promise<SaleReceipt>;
  /** Void / return */
  voidSale(saleId: string, reason: string, lines?: ReturnLine[]): Promise<VoidResult>;
}

// ── Reporting Engine ───────────────────────────────────────────────────────────

export interface ReportParams {
  tenantId: string;
  branchId?: string;
  from: Date;
  to: Date;
  groupBy?: 'DAY' | 'WEEK' | 'MONTH';
}

export interface SalesSummary {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  byDay: { date: string; revenue: number; transactions: number }[];
}

export interface InventoryReport {
  totalSkus: number;
  belowReorder: number;
  outOfStock: number;
  totalValue: number;
  items: { entityId: string; name: string; onHand: number; value: number }[];
}

export interface VerticalReport {
  reportId: string;
  vertical: string;
  generatedAt: Date;
  data: Record<string, unknown>;
}

export interface IReportingEngine {
  getSalesSummary(params: ReportParams): Promise<SalesSummary>;
  getInventoryReport(params: ReportParams): Promise<InventoryReport>;
  /** Vertical-specific reports resolved by blueprint reportId */
  getVerticalReport(reportId: string, params: ReportParams): Promise<VerticalReport>;
}
