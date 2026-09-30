import type { BossDef } from '../../config/bosses';
import { BossSilhouette } from './BossSilhouette';

/** A Boss's picture: the drawn art, or the old silhouette for a retired v1.4.0 Boss. Decorative only. */
export function BossArt({ def, className = '' }: { def: BossDef; className?: string }) {
  if (def.art) {
    return (
      <img
        src={def.art}
        alt=""
        aria-hidden="true"
        draggable={false}
        data-testid="boss-art"
        className={`rounded-lg object-cover ${className}`}
      />
    );
  }
  return <BossSilhouette silhouette={def.silhouette} className={className} />;
}
