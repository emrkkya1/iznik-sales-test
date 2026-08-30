import { z } from 'zod';

import type { BranchAnalyticsPage } from '@/types';

const branchAnalyticsRowSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string(),
  cityName: z.string(),
  districtName: z.string(),
  currentBalance: z.number().finite(),
  deliveredQty: z.number().finite().nonnegative(),
  returnedQty: z.number().finite().nonnegative(),
  returnRate: z.number().finite().nonnegative().nullable(),
  lastActivityDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  isActive: z.boolean(),
});

const branchAnalyticsPageSchema = z.object({
  rows: z.array(branchAnalyticsRowSchema),
  totalCount: z.number().int().nonnegative(),
});

export function parseBranchAnalyticsPage(value: unknown): BranchAnalyticsPage {
  return branchAnalyticsPageSchema.parse(value);
}
