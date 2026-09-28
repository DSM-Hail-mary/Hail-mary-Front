import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from './__fixtures__/deviceSessionLatest.json';
import { createHttpApi } from './httpApi';

const BASE = 'http://127.0.0.1:8000';

function stubFetch(impl: (url: string) => Promise<Response>) {
  const fn = vi.fn((input: RequestInfo | URL) => impl(String(input)));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('HTTP API', () => {
  it('기기 상태: 명세 경로로 요청하고 앱 형식으로 바꾼다', async () => {
    const fetchMock = stubFetch(async () => json(fixture));
    const s = await createHttpApi(BASE).getLatestDeviceSession();
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/api/device/session/latest`, expect.anything());
    expect(s?.device).toBe('Jetson Nano');
    expect(s?.samples).toHaveLength(22);
  });

  it('기기 상태 404 {"detail": "세션 기록 없음"} → null (기록 없음)', async () => {
    stubFetch(async () => json({ detail: '세션 기록 없음' }, 404));
    expect(await createHttpApi(BASE).getLatestDeviceSession()).toBeNull();
  });

  it('서버 오류는 FastAPI detail 문구를 살려 알린다', async () => {
    stubFetch(async () => json({ detail: 'DB 잠김' }, 500));
    await expect(createHttpApi(BASE).getLatestDeviceSession()).rejects.toMatchObject({
      status: 500,
      message: '서버 오류 500: DB 잠김',
    });
  });

  it('서버에 연결하지 못하면 "Failed to fetch" 대신 알아볼 수 있는 문구', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(createHttpApi(BASE).listRecords('2026-09-27')).rejects.toMatchObject({
      message: `서버에 연결할 수 없습니다 (${BASE})`,
    });
  });

  it('명세와 다른 응답은 어느 필드가 틀렸는지 알린다', async () => {
    stubFetch(async () => json({ ...fixture, gps_reception: 'high' }));
    await expect(createHttpApi(BASE).getLatestDeviceSession()).rejects.toThrow(
      /응답 형식이 맞지 않습니다[\s\S]*gps_reception/,
    );
  });

  it('주소 끝의 / 는 한 번만 붙는다', async () => {
    const fetchMock = stubFetch(async () => json([]));
    await createHttpApi(`${BASE}/`).listDriveDates();
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}/api/v1/drives/dates`, expect.anything());
  });
});
