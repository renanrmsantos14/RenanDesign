import type { SVGProps } from 'react';

/** Handle fill follows the surface so the white-on-accent handles read on both themes; falls back to white outside the app theme. */
export const MARK_HANDLE_FILL = 'var(--color-background-surface, #fff)';
const HANDLE_FILL = MARK_HANDLE_FILL;

/** The RenanDesign "selection frame" mark: a dashed frame with four handles around an R. The accent is fixed brand colour; the R follows `currentColor`. */
export function OnlookMark(props: SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect x="16" y="16" width="68" height="68" rx="3" fill="none" stroke="#5B5BF0" strokeWidth="3" strokeDasharray="6 5" />
      <g fill={HANDLE_FILL} stroke="#5B5BF0" strokeWidth="3">
        <rect x="10" y="10" width="12" height="12" rx="2" />
        <rect x="78" y="10" width="12" height="12" rx="2" />
        <rect x="10" y="78" width="12" height="12" rx="2" />
        <rect x="78" y="78" width="12" height="12" rx="2" />
      </g>
      <path d="M38 70V31h14a11 11 0 0 1 0 22H38M51 53l13 17" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
