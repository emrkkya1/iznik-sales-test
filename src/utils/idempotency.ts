import { v4 as uuidv4 } from 'uuid';

// Generates a unique key used to make delivery creation idempotent.
export function generateIdempotencyKey(): string {
  return uuidv4();
}
