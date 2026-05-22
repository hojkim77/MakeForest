import { z } from 'zod';

const ALLOWED_EMOJIS = ['🔥', '💪', '👏'] as const;

export const CommunityFeedQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  period: z.enum(['today', 'week', 'all']).optional(),
  sort: z.enum(['recent', 'popular', 'water']).optional(),
  regionKey: z.string().optional(),
});

export const ReactionsQuery = z.object({
  postIds: z.string(),
  userId: z.string(),
});

export const ReactionBody = z.object({
  emoji: z.enum(ALLOWED_EMOJIS),
  userId: z.string(),
});

export const CommentQuery = z.object({
  userId: z.string().optional(),
});

export const CommentBody = z.object({
  content: z.string().min(1).max(500),
  userId: z.string(),
});

export const DeleteCommentBody = z.object({
  userId: z.string(),
});

export const ReactionRes = z.object({
  added: z.boolean(),
});

export const CommentRes = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.string(),
  user: z.object({ nickname: z.string() }),
});

export type CommunityFeedQueryType = z.infer<typeof CommunityFeedQuery>;
export type ReactionsQueryType = z.infer<typeof ReactionsQuery>;
export type ReactionBodyType = z.infer<typeof ReactionBody>;
export type CommentQueryType = z.infer<typeof CommentQuery>;
export type CommentBodyType = z.infer<typeof CommentBody>;
export type DeleteCommentBodyType = z.infer<typeof DeleteCommentBody>;
export type ReactionResType = z.infer<typeof ReactionRes>;
export type CommentResType = z.infer<typeof CommentRes>;
