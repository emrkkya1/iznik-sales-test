// Domain types (separate from database types for abstraction)
// These types represent the business domain, not the database schema

export type UserRole = 'admin' | 'staff';
export type PaymentType = 'field_collection' | 'bank_transfer';
export type OperationType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface User {
  id: string;
  fullName: string;
  username: string;
  role: UserRole;
  isActive: boolean;
}

export interface City {
  id: string;
  name: string;
}

export interface District {
  id: string;
  cityId: string;
  name: string;
}

export interface Branch {
  id: string;
  districtId: string;
  name: string;
  currentBalance?: number;
  openingBalance?: number;
  isActive: boolean;
}

export interface BranchLocation extends Branch {
  cityId: string | null;
}

export interface Product {
  id: string;
  name: string;
  imageUrl: string | null;
  isActive: boolean;
}

export interface BranchProduct {
  id: string;
  branchId: string;
  productId: string;
  isActive: boolean;
}

export interface BranchProductPrice {
  id: string;
  branchProductId: string;
  price: number;
  startDate: string;
  endDate: string | null;
}

export interface Delivery {
  id: string;
  branchId: string;
  userId: string;
  totalSalesAmount: number;
  date: string;
  idempotencyKey: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  deletionReason: string | null;
  createdAt: string;
}

export interface DeliveryItem {
  id: string;
  deliveryId: string;
  productId: string;
  deliveredQuantity: number;
  returnedQuantity: number;
  netQuantity: number;
  unitPrice: number;
}

export interface Payment {
  id: string;
  branchId: string;
  userId: string;
  deliveryId: string | null;
  amount: number;
  paymentType: PaymentType;
  date: string;
  deletedAt: string | null;
  deletedBy: string | null;
  deletionReason: string | null;
}

export interface AuditLog {
  id: string;
  operationType: OperationType;
  tableName: string;
  recordId: string;
  userId: string;
  oldData: Record<string, unknown> | null;
  deletionReason: string | null;
  createdAt: string;
}

// Input types for RPCs
export interface CreateDeliveryInput {
  branchId: string;
  items: {
    productId: string;
    deliveredQuantity: number;
    returnedQuantity: number;
  }[];
  paymentAmount: number;
  paymentType: PaymentType;
  date: string;
}

export interface UpdateDeliveryInput {
  deliveryId: string;
  items: {
    productId: string;
    deliveredQuantity: number;
    returnedQuantity: number;
  }[];
  date: string;
}

export interface ManualPaymentInput {
  branchId: string;
  amount: number;
  paymentType: PaymentType;
  date: string;
}

// Receipt summary for UI
export interface ReceiptSummary {
  deliveryId: string;
  branchId: string;
  branchName: string;
  date: string;
  items: {
    productName: string;
    deliveredQuantity: number;
    returnedQuantity: number;
    netQuantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  totalSalesAmount: number;
  paymentAmount: number;
  previousBalance: number;
  newBalance: number;
}

// Branch product with effective price and product details for entry screen
export interface BranchProductWithPrice {
  id: string;
  branchId: string;
  productId: string;
  isActive: boolean;
  productName: string;
  productImageUrl: string | null;
  currentPrice: number;
}

// Delivery with expanded relationships for detail/history views
export interface DeliveryWithItems extends Delivery {
  items: DeliveryItemWithProduct[];
  payments: Payment[];
  branchName: string;
}

export interface DeliveryWithBranch extends Delivery {
  branchName: string;
}

export interface DeliveryItemWithProduct extends DeliveryItem {
  productName: string;
}

// ============================================
// Phase 6: Admin Master Data And Balance Operations
// ============================================

// Summary screen range selector
export type SummaryRange = 'week' | 'month' | 'all';

// Özet KPIs
export interface SummaryKpis {
  totalSales: number;
  totalCollection: number;
  activeBranchCount: number;
  activeProductCount: number;
}

// Distribution pie chart rows (server returns ranked raw rows; UI merges via util)
export interface DistributionRow {
  id: string;
  label: string;
  value: number;
  isMerged?: boolean;
}

// Daily earnings chart series
export interface DailySeriesPoint {
  // Always YYYY-MM-DD; client-side formatter derives display label from granularity.
  bucket: string;
  sales: number;
}

export interface DailySeriesResult {
  granularity: 'day' | 'week' | 'month';
  points: DailySeriesPoint[];
}

// Geography list types (with counts)
export interface CityWithCounts extends City {
  districtCount: number;
  branchCount: number;
  isActive: boolean;
}

export interface DistrictWithCounts extends District {
  branchCount: number;
  activeBranchCount: number;
  isActive: boolean;
}

export interface BranchWithContext extends Branch {
  currentBalance: number;
  activeProductCount: number;
  isActive: boolean;
}

// Branch Hub summary card details (returned by get_branch_hub_details)
export interface BranchHubDetails {
  name: string;
  districtName: string;
  cityName: string;
  openingBalance: number;
  openingBalanceDate: string;
  isActive: boolean;
  activeProductCount: number;
  totalProductCount: number;
  lastMovementDate: string | null;
}

// Inputs for geography create mutations
export interface CreateCityInput {
  name: string;
}

export interface CreateDistrictInput {
  cityId: string;
  name: string;
}

export interface CreateBranchInput {
  districtId: string;
  name: string;
  openingBalance: number;
  isActive: boolean;
}

// Branch movement entry (from list_branch_movements RPC)
export interface BranchMovementRow {
  id: string;
  type: 'delivery' | 'payment';
  date: string;
  amount: number;
  paymentType: string | null;
  isDeleted: boolean;
  createdAt: string;
}

export interface BranchMovements {
  deliveries: BranchMovementRow[];
  payments: BranchMovementRow[];
}
