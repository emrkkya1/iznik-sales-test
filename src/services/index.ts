import type { AppServices } from './contracts';
import {
  supabaseAdminLocationRepository,
  supabaseAuthRepository,
  supabaseDeliveryRepository,
  supabaseLedgerRepository,
  supabaseLocationRepository,
  supabasePaymentRepository,
  supabaseProductRepository,
  supabaseReportsRepository,
  supabaseSessionRepository,
} from './supabase';

export type {
  AppServices,
  AuthRepository,
  SessionRepository,
  LocationRepository,
  ProductRepository,
  DeliveryRepository,
  PaymentRepository,
  LedgerRepository,
  AdminLocationRepository,
  ReportsRepository,
} from './contracts';

export { buildReceiptSummary } from './receiptSummary';

// Swap these adapters to change vendors without changing screens or hooks.
export const services: AppServices = {
  auth: supabaseAuthRepository,
  session: supabaseSessionRepository,
  locations: supabaseLocationRepository,
  products: supabaseProductRepository,
  deliveries: supabaseDeliveryRepository,
  payments: supabasePaymentRepository,
  ledger: supabaseLedgerRepository,
  adminLocations: supabaseAdminLocationRepository,
  reports: supabaseReportsRepository,
};
