export type Period = 'today' | 'week' | 'all';

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
  isMyComment?: boolean;
}

export interface CommunityPost {
  id: string;
  goal: string | null;
  createdAt: string;
  dongName: string | null;
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
  dongNotFound?: boolean;
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

export interface RegionRanking {
  rank: number;
  regionKey: string;
  regionName: string;
  totalWater: number;
}

export interface RegionRankingResponse {
  period: 'today' | 'week' | 'all';
  rankings: RegionRanking[];
  myRegionKey?: string | null;
}
