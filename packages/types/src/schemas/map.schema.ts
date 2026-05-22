import { z } from 'zod';

export const PixelDataRes = z.array(z.object({
  dongCode: z.string(),
  name: z.string(),
  pixelX: z.number(),
  pixelY: z.number(),
}));

export const ActivityRes = z.record(z.string(), z.number());

export type PixelDataResType = z.infer<typeof PixelDataRes>;
export type ActivityResType = z.infer<typeof ActivityRes>;
