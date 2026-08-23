import type {
  AuthSession,
  Branch,
  BranchProductWithPrice,
  City,
  CreateDeliveryInput,
  Delivery,
  DeliveryWithItems,
  District,
  ManualPaymentInput,
  Payment,
  ReceiptSummary,
  UpdateDeliveryInput,
  User,
} from '@/types';

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void;
}

export interface SessionRepository {
  getCurrentUser(): Promise<User | null>;
}

export interface LocationRepository {
  listCities(): Promise<City[]>;
  listDistricts(cityId: string): Promise<District[]>;
  listBranches(districtId?: string): Promise<Branch[]>;
}

export interface ProductRepository {
  listBranchProducts(
    branchId: string,
    date: string,
  ): Promise<BranchProductWithPrice[]>;
}

export interface DeliveryRepository {
  listMyDeliveries(): Promise<Delivery[]>;
  getDelivery(id: string): Promise<DeliveryWithItems | null>;
  createDelivery(
    input: CreateDeliveryInput,
    idempotencyKey: string,
  ): Promise<ReceiptSummary>;
  updateDelivery(input: UpdateDeliveryInput): Promise<ReceiptSummary>;
  softDeleteDelivery(id: string, reason: string): Promise<void>;
}

export interface PaymentRepository {
  recordManualPayment(input: ManualPaymentInput): Promise<Payment>;
}

export interface LedgerRepository {
  getBranchBalance(branchId: string): Promise<number>;
}

export interface AppServices {
  auth: AuthRepository;
  session: SessionRepository;
  locations: LocationRepository;
  products: ProductRepository;
  deliveries: DeliveryRepository;
  payments: PaymentRepository;
  ledger: LedgerRepository;
}
