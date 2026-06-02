import { Icon } from '@/shared/components/ui/Icon';
import { Badge } from '@/shared/components/ui/Badge';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import type { UserMeResType } from '@makeforest/types';

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    timeZone: 'Asia/Seoul',
  });
}

export async function ProfileHeader({ userId }: { userId: string }) {
  const user = await api.get<UserMeResType>(API_PATHS.SERVER_USER_ME(userId), { next: { revalidate: 3600 } });

  return (
    <section className="bg-surface-container p-lg border border-outline-variant">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-4xl bg-surface-container-highest p-3 border border-outline-variant">
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="avatar" className="w-10 h-10 rounded-full" />
              : '🌿'
            }
          </div>
          <div>
            <h1 className="font-h1 text-on-surface">{user.nickname}</h1>
            <div className="flex flex-wrap gap-4 mt-1 font-label-mono text-on-surface-variant text-[12px]">
              {user.dongName && (
                <span className="flex items-center gap-1">
                  <Icon name="location_on" size={16} />
                  {user.dongName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Icon name="calendar_today" size={16} />
                {formatJoinDate(user.createdAt)} 가입
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="primary">SEEDLING</Badge>
        </div>
      </div>
    </section>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="bg-surface-container p-6 border border-outline-variant animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-surface-container-highest border border-outline-variant" />
        <div className="space-y-2">
          <div className="h-6 w-32 bg-surface-container-highest" />
          <div className="h-4 w-48 bg-surface-container-highest" />
        </div>
      </div>
    </div>
  );
}
