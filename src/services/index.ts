import type { AppServices } from './contracts';
import {
  supabaseAuthRepository,
  supabaseDeliveryRepository,
  supabaseLedgerRepository,
  supabaseLocationRepository,
  supabasePaymentRepository,
  supabaseProductRepository,
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
};
