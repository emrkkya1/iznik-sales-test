import type { AppServices } from './contracts';
import { supabaseAuthRepository, supabaseBranchRepository } from './supabase';

export type { AppServices, AuthRepository, BranchRepository } from './contracts';

// Swap these adapters to change vendors without changing screens or hooks.
export const services: AppServices = {
  auth: supabaseAuthRepository,
  branches: supabaseBranchRepository,
};
