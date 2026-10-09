import { useId, type CSSProperties } from 'react';
import { ICON_PATHS, type IconName } from './icons/paths';

export type { IconName };

/**
 * A game-icons.net glyph (CC BY 3.0) drawn in `currentColor` unless `color` is given.
 * `gradient` paints it with a vertical metallic gradient instead (top -> bottom colours).
 */
export function Icon(p: {
  name: IconName;
  size?: number | string;
  color?: string;
  gradient?: string[];
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const size = p.size ?? 24;
  const fill = p.gradient ? `url(#${uid}g)` : (p.color ?? 'currentColor');
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={p.className}
      style={p.style}
      role={p.title ? 'img' : undefined}
      aria-hidden={p.title ? undefined : true}
      focusable="false"
    >
      {p.title ? <title>{p.title}</title> : null}
      {p.gradient ? (
        <defs>
          <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0.35" y2="1">
            {p.gradient.map((c, i) => (
              <stop key={i} offset={p.gradient!.length === 1 ? 0 : i / (p.gradient!.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
      ) : null}
      <path d={ICON_PATHS[p.name]} fill={fill} />
    </svg>
  );
}

/** Raw path data, for embedding inside another <svg>. */
export function iconPath(name: IconName): string {
  return ICON_PATHS[name];
}
