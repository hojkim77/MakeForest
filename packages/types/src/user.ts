export type Provider = 'google' | 'kakao';

export interface User {
  id: string;
  provider: Provider;
  providerId: string;
  nickname: string;
  avatarUrl?: string;
  dongCode?: string;
  todosPublic: boolean;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatarUrl?: string;
  dongCode?: string;
  todosPublic: boolean;
}
