import { useQuery } from '@tanstack/react-query';
import { AlarmClock, Bell, MessagesSquare, ReceiptText } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skel } from '../components/Blocks';
import { ProtoBadge, ProtoNote } from '../components/Proto';
import { usePermissions } from '../demo/DemoContext';
import { dmyhm } from '../lib/format';
import { useRoute, type RoutePath } from '../lib/router';
import { fetchBell, isRead, markRead, readSnapshot, subscribeRead, type BellItem } from './routingApi';
import { ago, useRoutingScope } from './useRouting';
import './routing.css';

const ICON = { ESCALATION: MessagesSquare, OVERDUE: AlarmClock, THRESHOLD: ReceiptText } as const;

/** Chuông báo trên thanh trên cùng: ca chuyển tuyến mới và hộ có dấu hiệu bất thường trong 24 giờ qua. */
export function NotificationBell() {
  const scope = useRoutingScope();
  const { user } = usePermissions();
  const { navigate } = useRoute();
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['routing', 'bell', scope], queryFn: () => fetchBell(scope) });
  useSyncExternalStore(subscribeRead, readSnapshot);

  const items = q.data ?? [];
  const unread = items.filter((i) => !isRead(user.id, i.id)).length;
  const escalations = items.filter((i) => i.kind === 'ESCALATION');
  const abnormal = items.filter((i) => i.kind !== 'ESCALATION');

  const go = (i: BellItem) => {
    markRead(user.id, [i.id]);
    setOpen(false);
    if (i.caseId) navigate('/chuyen-tuyen' as RoutePath, { ca: i.caseId });
    else navigate('/quan-ly-hkd', { muc: 'danh-sach', detail: `t:${i.taxpayer.id}` });
  };

  const group = (title: string, list: BellItem[]) =>
    list.length > 0 && (
      <section className="rt-pop__group" aria-label={`${title}, ${list.length} mục`}>
        <h3 className="rt-pop__group-title">
          {title} <span className="rt-count">{list.length}</span>
        </h3>
        <ul>
          {list.map((i) => {
            const Icon = ICON[i.kind];
            const unreadItem = !isRead(user.id, i.id);
            return (
              <li key={i.id}>
                <button type="button" className={`rt-item${unreadItem ? ' rt-item--unread' : ''}`} onClick={() => go(i)}>
                  <Icon aria-hidden="true" />
                  <span>
                    <span className="rt-item__title">{i.title}</span>
                    <span className="rt-item__sub">
                      {i.taxpayer.name}, <time dateTime={i.at} title={dmyhm(i.at)}>{ago(i.at)}</time>
                    </span>
                  </span>
                  {unreadItem ? (
                    <span className="rt-item__dot">
                      <span className="sr-only">Chưa đọc</span>
                    </span>
                  ) : (
                    <span />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="rt-bell" aria-label={unread ? `Thông báo cho cán bộ, ${unread} chưa đọc` : 'Thông báo cho cán bộ'}>
          <Bell aria-hidden="true" />
          {unread > 0 && (
            <span className="rt-bell__badge" aria-hidden="true">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="rt-pop w-[min(380px,calc(100vw-24px))] gap-0 p-0">
        <div className="rt-pop__head">
          <h2 className="rt-pop__title">Trong 24 giờ qua</h2>
          <ProtoBadge kind="mock" note="Thông báo cho cán bộ được mô phỏng, chưa nối hệ thống thật" />
          <Button variant="ghost" size="sm" className="rt-pop__mark" disabled={!unread} onClick={() => markRead(user.id, items.map((i) => i.id))}>
            Đánh dấu đã đọc
          </Button>
        </div>
        <div className="rt-pop__body">
          {q.isError ? (
            <div className="rt-pop__state" role="alert">
              <span>Không tải được thông báo.</span>
              <Button variant="outline" size="sm" onClick={() => q.refetch()}>
                Thử lại
              </Button>
            </div>
          ) : !q.data ? (
            <div className="rt-pop__state" aria-busy="true" aria-label="Đang tải thông báo">
              <Skel w="90%" h={14} />
              <Skel w="70%" h={14} />
              <Skel w="80%" h={14} />
            </div>
          ) : items.length === 0 ? (
            <p className="rt-pop__state">Không có ca chuyển tuyến mới hay hộ có dấu hiệu bất thường trong 24 giờ qua.</p>
          ) : (
            <>
              {group('Ca chuyển tuyến mới', escalations)}
              {group('Hộ có dấu hiệu bất thường', abnormal)}
            </>
          )}
        </div>
        <div className="rt-pop__foot">
          <ProtoNote kind="proposal">Dấu hiệu bất thường: hộ chuyển sang quá hạn, hoặc doanh thu vượt ngưỡng phải dùng hóa đơn điện tử, trong 24 giờ qua.</ProtoNote>
        </div>
      </PopoverContent>
    </Popover>
  );
}
