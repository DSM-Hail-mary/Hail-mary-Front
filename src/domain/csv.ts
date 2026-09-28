import { GRADE_LABEL, hazardLabel, poleIdLabel, statusLabel } from './labels';
import { formatDateTime } from './format';
import type { PoleRecord } from './types';

/** 명세서 4.6 내보내기 열: 전주 ID, 좌표, 등급, 위험 유형, 기록 시각, 처리 상태 (+ 검수). */
const HEADER = ['전주 ID', '위도', '경도', '등급', '위험 유형', '기록 시각', '처리 상태', '검수'];

const REVIEW_LABEL = { correct: '맞음', false_positive: '오탐' } as const;

function escapeCell(value: string): string {
  // 스프레드시트 수식 주입 방지: =,+,-,@ 로 시작하면 작은따옴표를 붙인다.
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function recordsToCsv(records: readonly PoleRecord[]): string {
  const rows = records.map((r) => [
    poleIdLabel(r.poleId),
    r.position ? r.position.lat.toFixed(6) : '',
    r.position ? r.position.lng.toFixed(6) : '',
    GRADE_LABEL[r.grade],
    hazardLabel(r.hazard),
    formatDateTime(r.recordedAt),
    statusLabel(r.status),
    r.review ? REVIEW_LABEL[r.review] : '미검수',
  ]);
  return [HEADER, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

/** 엑셀이 한글을 깨뜨리지 않도록 BOM을 붙여 내려받는다. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
