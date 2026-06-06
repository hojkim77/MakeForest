interface RankingRowProps {
  rank: number;
  name: string;
  water: number;
  isHighlighted?: boolean;
}

export function RankingRow({ rank, name, water, isHighlighted = false }: RankingRowProps) {
  return (
    <div
      className={[
        'flex items-center gap-sm px-sm py-xs border-2 font-mono text-label',
        isHighlighted
          ? 'bg-primary-container border-primary shadow-island'
          : 'bg-surface-container border-outline',
      ].join(' ')}
    >
      <span className={`w-5 text-center shrink-0 ${rank <= 3 ? 'text-primary' : 'text-on-surface-variant'}`}>
        {rank}
      </span>
      <span className="flex-1 truncate text-on-surface">{name}</span>
      <span className="text-on-surface-variant shrink-0">💧 {water}</span>
    </div>
  );
}
