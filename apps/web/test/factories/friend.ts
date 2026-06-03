import type { FriendListItemType } from '@makeforest/types';

export function makeFriend(overrides: Partial<FriendListItemType> = {}): FriendListItemType {
  return {
    userId: 'friend-1',
    nickname: '테스트친구',
    dongName: '역삼동',
    creatureStage: 0,
    status: 'OFFLINE',
    pokeCooldownEndsAt: null,
    friendStatus: 'ACCEPTED',
    ...overrides,
  };
}
