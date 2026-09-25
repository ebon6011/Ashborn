import type { Rank } from '../../domain/types';

export function RankBadge({ rank, size = 'md' }: { rank: Rank; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-9 w-9 text-base' : 'h-14 w-14 text-2xl';
  return (
    <div
      role="img"
      aria-label={`Rank ${rank}`}
      className={`flex shrink-0 items-center justify-center rounded border border-glow font-bold text-glow shadow-[0_0_10px_rgb(58_184_255/0.5)] ${box}`}
    >
      {rank}
    </div>
  );
}
