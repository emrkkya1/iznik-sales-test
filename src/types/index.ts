export type { Database, Json } from './database.types';

export type Branch = {
  id: string;
  name: string;
  createdAt: string;
};

export type AuthSession = {
  accessToken: string;
  expiresAt: number | null;
  user: {
    id: string;
    email: string | null;
  };
};
