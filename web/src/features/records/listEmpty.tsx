import { Button } from '@/shared/ui/button';
import type { ReactNode } from 'react';
import { BlockEmpty } from '@/shared/components/Blocks';
import { GROUPS } from '@/shared/data/config';
import type { StatsParams } from '@/features/stats/useStatsParams';

/** Nội dung khi danh sách rỗng: nhóm chưa sử dụng, hoặc gợi ý đặt lại bộ lọc. */
export function useEmpty(p: StatsParams, reset: () => void): ReactNode {
  const g = p.group !== 'all' ? GROUPS.find((x) => x.id === p.group) : null;
  if (g?.unused) {
    return (
      <BlockEmpty>
        <b>{g.name}</b> chưa sử dụng nên chưa phát sinh thông báo để thống kê.
      </BlockEmpty>
    );
  }
  return (
    <BlockEmpty action={<Button variant="outline" onClick={reset}>Đặt lại bộ lọc</Button>}>Không có kết quả phù hợp với bộ lọc hiện tại.</BlockEmpty>
  );
}
