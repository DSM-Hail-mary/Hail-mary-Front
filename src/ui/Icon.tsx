import type { SVGProps } from 'react';

/**
 * 아트보드에서 쓰는 선 아이콘 모음. 색은 `currentColor`를 따른다.
 * 모두 장식용(aria-hidden)이다 — 의미는 옆 텍스트나 aria-label로 전달한다.
 */
const PATHS = {
  calendar: (
    <>
      <rect x="2" y="3" width="12" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  chevronDown: <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />,
  chevronLeft: (
    <path
      d="M10 3L5 8l5 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  chevronRight: (
    <path
      d="M6 3l5 5-5 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  close: <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  plus: <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  minus: <path d="M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  check: (
    <path
      d="M3 8.4l3.2 3.2L13 4.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  cross: <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  download: (
    <path
      d="M8 2.3v8M4.6 7.4L8 10.8l3.4-3.4M2.9 13.7h10.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  undo: (
    <path
      d="M5.1 3.4L2.3 6.3l2.8 2.8M2.9 6.3h6.9a3.4 3.4 0 010 6.9H6.9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  arrowRight: (
    <path
      d="M3 8h9M9 4.5L12.5 8 9 11.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  pinOff: (
    <>
      <path
        d="M8 14.7s5.3-4.8 5.3-8.5A5.3 5.3 0 002.7 6.1C2.7 9.9 8 14.7 8 14.7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.7" />
    </>
  ),
  folder: (
    <path
      d="M1.8 4.9h4.4l1.3 1.8h6.7v6.7H1.8z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  ),
  info: (
    <>
      <circle cx="8" cy="8" r="6.7" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 7.1v4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="4.8" r="0.9" fill="currentColor" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false" {...rest}>
      {PATHS[name]}
    </svg>
  );
}
