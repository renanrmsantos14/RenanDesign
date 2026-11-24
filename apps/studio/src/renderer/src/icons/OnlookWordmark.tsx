import type { SVGProps } from 'react';

/** The RenanDesign name set as text; the fork has no drawn wordmark. Sized by height only, so the width follows the viewBox. */
export function OnlookWordmark(props: SVGProps<SVGSVGElement>): React.JSX.Element {
  return (
    <svg
      height={12}
      viewBox="0 0 330 62"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <text
        x="0"
        y="48"
        fill="currentColor"
        fontFamily="inherit"
        fontSize="54"
        fontWeight="600"
        letterSpacing="-1"
        textLength="326"
        lengthAdjust="spacingAndGlyphs"
      >
        RenanDesign
      </text>
    </svg>
  );
}
