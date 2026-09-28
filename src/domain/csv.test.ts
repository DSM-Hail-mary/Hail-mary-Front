import { describe, expect, it } from 'vitest';
import { recordsToCsv } from './csv';
import { makeRecord } from './testing';

describe('recordsToCsv', () => {
  it('헤더와 행을 명세 순서로 만든다', () => {
    const csv = recordsToCsv([makeRecord()]);
    const [header, row] = csv.split('\r\n');
    expect(header).toBe('전주 ID,위도,경도,등급,위험 유형,기록 시각,처리 상태,검수');
    expect(row).toBe('3501-12669-N,35.014620,126.691830,위험,까치집,2026-09-27 09:15:22,신규,미검수');
  });

  it('위치 없음·양호·오탐 기록', () => {
    const csv = recordsToCsv([
      makeRecord({ poleId: null, position: null, grade: 'ok', hazard: null, status: null, review: 'false_positive' }),
    ]);
    expect(csv.split('\r\n')[1]).toBe('ID 미할당,,,양호,이상 없음,2026-09-27 09:15:22,해당 없음,오탐');
  });

  it('쉼표·따옴표를 이스케이프하고 수식 주입을 막는다', () => {
    const csv = recordsToCsv([makeRecord({ poleId: '=HYPERLINK("x"),1' })]);
    expect(csv.split('\r\n')[1]?.startsWith(`"'=HYPERLINK(""x""),1"`)).toBe(true);
  });
});
