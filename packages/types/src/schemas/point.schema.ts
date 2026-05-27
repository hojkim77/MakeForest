import { z } from 'zod';

export const PointsMeRes = z.object({
  balance: z.number(),
});

export type PointsMeResType = z.infer<typeof PointsMeRes>;
