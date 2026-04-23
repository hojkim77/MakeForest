interface SloganSectionProps {
  neighborhoodName: string;
}

export function SloganSection({ neighborhoodName }: SloganSectionProps) {
  return (
    <div className="flex flex-col gap-sm">
      <h1 className="font-mono text-display text-on-surface leading-tight">
        집중한 시간이
        <br />
        우리 동네의 나무가 됩니다.
      </h1>
      <p className="font-mono text-headline text-primary">
        {neighborhoodName}의 오늘을, 함께 키워요.
      </p>
    </div>
  );
}
