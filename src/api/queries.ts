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

/**
 * 처리 상태·검수 결과 변경. 화면에 바로 반영(낙관적 업데이트)하고
 * 서버가 거절하면 이전 값으로 되돌린다.
 */
export function useUpdateRecord() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ record, patch }: { record: PoleRecord; patch: RecordPatch }) => api.updateRecord(record.id, patch),
    onMutate: async ({ record, patch }) => {
      await qc.cancelQueries({ queryKey: queryKeys.all });
      const previous =
        findCachedRecord(qc, record.id) ?? qc.getQueryData<PoleRecord>(queryKeys.record(record.id)) ?? record;
      writeRecord(qc, { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) writeRecord(qc, context.previous);
    },
    onSuccess: (saved) => writeRecord(qc, saved),
  });
}

/**
 * 상단 바 동기화 상태. 주기적으로 묻고, 진행 중 → 완료로 바뀌면
 * 새 기록이 들어왔을 수 있으니 데이터 쿼리를 모두 새로 받는다.
 */
export function useSyncStatus() {
  const api = useApi();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.sync(),
    queryFn: () => api.getSyncStatus(),
    refetchInterval: (q) => (q.state.data?.state === 'syncing' ? 1000 : config.syncPollMs),
  });

  const prevState = useRef(query.data?.state);
  useEffect(() => {
    const state = query.data?.state;
    if (prevState.current === 'syncing' && state === 'done') {
      void qc.invalidateQueries({ queryKey: queryKeys.all });
    }
    prevState.current = state;
  }, [query.data?.state, qc]);

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
