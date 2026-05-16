import { CreatureSprite } from '@/shared/components/ui/CreatureSprite';
import { api } from '@/shared/lib/api';
import { API_PATHS } from '@/shared/lib/apiPaths';

const STAGE_LABELS = ['씨앗', '새싹', '나무1', '나무2', '나무3', '고목', '노거수', '정령수', '신수', '세계수'] as const;

interface UserMe {
  userCreature: { stage: number; totalWaterCount: number } | null;
}

export async function MyCreature({ userId }: { userId: string }) {
  const { userCreature } = await api.get<UserMe>(API_PATHS.SERVER_USER_ME(userId), { next: { revalidate: 3600 } });

  const stage = (userCreature?.stage ?? 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  const waterCount = userCreature?.totalWaterCount ?? 0;

  return (
    <section className="bg-surface-container p-6 border border-outline-variant">
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
                <span
                  key={i}
                  className={[
                    'px-2 py-0.5 font-label-mono text-[10px] border',
                    i === stage
                      ? 'bg-primary-container text-on-primary-container border-primary-container'
                      : i < stage
                        ? 'bg-surface-container-highest text-on-surface border-outline-variant'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant opacity-40',
                  ].join(' ')}
                >
                  {label}
                </span>
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
