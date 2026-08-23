import type {
  AuthSession,
  Branch,
  BranchHubDetails,
  BranchLocation,
  BranchMovements,
  BranchProductWithPrice,
  BranchWithContext,
  City,
  CityWithCounts,
  CreateBranchInput,
  CreateCityInput,
  CreateDeliveryInput,
  CreateDistrictInput,
  DailySeriesResult,
  Delivery,
  DeliveryWithBranch,
  DeliveryWithItems,
  District,
  DistrictWithCounts,
  DistributionRow,
  ManualPaymentInput,
  Payment,
  ReceiptSummary,
  SummaryKpis,
  SummaryRange,
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
  getBranch(branchId: string): Promise<BranchLocation | null>;
}

export interface ProductRepository {
  listBranchProducts(
    branchId: string,
    date: string,
  ): Promise<BranchProductWithPrice[]>;
}

export interface DeliveryRepository {
  listMyDeliveries(): Promise<DeliveryWithBranch[]>;
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

export interface AdminLocationRepository {
  listCitiesWithCounts(): Promise<CityWithCounts[]>;
  listDistrictsWithCounts(cityId: string): Promise<DistrictWithCounts[]>;
  listBranchesWithContext(districtId: string): Promise<BranchWithContext[]>;
  createCity(input: CreateCityInput): Promise<City>;
  createDistrict(input: CreateDistrictInput): Promise<District>;
  createBranch(input: CreateBranchInput): Promise<Branch>;
  setCityActive(id: string, isActive: boolean): Promise<void>;
  setDistrictActive(id: string, isActive: boolean): Promise<void>;
  setBranchActive(id: string, isActive: boolean): Promise<void>;
  setOpeningBalancesLocked(locked: boolean): Promise<void>;
  getOpeningBalancesLocked(): Promise<boolean>;
  getBranchHubDetails(branchId: string): Promise<BranchHubDetails>;
  listBranchMovements(
    branchId: string,
    limit?: number,
    offset?: number,
  ): Promise<BranchMovements>;
}

export interface ReportsRepository {
  getKpis(range: SummaryRange): Promise<SummaryKpis>;
  getProductDistribution(range: SummaryRange): Promise<DistributionRow[]>;
  getBranchDistribution(range: SummaryRange): Promise<DistributionRow[]>;
  getDailySeries(range: SummaryRange): Promise<DailySeriesResult>;
}

export interface AppServices {
  auth: AuthRepository;
  session: SessionRepository;
  locations: LocationRepository;
  products: ProductRepository;
  deliveries: DeliveryRepository;
  payments: PaymentRepository;
  ledger: LedgerRepository;
  adminLocations: AdminLocationRepository;
  reports: ReportsRepository;
}
