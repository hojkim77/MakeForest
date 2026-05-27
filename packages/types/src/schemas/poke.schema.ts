import { z } from 'zod';

// ---- Requests ----

export const PokeBody = z.object({
  toUserId: z.string(),
});

// ---- Responses ----

export const PokeRes = z.object({
  pointsRemaining: z.number(),
  cooldownEndsAt: z.string(),
});

export const PokeInboxItem = z.object({
  pokeId: z.string(),
  fromUser: z.object({
    userId: z.string(),
    nickname: z.string(),
  }),
  createdAt: z.string(),
  isRead: z.boolean(),
});

export const PokeInboxRes = z.object({
  unreadCount: z.number(),
  items: z.array(PokeInboxItem),
});

export const PokeReadRes = z.object({
  markedCount: z.number(),
});

export const PokeReceivedPayload = z.object({
  pokeId: z.string(),
  fromUserId: z.string(),
  fromNickname: z.string(),
  createdAt: z.string(),
  unreadCount: z.number(),
});

// ---- Types ----

export type PokeBodyType = z.infer<typeof PokeBody>;
export type PokeResType = z.infer<typeof PokeRes>;
export type PokeInboxItemType = z.infer<typeof PokeInboxItem>;
export type PokeInboxResType = z.infer<typeof PokeInboxRes>;
export type PokeReadResType = z.infer<typeof PokeReadRes>;
export type PokeReceivedPayloadType = z.infer<typeof PokeReceivedPayload>;
