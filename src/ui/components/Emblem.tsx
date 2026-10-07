import { FRAME_PATHS } from './frames';

/** The player's initial inside their equipped frame, in the theme accent. Decorative. */
export function Emblem({ name, frameId, size = 50 }: { name: string; frameId: string | null; size?: number }) {
  const id = frameId && FRAME_PATHS[frameId] ? frameId : 'frame-hex';
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      data-testid="emblem"
      data-frame={id}
      aria-hidden="true"
      className="relative inline-flex shrink-0 items-center justify-center text-glow"
      style={{ width: size, height: size }}
    >
      {/* Constant SVG markup from frames.ts — never user input. */}
      <svg viewBox="-2 -4 64 66" className="absolute inset-0 h-full w-full" dangerouslySetInnerHTML={{ __html: FRAME_PATHS[id]! }} />
      <span className="relative text-lg font-semibold text-ink">{initial}</span>
    </span>
  );
}
