import type { ClassId } from '../../domain/types';
import { CLASS_ICON_PATHS } from './classIcons';

/** A class's icon in the theme accent. Decorative. */
export function ClassIcon({ classId, size = 18 }: { classId: ClassId; size?: number }) {
  return (
    <svg
      data-testid="class-icon"
      aria-hidden="true"
      viewBox="0 0 60 60"
      width={size}
      height={size}
      className="shrink-0 text-glow"
      // Constant SVG markup from classIcons.ts — never user input.
      dangerouslySetInnerHTML={{ __html: CLASS_ICON_PATHS[classId] }}
    />
  );
}
