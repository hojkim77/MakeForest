'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CommunityComment } from '@makeforest/types';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';

interface AddCommentVars {
  postId: string;
  content: string;
}

interface DeleteCommentVars {
  postId: string;
  commentId: string;
}

export function useAddCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<CommunityComment, Error, AddCommentVars, { previousComments: unknown }>({
    mutationFn: ({ postId, content }) =>
      fetch(API_PATHS.COMMUNITY_COMMENTS(postId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }).then((r) => r.json() as Promise<CommunityComment>),

    onMutate: async ({ postId, content }) => {
      await queryClient.cancelQueries({ queryKey: qk.community.comments(postId) });
      const previousComments = queryClient.getQueryData(qk.community.comments(postId));

      const optimistic: CommunityComment = {
        id: `optimistic-${Date.now()}`,
        content,
        createdAt: new Date().toISOString(),
        user: { nickname: '...' },
        isMyComment: true,
      };

      queryClient.setQueryData<CommunityComment[]>(qk.community.comments(postId), (prev) =>
        prev ? [...prev, optimistic] : [optimistic],
      );

      return { previousComments };
    },

    onError: (_err, { postId }, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(qk.community.comments(postId), context.previousComments);
      }
    },

    onSettled: (_data, _err, { postId }) => {
      void queryClient.invalidateQueries({ queryKey: qk.community.comments(postId) });
      void queryClient.invalidateQueries({ queryKey: qk.community.feedBase() });
    },
  });
}

export function useDeleteCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteCommentVars, { previousComments: unknown }>({
    mutationFn: ({ postId, commentId }) =>
      fetch(`/api/community/${postId}/comments/${commentId}`, { method: 'DELETE' }).then(() => undefined),

    onMutate: async ({ postId, commentId }) => {
      await queryClient.cancelQueries({ queryKey: qk.community.comments(postId) });
      const previousComments = queryClient.getQueryData(qk.community.comments(postId));

      queryClient.setQueryData<CommunityComment[]>(qk.community.comments(postId), (prev) =>
        prev ? prev.filter((c) => c.id !== commentId) : [],
      );

      return { previousComments };
    },

    onError: (_err, { postId }, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(qk.community.comments(postId), context.previousComments);
      }
    },

    onSettled: (_data, _err, { postId }) => {
      void queryClient.invalidateQueries({ queryKey: qk.community.comments(postId) });
      void queryClient.invalidateQueries({ queryKey: qk.community.feedBase() });
    },
  });
}
