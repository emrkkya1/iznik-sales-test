import type { AuthSession, Branch } from '@/types';

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>;
  signIn(email: string, password: string): Promise<AuthSession>;
  signOut(): Promise<void>;
}

export interface BranchRepository {
  list(): Promise<Branch[]>;
}

export interface AppServices {
  auth: AuthRepository;
  branches: BranchRepository;
}
