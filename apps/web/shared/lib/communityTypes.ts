export interface CommunityReaction {
  emoji: string;
  count: number;
  myReaction: boolean;
}

export interface CommunityComment {
  id: string;
  content: string;
  createdAt: string;
  user: { nickname: string };
}

export interface CommunityPost {
  id: string;
  createdAt: string;
  user: { nickname: string; dongCode: string | null };
  session: {
    waterCount: number;
    totalElapsedSec: number;
    todos: { text: string; done: boolean }[];
    todosPublic: boolean;
  } | null;
  creature: { stage: number };
  reactions: CommunityReaction[];
  commentCount: number;
}

export interface CommunityFeedResponse {
  items: CommunityPost[];
  nextCursor: string | null;
}

export interface DongRanking {
  rank: number;
  dongCode: string;
  dongName: string;
  totalWater: number;
}

export interface RankingResponse {
  period: 'today' | 'week' | 'all';
  rankings: DongRanking[];
}
