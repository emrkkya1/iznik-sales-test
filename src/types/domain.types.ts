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
  currentBalance: number;
  openingBalance: number;
  isActive: boolean;
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
