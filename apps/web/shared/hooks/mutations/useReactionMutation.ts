'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CommunityPost, CommunityReaction } from '@makeforest/types';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface ReactionVars {
  postId: string;
  emoji: string;
  feedFilters: { period: string; sort: string; regionKey: string };
}

interface ReactionRes {
  added: boolean;
}

type MutationContext = {
  previousPosts: unknown;
  previousMyReactions: [readonly unknown[], unknown][];
};

function patchReactions(reactions: CommunityReaction[], emoji: string, adding: boolean): CommunityReaction[] {
  return reactions.map((r) =>
    r.emoji === emoji
      ? { ...r, count: r.count + (adding ? 1 : -1), myReaction: adding }
      : r,
  );
}

export function useReactionMutation() {
  const queryClient = useQueryClient();

  return useMutation<ReactionRes, Error, ReactionVars, MutationContext>({
    mutationFn: ({ postId, emoji }) =>
      fetch(API_PATHS.COMMUNITY_REACTIONS(postId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      }).then((r) => r.json() as Promise<ReactionRes>),

    onMutate: async ({ postId, emoji, feedFilters }) => {
      await queryClient.cancelQueries({ queryKey: qk.community.feed(feedFilters) });
      await queryClient.cancelQueries({ queryKey: qk.community.myReactionsBase() });

      const previousPosts = queryClient.getQueryData(qk.community.feed(feedFilters));
      const previousMyReactions = queryClient.getQueriesData<Record<string, string[]>>({ queryKey: qk.community.myReactionsBase() });

      const myReactionsEntry = previousMyReactions.find(([, data]) => data && postId in data)?.[1];
      const adding = myReactionsEntry !== undefined
        ? !(myReactionsEntry[postId] ?? []).includes(emoji)
        : !((previousPosts as { pages: { items: CommunityPost[] }[] } | undefined)
          ?.pages.flatMap((p) => p.items).find((p) => p.id === postId)
          ?.reactions.find((r) => r.emoji === emoji)?.myReaction ?? false);

      // Optimistically update feed cache (counts + myReaction flag)
      queryClient.setQueriesData<{ pages: { items: CommunityPost[] }[] }>(
        { queryKey: qk.community.feed(feedFilters) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((p) =>
                p.id === postId ? { ...p, reactions: patchReactions(p.reactions, emoji, adding) } : p,
              ),
            })),
          };
        },
      );

      // Optimistically update myReactions cache (active state source for PostCard)
      queryClient.setQueriesData<Record<string, string[]>>(
        { queryKey: qk.community.myReactionsBase() },
        (old) => {
          if (!old) return old;
          const emojis = old[postId] ?? [];
          return {
            ...old,
            [postId]: adding ? [...emojis, emoji] : emojis.filter((e) => e !== emoji),
          };
        },
      );

      return { previousPosts, previousMyReactions };
    },

    onError: (_err, { feedFilters }, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(qk.community.feed(feedFilters), context.previousPosts);
      }
      if (context?.previousMyReactions) {
        context.previousMyReactions.forEach(([key, data]) => queryClient.setQueryData(key as readonly unknown[], data));
      }
    },

    onSettled: (_data, _err, { feedFilters }) => {
      void queryClient.invalidateQueries({ queryKey: qk.community.feed(feedFilters) });
      void queryClient.invalidateQueries({ queryKey: qk.community.myReactionsBase() });
    },
  });
}
