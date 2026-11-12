import { teamName, useStaff } from '@/shared/demo/useDemo';
import { officerOf } from '@/shared/data/org';

export const OutOfScope = () => <p className="chart-note">NNT này không thuộc phạm vi tài khoản của bạn.</p>;

/** Cán bộ phụ trách NNT, kèm tổ. */
export function Officer({ taxpayerId }: { taxpayerId: number }) {
  const s = useStaff().find((x) => x.id === officerOf[taxpayerId]);
  return <>{s ? `${s.name} · ${teamName(s.team)}` : '—'}</>;
}
