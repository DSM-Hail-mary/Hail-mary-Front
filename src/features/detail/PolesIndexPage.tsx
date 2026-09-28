import { Navigate } from 'react-router';
import { useRecords } from '@/api/queries';
import { useNavMemory } from '@/app/navMemory';
import { routes } from '@/app/routes';
import { today } from '@/domain/format';
import { sortRecords } from '@/domain/records';
import { Button, ButtonLink } from '@/ui/Button';
import { EmptyState, Loading } from '@/ui/EmptyState';

/**
 * 상세 탭을 기록 없이 열었을 때: 지도에서 보던 날짜의 첫 위험 전주(없으면 첫 기록)로 보낸다.
 */
export function PolesIndexPage() {
  const { mapDate } = useNavMemory();
  const date = mapDate ?? today();
  const { data, isPending, isError, error, refetch } = useRecords(date);

  if (isPending) return <Loading />;
  // 불러오기에 실패했는데 "선택된 전주가 없습니다"라고 하면 기록이 없는 것처럼 보인다
  if (isError) {
    return (
      <EmptyState
        icon="error"
        title="기록을 불러오지 못했습니다"
        action={<Button onClick={() => void refetch()}>다시 불러오기</Button>}
      >
        {error.message}
      </EmptyState>
    );
  }
  const sorted = sortRecords(data ?? [], 'time');
  const first = sorted.find((r) => r.grade === 'danger') ?? sorted[0];
  if (first) return <Navigate to={routes.pole(first.id)} replace />;

  return (
    <EmptyState
      icon="pole"
      title="선택된 전주가 없습니다"
      action={
        <ButtonLink to={routes.map()} variant="secondary">
          지도에서 고르기
        </ButtonLink>
      }
    >
      지도나 목록에서 전주를 고른 뒤 상세 보기를 누르세요.
    </EmptyState>
  );
}
