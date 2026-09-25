import { useEffect, useRef, useState } from 'react';
import { playSound } from '../../platform/audio';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface Props {
  text: string;
  speedMs?: number;
  onDone?: () => void;
  sound?: boolean;
  className?: string;
}

/** System message typed out with a soft chime. Remount with a new `key` for a new message. */
export function Typewriter({ text, speedMs = 28, onDone, sound = true, className = '' }: Props) {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);
  const shown = reduced ? text.length : Math.min(tick, text.length);
  const done = shown >= text.length;
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (sound) playSound('chime');
  }, [sound]);

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setTick((t) => t + 1), speedMs);
    return () => clearInterval(timer);
  }, [done, speedMs]);

  useEffect(() => {
    if (done) onDoneRef.current?.();
  }, [done]);

  return (
    <p className={`text-base leading-relaxed text-ink ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, shown)}
        {!done && <span className="text-glow">▍</span>}
      </span>
    </p>
  );
}
