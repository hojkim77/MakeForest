import React from 'react';
import { render, screen } from '@testing-library/react';
import { FriendCard } from '../FriendCard';
import type { FriendListItemType } from '@makeforest/types';

jest.mock('@/shared/hooks/mutations/usePokeMutation', () => ({
  usePokeMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('@/shared/hooks/mutations/useFriendDeleteMutation', () => ({
  useFriendDeleteMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'me' } } }),
}));

function makeAcceptedFriend(overrides: Partial<FriendListItemType> = {}): FriendListItemType {
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

describe('FriendCard', () => {
  describe('ACCEPTED 친구', () => {
    it('닉네임과 동네가 표시된다', () => {
      render(
        <FriendCard
          friend={makeAcceptedFriend()}
          myUserId="me"
          myPoints={10}
          onDelete={jest.fn()}
        />,
      );
      expect(screen.getByText('테스트친구')).toBeInTheDocument();
      expect(screen.getByText('역삼동')).toBeInTheDocument();
    });

    it('PokeButton이 렌더된다', () => {
      render(
        <FriendCard
          friend={makeAcceptedFriend()}
          myUserId="me"
          myPoints={10}
          onDelete={jest.fn()}
        />,
      );
      expect(screen.getByRole('button', { name: /찌르기/i })).toBeInTheDocument();
    });

    it('삭제 버튼이 렌더된다', () => {
      render(
        <FriendCard
          friend={makeAcceptedFriend()}
          myUserId="me"
          myPoints={10}
          onDelete={jest.fn()}
        />,
      );
      expect(screen.getByRole('button', { name: /친구 삭제/i })).toBeInTheDocument();
    });
  });

  describe('PENDING_OUTGOING 친구', () => {
    it('"대기중" 텍스트가 표시된다', () => {
      render(
        <FriendCard
          friend={makeAcceptedFriend({ friendStatus: 'PENDING_OUTGOING' })}
          myUserId="me"
          myPoints={10}
          onDelete={jest.fn()}
        />,
      );
      expect(screen.getByText('대기중')).toBeInTheDocument();
    });

    it('PokeButton이 렌더되지 않는다', () => {
      render(
        <FriendCard
          friend={makeAcceptedFriend({ friendStatus: 'PENDING_OUTGOING' })}
          myUserId="me"
          myPoints={10}
          onDelete={jest.fn()}
        />,
      );
      expect(screen.queryByRole('button', { name: /찌르기/i })).not.toBeInTheDocument();
    });
  });
});
