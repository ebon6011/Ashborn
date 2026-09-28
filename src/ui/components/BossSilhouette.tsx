import type { Silhouette } from '../../config/bosses';

/** Original Boss shapes, drawn for Ashborn: a dark body, a thin glow edge and two eyes. */
const SHAPES: Record<Silhouette, { path: string; eyes: [[number, number], [number, number]] }> = {
  colossus: {
    path: 'M14 100 L18 62 C14 58 12 50 16 44 L26 40 C30 30 38 24 50 24 C62 24 70 30 74 40 L84 44 C88 50 86 58 82 62 L86 100 Z',
    eyes: [[44, 36], [56, 36]],
  },
  treant: {
    path: 'M40 100 L42 70 L30 58 L22 36 L30 40 L34 30 L38 44 L44 30 L50 16 L56 30 L62 44 L66 30 L70 40 L78 36 L70 58 L58 70 L60 100 Z',
    eyes: [[46, 40], [54, 40]],
  },
  serpent: {
    path: 'M20 100 C20 80 40 78 50 70 C62 60 44 50 50 38 C54 28 68 26 72 34 C76 42 70 46 64 44 C60 52 76 60 70 74 C64 88 44 86 44 100 Z',
    eyes: [[62, 34], [68, 33]],
  },
  titan: {
    path: 'M22 100 L26 50 L18 46 L24 30 L40 28 L42 18 L58 18 L60 28 L76 30 L82 46 L74 50 L78 100 Z',
    eyes: [[46, 24], [54, 24]],
  },
  wraith: {
    path: 'M50 18 C58 18 62 26 62 34 L90 30 L70 48 L78 100 L64 86 L56 100 L50 88 L44 100 L36 86 L22 100 L30 48 L10 30 L38 34 C38 26 42 18 50 18 Z',
    eyes: [[46, 28], [54, 28]],
  },
  hound: {
    path: 'M8 100 L14 74 C14 64 24 58 36 58 L60 58 C66 50 70 40 80 38 L88 30 L90 42 L94 48 L86 56 L84 70 L88 100 L76 100 L72 80 L40 80 L32 100 Z',
    eyes: [[84, 42], [88, 44]],
  },
  brute: {
    path: 'M30 100 L32 66 L14 70 L10 52 L26 42 C28 32 38 26 50 26 C62 26 72 32 74 42 L90 52 L86 70 L68 66 L70 100 Z',
    eyes: [[45, 36], [55, 36]],
  },
  knight: {
    path: 'M38 100 L40 64 L30 60 L32 40 L40 36 L40 24 L50 14 L60 24 L60 36 L68 40 L70 60 L60 64 L62 100 Z M72 20 L76 20 L76 80 L72 80 Z',
    eyes: [[46, 28], [54, 28]],
  },
};

export function BossSilhouette({ silhouette, className = '' }: { silhouette: Silhouette; className?: string }) {
  const { path, eyes } = SHAPES[silhouette];
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" className={className}>
      <path d={path} fill="#02040a" stroke="rgb(58 184 255 / 0.5)" strokeWidth={1} />
      {eyes.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} fill="#3ab8ff" />
      ))}
    </svg>
  );
}
