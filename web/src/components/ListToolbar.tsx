import { Children, Fragment, isValidElement, useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { BottomSheet } from './Controls';
import { IconButton } from './IconButton';
import { Button } from './ui/button';
import { useBreakpoint } from '../lib/useMedia';

function mobileFields(nodes: ReactNode): ReactNode {
  return Children.map(nodes, (node) => {
    if (!isValidElement<{ children?: ReactNode; 'aria-label'?: string }>(node)) return node;
    if (node.type === Fragment) return mobileFields(node.props.children);
    const label = node.props['aria-label'];
    return label ? <div className="mobile-filter-field"><span>{label}</span>{node}</div> : node;
  });
}

export function ListToolbar({ search, filters, count, actions, activeCount = 0 }: {
  search: ReactNode; filters: ReactNode; count: ReactNode; actions?: ReactNode; activeCount?: number;
}) {
  const mobile = useBreakpoint() === 'mobile';
  const [open, setOpen] = useState(false);
  if (!mobile) return <div className="detail__toolbar">{search}{filters}{count}{actions}</div>;
  return <div className="mobile-list-toolbar">
    {search}
    <div className="mobile-list-toolbar__actions">
      {count}
      <IconButton icon={SlidersHorizontal} label={activeCount ? `Lọc danh sách, ${activeCount} điều kiện đang áp dụng` : 'Lọc danh sách'}
        badge={activeCount} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} />
      {actions}
    </div>
    <BottomSheet open={open} onClose={() => setOpen(false)} title="Lọc danh sách"
      footer={<Button className="w-full" onClick={() => setOpen(false)}>Xem kết quả</Button>}>
      <div className="mobile-list-filters">{mobileFields(filters)}</div>
    </BottomSheet>
  </div>;
}
