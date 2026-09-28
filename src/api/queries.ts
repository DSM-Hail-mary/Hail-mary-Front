import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { config } from '@/config';
import { dateOf } from '@/domain/format';
import type { PoleRecord, RecordPatch } from '@/domain/types';
import { useApi } from './ApiProvider';

/** 쿼리 키를 한곳에서 만든다. 무효화할 때도 이 함수를 쓴다. */
export const queryKeys = {
  all: ['polewatch'] as const,
  driveDates: () => [...queryKeys.all, 'drive-dates'] as const,
  drives: (date: string) => [...queryKeys.all, 'drives', date] as const,
  records: (date: string) => [...queryKeys.all, 'records', date] as const,
  record: (id: string) => [...queryKeys.all, 'record', id] as const,
  deviceLog: (driveId: string) => [...queryKeys.all, 'device-log', driveId] as const,
  sync: () => ['sync'] as const,
};

export function useDriveDates() {
  const api = useApi();
  return useQuery({ queryKey: queryKeys.driveDates(), queryFn: () => api.listDriveDates() });
}

export function useDrives(date: string) {
  const api = useApi();
  return useQuery({ queryKey: queryKeys.drives(date), queryFn: () => api.listDrives(date) });
}

export function useRecords(date: string) {
  const api = useApi();
  return useQuery({ queryKey: queryKeys.records(date), queryFn: () => api.listRecords(date) });
}

export function useRecord(id: string | undefined) {
  const api = useApi();
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.record(id ?? ''),
    queryFn: () => api.getRecord(id!),
    enabled: !!id,
    // 목록에서 이미 받아 둔 기록이 있으면 먼저 보여 준다.
    initialData: () => (id ? findCachedRecord(qc, id) : undefined),
  });
}

export function useDeviceLog(driveId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: queryKeys.deviceLog(driveId ?? ''),
    queryFn: () => api.getDeviceLog(driveId!),
    enabled: !!driveId,
  });
}

function findCachedRecord(qc: QueryClient, id: string): PoleRecord | undefined {
  for (const [, list] of qc.getQueriesData<PoleRecord[]>({ queryKey: [...queryKeys.all, 'records'] })) {
    const hit = list?.find((r) => r.id === id);
    if (hit) return hit;
  }
  return undefined;
}

function writeRecord(qc: QueryClient, record: PoleRecord) {
  qc.setQueryData(queryKeys.record(record.id), record);
  qc.setQueryData<PoleRecord[]>(queryKeys.records(dateOf(record.recordedAt)), (list) =>
    list?.map((r) => (r.id === record.id ? record : r)),
  );
}

function patchCachedRecord(qc: QueryClient, id: string, date: string, patch: RecordPatch) {
  qc.setQueryData<PoleRecord>(queryKeys.record(id), (r) => (r ? { ...r, ...patch } : r));
  qc.setQueryData<PoleRecord[]>(queryKeys.records(date), (list) =>
    list?.map((r) => (r.id === id ? { ...r, ...patch } : r)),
  );
}

/**
 * 처리 상태·검수 결과 변경. 화면에 바로 반영(낙관적 업데이트)하고
 * 서버가 거절하면 바꾼 필드만 이전 값으로 되돌린다.
 * 같은 기록의 저장은 순서대로 하나씩 보낸다 (scope) — 앞 저장의 되돌리기가 뒤 저장을 덮지 않도록.
 */
export function useUpdateRecord(recordId: string) {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    scope: { id: `record:${recordId}` },
    mutationFn: ({ record, patch }: { record: PoleRecord; patch: RecordPatch }) => api.updateRecord(record.id, patch),
    onMutate: async ({ record, patch }) => {
      const date = dateOf(record.recordedAt);
      // 이 기록과 관련된 조회만 멈춘다. 다른 화면의 첫 로딩을 끊지 않도록 범위를 좁힌다.
      await Promise.all([
        qc.cancelQueries({ queryKey: queryKeys.record(record.id), exact: true }),
        qc.cancelQueries({ queryKey: queryKeys.records(date), exact: true }),
      ]);
      const current =
        findCachedRecord(qc, record.id) ?? qc.getQueryData<PoleRecord>(queryKeys.record(record.id)) ?? record;
      const previous: RecordPatch = {};
      if ('status' in patch) previous.status = current.status;
      if ('review' in patch) previous.review = current.review;
      patchCachedRecord(qc, record.id, date, patch);
      return { previous, date };
    },
    onError: (_error, { record }, context) => {
      if (context) patchCachedRecord(qc, record.id, context.date, context.previous);
    },
    onSuccess: (saved) => writeRecord(qc, saved),
    onSettled: (_data, _error, { record }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.record(record.id), exact: true });
      void qc.invalidateQueries({ queryKey: queryKeys.records(dateOf(record.recordedAt)), exact: true });
    },
  });
}

/**
 * 상단 바 동기화 상태. 주기적으로 묻고, 새 데이터가 들어왔을 수 있으면
 * (마지막 동기화 시각이 바뀌었거나, 진행 중이던 동기화가 끝나거나 실패하면) 데이터 쿼리를 새로 받는다.
 * 폴링 사이에 시작·완료된 동기화도 lastSyncedAt 변화로 잡는다.
 */
export function useSyncStatus() {
  const api = useApi();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.sync(),
    queryFn: () => api.getSyncStatus(),
    refetchInterval: (q) => (q.state.data?.state === 'syncing' ? 1000 : config.syncPollMs),
  });

  const state = query.data?.state;
  const lastSyncedAt = query.data?.lastSyncedAt ?? null;
  const prev = useRef<{ state: typeof state; lastSyncedAt: string | null } | null>(null);
  useEffect(() => {
    const before = prev.current;
    prev.current = { state, lastSyncedAt };
    if (!before || !state) return;
    const finished = before.state === 'syncing' && state !== 'syncing';
    const newSync = before.lastSyncedAt !== lastSyncedAt;
    if (finished || newSync) void qc.invalidateQueries({ queryKey: queryKeys.all });
  }, [state, lastSyncedAt, qc]);

  return query;
}

export function useRetrySync() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.retrySync(),
    onSuccess: (status) => qc.setQueryData(queryKeys.sync(), status),
  });
}
