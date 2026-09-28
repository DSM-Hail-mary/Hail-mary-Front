import type { BasisLevel, Detection, HazardType, NormalizedBox } from '@/domain/types';

/**
 * 목 모드용 크롭 이미지. 디자인 아트보드의 일러스트(전주 + 완금 + 까치집/수목)를
 * SVG data URL로 만든다. 실제 서비스에서는 서버가 준 JPEG URL이 들어간다.
 */

const SCENE_W = 400;
const SCENE_H = 300;

export interface SceneOptions {
  hazard: HazardType | null;
  level: BasisLevel | null;
}

/** [x, y, w, h] — 장면 좌표계에서 잘라낼 영역. 모두 4:3. */
export type ViewBox = [number, number, number, number];

export const CROP_VIEWS: readonly ViewBox[] = [
  [0, 0, 400, 300],
  [60, 20, 280, 210],
  [100, 30, 160, 120],
  [-40, -30, 480, 360],
  [20, 10, 360, 270],
];

const NEST_SHAPE: Record<BasisLevel, { cx: number; cy: number; rx: number; ry: number }> = {
  0: { cx: 166, cy: 75, rx: 16, ry: 10 },
  1: { cx: 164, cy: 74, rx: 24, ry: 15 },
  2: { cx: 156, cy: 72, rx: 36, ry: 22 },
};

const TREE_SHIFT: Record<BasisLevel, number> = { 0: 60, 1: 30, 2: 0 };

type Box = [number, number, number, number];

function sceneSvg({ hazard, level }: SceneOptions, [vx, vy, vw, vh]: ViewBox): string {
  const lv = level ?? 1;
  let hazardSvg = '';
  if (hazard === 'nest') {
    const n = NEST_SHAPE[lv];
    const k = n.rx / 36;
    const sticks = [
      [-32, -2, -6, -14],
      [-24, 8, 28, -8],
      [-16, 16, 24, 2],
      [-30, -10, 14, 12],
    ]
      .map(([x1, y1, x2, y2]) => `M${n.cx + x1! * k} ${n.cy + y1! * k} L${n.cx + x2! * k} ${n.cy + y2! * k}`)
      .join(' ');
    hazardSvg = `<ellipse cx="${n.cx}" cy="${n.cy}" rx="${n.rx}" ry="${n.ry}" fill="#5A544C"/><path d="${sticks}" stroke="#3A352F" stroke-width="3" stroke-linecap="round"/>`;
  } else if (hazard === 'tree') {
    const s = TREE_SHIFT[lv];
    hazardSvg = `<circle cx="${330 + s}" cy="112" r="72" fill="#8E8E88"/><circle cx="${384 + s}" cy="76" r="62" fill="#9A9A94"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="${vx} ${vy} ${vw} ${vh}" preserveAspectRatio="xMidYMid slice">
<rect x="-200" y="-200" width="800" height="700" fill="#D2D3D1"/><rect x="-200" y="236" width="800" height="264" fill="#B5B6B2"/>
${hazard === 'tree' ? hazardSvg : ''}
<rect x="188" y="-200" width="24" height="500" fill="#6B7075"/>
<path d="M-200 56 Q 0 70 113 64 M113 64 Q 207 78 301 64 M301 64 Q 450 74 600 56" fill="none" stroke="#3B4046" stroke-width="2"/>
<rect x="86" y="80" width="228" height="12" rx="2" fill="#51565B"/>
<rect x="108" y="64" width="10" height="16" rx="2" fill="#E6E1D6"/><rect x="296" y="64" width="10" height="16" rx="2" fill="#E6E1D6"/>
<rect x="130" y="150" width="140" height="10" rx="2" fill="#51565B"/><rect x="214" y="170" width="44" height="58" rx="6" fill="#7D8388"/>
${hazard === 'nest' ? hazardSvg : ''}
</svg>`;
}

function toDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function sceneBoxes({ hazard, level }: SceneOptions): { kind: Detection['kind']; box: Box; score: number }[] {
  const lv = level ?? 1;
  const boxes: { kind: Detection['kind']; box: Box; score: number }[] = [
    { kind: 'pole', box: [178, 4, 44, 292], score: 0.97 },
  ];
  if (hazard === 'nest') {
    const n = NEST_SHAPE[lv];
    boxes.push({ kind: 'nest', box: [n.cx - n.rx - 6, n.cy - n.ry - 6, n.rx * 2 + 12, n.ry * 2 + 12], score: 0.91 });
  } else if (hazard === 'tree') {
    const s = TREE_SHIFT[lv];
    boxes.push({ kind: 'tree', box: [258 + s, 14, 188, 170], score: 0.84 });
  }
  return boxes;
}

/** 장면 좌표 박스를 크롭 이미지 기준 0~1 박스로 바꾸고 이미지 밖은 잘라낸다. */
export function projectBox([bx, by, bw, bh]: Box, [vx, vy, vw, vh]: ViewBox): NormalizedBox | null {
  const x0 = Math.max(0, (bx - vx) / vw);
  const y0 = Math.max(0, (by - vy) / vh);
  const x1 = Math.min(1, (bx + bw - vx) / vw);
  const y1 = Math.min(1, (by + bh - vy) / vh);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function mockCrop(opts: SceneOptions, view: ViewBox): { url: string; detections: Detection[] } {
  const detections: Detection[] = [];
  for (const b of sceneBoxes(opts)) {
    const box = projectBox(b.box, view);
    if (box) detections.push({ kind: b.kind, box, score: b.score });
  }
  return { url: toDataUrl(sceneSvg(opts, view)), detections };
}

export function mockThumbnail(opts: SceneOptions): string {
  return toDataUrl(sceneSvg(opts, [0, 0, SCENE_W, SCENE_H]));
}
