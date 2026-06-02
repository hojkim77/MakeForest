import { CreatureSprite, STAGE_LABELS } from '@/shared/components/ui/CreatureSprite';
import { Badge } from '@/shared/components/ui/Badge';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';
import type { UserMeResType } from '@makeforest/types';

export async function MyCreature({ userId }: { userId: string }) {
  const { userCreature } = await api.get<UserMeResType>(API_PATHS.SERVER_USER_ME(userId), { next: { revalidate: 3600 } });

  const stage = (userCreature?.stage ?? 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  const waterCount = userCreature?.totalWaterCount ?? 0;

  return (
    <section className="bg-surface-container p-lg border border-outline-variant">
      <h2 className="font-h2 text-on-surface mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">forest</span>
        MY CREATURE
      </h2>

      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="bg-primary-container border-2 border-primary-container p-6 flex items-center justify-center">
          <CreatureSprite stage={stage} size={96} />
        </div>

        <div className="space-y-3">
          <div>
            <span className="font-label-mono text-on-surface-variant uppercase text-[11px]">Stage</span>
            <div className="font-pixel-stat text-3xl text-primary mt-1">
              {stage} — {STAGE_LABELS[stage]}
            </div>
          </div>
          <div>
            <span className="font-label-mono text-on-surface-variant uppercase text-[11px]">Lifetime Waters</span>
            <div className="font-pixel-stat text-2xl text-primary mt-1">{waterCount}회</div>
          </div>

          <div className="pt-2">
            <div className="flex gap-1 flex-wrap">
              {(STAGE_LABELS as readonly string[]).map((label, i) => (
                i === stage ? (
                  <Badge key={i} variant="primary" size="sm">{label}</Badge>
                ) : i < stage ? (
                  <Badge key={i} variant="default" size="sm" className="opacity-60">{label}</Badge>
                ) : (
                  <Badge key={i} variant="default" size="sm" className="opacity-30">{label}</Badge>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function MyCreatureSkeleton() {
  return (
    <div className="h-48 bg-surface-container border border-outline-variant animate-pulse" />
  );
}
