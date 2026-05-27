'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import type { CollectionProgress, SessionToastPayload, MapUser, PokeReceivedSSEPayload, FriendStatusChangedPayload, FriendListItemType } from '@makeforest/types';
import { useMapStore } from '@/shared/store';
import { useSseEvent } from '@/shared/hooks/useSseEvent';
import { toast } from '@/shared/lib/toast';
import { API_PATHS } from '@/shared/lib/apiPaths';
import { qk } from '@/shared/lib/queryKeys';
import { useKstDateStore } from '@/shared/store/kstDateStore';
import {
  type MapSnapshot,
  type ActivityMap,
  EMPTY_SNAPSHOT,
} from '@/shared/hooks/queries/useMapSnapshotQuery';
import type { PokeInboxResType } from '@makeforest/types';

export function MainSseHandler() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const kstDate = useKstDateStore((s) => s.kstDate);
  const focusedRegionCode = useMapStore((s) => s.focusedRegionCode);

  const userId = session?.user?.id ?? null;
  const myRegionCode = (session?.user?.regionCode ?? null) as string | null;
  const regionCode = focusedRegionCode ?? myRegionCode;
  const regionUrl = regionCode ? API_PATHS.SERVER_SSE_REGION(regionCode) : null;
  const activityUrl = API_PATHS.SERVER_SSE_ACTIVITY();
  const userStreamUrl = userId ? API_PATHS.SSE_USER_STREAM() : null;

  useSseEvent(activityUrl, 'users:overlay', (data) => {
    queryClient.setQueryData<MapSnapshot>(qk.map.snapshot(), (prev) => ({
      ...(prev ?? EMPTY_SNAPSHOT),
      users: JSON.parse(data) as MapUser[],
    }));
  });

  useSseEvent(activityUrl, 'heatmap:update', (data) => {
    queryClient.setQueryData<MapSnapshot>(qk.map.snapshot(), (prev) => ({
      ...(prev ?? EMPTY_SNAPSHOT),
      heatmap: JSON.parse(data) as ActivityMap,
    }));
  });

  useSseEvent(regionUrl, 'water:toast', (raw) => {
    const { nickname } = JSON.parse(raw) as { nickname: string };
    toast.info(`💧 ${nickname}님이 물을 줬어요!`);
  });

  useSseEvent(regionUrl, 'session:toast', (raw) => {
    const payload = JSON.parse(raw) as SessionToastPayload;
    toast.info(`🌿 ${payload.nickname}님이 오늘의 미션에 참여했어요!`);
    if (!regionCode || !payload.collectionProgress) return;
    queryClient.setQueryData<CollectionProgress>(
      qk.collection.today(regionCode, kstDate),
      (prev) => (prev ? { ...prev, ...payload.collectionProgress! } : prev),
    );
  });

  useSseEvent(userStreamUrl, 'poke:received', (raw) => {
    if (!userId) return;
    const payload = JSON.parse(raw) as PokeReceivedSSEPayload;
    toast.info(`👉 ${payload.fromNickname}님이 찔렀어요!`);
    queryClient.setQueryData<PokeInboxResType>(qk.pokes.inbox(userId), (old) => {
      if (!old) {
        return {
          unreadCount: payload.unreadCount,
          items: [
            {
              pokeId: payload.pokeId,
              fromUser: { userId: payload.fromUserId, nickname: payload.fromNickname },
              createdAt: payload.createdAt,
              isRead: false,
            },
          ],
        };
      }
      return {
        ...old,
        unreadCount: payload.unreadCount,
        items: [
          {
            pokeId: payload.pokeId,
            fromUser: { userId: payload.fromUserId, nickname: payload.fromNickname },
            createdAt: payload.createdAt,
            isRead: false,
          },
          ...old.items,
        ],
      };
    });
  });

  useSseEvent(userStreamUrl, 'friend:status:changed', (raw) => {
    if (!userId) return;
    const { userId: changedUserId, status } = JSON.parse(raw) as FriendStatusChangedPayload;
    queryClient.setQueryData(
      qk.friends.list(userId),
      (old: { friends: FriendListItemType[] } | undefined) => {
        if (!old) return old;
        return {
          ...old,
          friends: old.friends.map((f) =>
            f.userId === changedUserId ? { ...f, status } : f,
          ),
        };
      },
    );
  });

  return null;
}
