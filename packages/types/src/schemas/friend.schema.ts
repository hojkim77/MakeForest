import { z } from 'zod';

// ---- Requests ----

export const CreateFriendRequestBody = z.object({
  targetUserId: z.string(),
});

export const RespondFriendRequestBody = z.object({
  action: z.enum(['accept', 'reject']),
});

export const FriendSearchQuery = z.object({
  nickname: z.string().min(1, 'nickname은 비어있을 수 없습니다.'),
});

// ---- Responses ----

export const FriendSearchResult = z.object({
  userId: z.string(),
  nickname: z.string(),
  dongName: z.string().nullable(),
  creatureStage: z.number(),
  relation: z.enum(['NONE', 'PENDING_OUTGOING', 'PENDING_INCOMING', 'FRIENDS', 'SELF']),
});

export const FriendSearchRes = z.object({
  results: z.array(FriendSearchResult),
});

export const CreateFriendRequestRes = z.object({
  status: z.enum(['PENDING', 'ACCEPTED']),
  friendshipId: z.string(),
});

export const IncomingFriendRequest = z.object({
  friendshipId: z.string(),
  requester: z.object({
    userId: z.string(),
    nickname: z.string(),
    dongName: z.string().nullable(),
  }),
  createdAt: z.string(),
});

export const IncomingRequestsRes = z.object({
  requests: z.array(IncomingFriendRequest),
});

export const FriendListItem = z.object({
  userId: z.string(),
  nickname: z.string(),
  dongName: z.string().nullable(),
  creatureStage: z.number(),
  status: z.enum(['RUNNING', 'IDLE', 'OFFLINE']),
  pokeCooldownEndsAt: z.string().nullable(),
  friendStatus: z.enum(['ACCEPTED', 'PENDING_OUTGOING']),
});

export const FriendListRes = z.object({
  friends: z.array(FriendListItem),
});

// ---- Types ----

export type CreateFriendRequestBodyType = z.infer<typeof CreateFriendRequestBody>;
export type RespondFriendRequestBodyType = z.infer<typeof RespondFriendRequestBody>;
export type FriendSearchQueryType = z.infer<typeof FriendSearchQuery>;
export type FriendSearchResultType = z.infer<typeof FriendSearchResult>;
export type FriendSearchResType = z.infer<typeof FriendSearchRes>;
export type CreateFriendRequestResType = z.infer<typeof CreateFriendRequestRes>;
export type IncomingFriendRequestType = z.infer<typeof IncomingFriendRequest>;
export type IncomingRequestsResType = z.infer<typeof IncomingRequestsRes>;
export type FriendListItemType = z.infer<typeof FriendListItem>;
export type FriendListResType = z.infer<typeof FriendListRes>;
