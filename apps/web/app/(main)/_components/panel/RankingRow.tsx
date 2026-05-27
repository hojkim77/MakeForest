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
        'flex items-center gap-sm px-sm py-xs border font-mono text-label',
        isHighlighted
          ? 'bg-primary-container border-primary'
          : 'bg-surface-container border-outline-variant',
      ].join(' ')}
    >
      <span className={`w-5 text-center shrink-0 ${rank <= 3 ? 'text-primary' : 'text-outline'}`}>
        {rank}
      </span>
      <span className="flex-1 truncate text-on-surface">{name}</span>
      <span className="text-on-surface-variant shrink-0">💧 {water}</span>
    </div>
  );
}
