import backdropUrl from '../../assets/backdrop.svg';
import hexTileUrl from '../../assets/hex-tile.svg';

/**
 * Original decorative scene behind every screen: a glowing dungeon gate, a line of
 * shadow soldiers at its foot (src/assets/backdrop.svg), a faint hexagon "System" grid
 * (src/assets/hex-tile.svg) and rising mana particles. The scene is a static image so the browser rasterises it
 * once; only the small particles animate. Hidden from screen readers, never blocks taps.
 * Particles are hidden under prefers-reduced-motion (index.css).
 */

// [left %, delay s, duration s, size px] — fixed values so the scene is identical on every render.
const PARTICLES: ReadonlyArray<[number, number, number, number]> = [
  [8, 0, 14, 3], [16, 5, 18, 2], [24, 9, 12, 3], [31, 2, 16, 2], [38, 11, 20, 4], [44, 6, 13, 2],
  [49, 1, 17, 3], [53, 8, 15, 2], [58, 3, 19, 3], [63, 12, 14, 2], [69, 4, 18, 4], [75, 10, 12, 2],
  [81, 7, 16, 3], [87, 0, 20, 2], [92, 13, 15, 3], [96, 5, 17, 2],
];

export function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void"
      style={{
        // The hex "System" grid is a tiny tile the browser rasterises once and repeats.
        // Quoted: Vite inlines small SVGs as data: URIs, which break an unquoted url().
        backgroundImage: `url("${hexTileUrl}"), url("${backdropUrl}")`,
        backgroundRepeat: 'repeat, no-repeat',
        backgroundSize: 'auto, cover',
        backgroundPosition: 'center top, center bottom',
      }}
    >
      {PARTICLES.map(([left, delay, duration, size]) => (
        <span
          key={left}
          className="mana-particle"
          style={{ left: `${left}%`, width: size, height: size, animationDelay: `-${delay}s`, animationDuration: `${duration}s` }}
        />
      ))}
    </div>
  );
}
