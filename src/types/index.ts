export type { Database, Json } from './database.types';

export type {
  UserRole,
  PaymentType,
  OperationType,
  User,
  City,
  District,
  Branch,
  BranchLocation,
  Product,
  BranchProduct,
  BranchProductPrice,
  Delivery,
  DeliveryItem,
  Payment,
  AuditLog,
  CreateDeliveryInput,
  UpdateDeliveryInput,
  ManualPaymentInput,
  ReceiptSummary,
  BranchProductWithPrice,
  DeliveryWithItems,
  DeliveryWithBranch,
  DeliveryItemWithProduct,
} from './domain.types';

export type AuthSession = {
  accessToken: string;
  expiresAt: number | null;
  user: {
    id: string;
    email: string | null;
  };
};
