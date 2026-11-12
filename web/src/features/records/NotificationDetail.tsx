import { Button } from '@/shared/ui/button';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { failReason, retryNotifications, retryOf } from '@/shared/api/mockApi';
import { ProtoBadge } from '@/shared/components/Proto';
import { BlockError } from '@/shared/components/Blocks';
import { DELIVERY, SEND } from '@/shared/lib/status';
import { GroupTags, Pill } from '@/shared/components/Status';
import { notifications, taxpayers } from '@/shared/data/mock';
import { useCurrentUser, usePermissions } from '@/shared/demo/useDemo';
import { dmyhm, duration, hm } from '@/shared/lib/format';
import type { Notification } from '@/shared/data/types';
import { pushText } from './pushText';
import { PushPreview } from './PushPreview';
import { Officer, OutOfScope } from './DetailParts';

function FullContent({ n }: { n: Notification }) {
  const tp = taxpayers[n.taxpayerId];
  if (n.groups.includes('D4')) {
    return (
      <div className="full-content">
        <h4>{n.title}</h4>
        <p>Kính gửi {tp.name} (MST {tp.mst}),</p>
        <p>Doanh thu ghi nhận từ đầu năm 2026 đạt 812.400.000 đồng, bằng 81,2% ngưỡng sử dụng hóa đơn 1.000.000.000 đồng.</p>
        <p>Cơ quan thuế đề nghị chuẩn bị đăng ký sử dụng hóa đơn trước khi doanh thu vượt ngưỡng.</p>
      </div>
    );
  }
  return (
    <div className="full-content">
      <h4>{n.title}</h4>
      <p>Kính gửi {tp.name} (MST {tp.mst}),</p>
      {n.groups.includes('D1a') && <p>Hồ sơ khai thuế quý III/2026 chưa được nộp. Hạn nộp: 30/10/2026.</p>}
      {n.groups.includes('D1b') && <p>Số tiền thuế còn phải nộp: 1.250.000 đồng. Hạn nộp: 30/10/2026.</p>}
      <p>Vui lòng hoàn thành trên Cổng dịch vụ công hoặc liên hệ Thuế cơ sở A để được hỗ trợ.</p>
    </div>
  );
}

/* ---------- Chi tiết thông báo ---------- */

/** [Thêm] Lý do lỗi và gửi lại một thông báo thất bại. */
function RetryOne({ id, onDone }: { id: string; onDone: () => void }) {
  const qc = useQueryClient();
  const user = useCurrentUser();
  const n = notifications.find((x) => x.id === id)!;
  const reason = failReason(n);
  const m = useMutation({
    mutationFn: () => retryNotifications([id], user.name),
    onSuccess: () => {
      toast.success('Đã đưa thông báo vào lượt gửi kế tiếp.');
      qc.invalidateQueries();
      onDone();
    },
    onError: () => toast.error('Không gửi lại được. Thử lại sau.'),
  });
  return (
    <div className="retry-one">
      <dl className="kv">
        <dt>Lý do lỗi</dt>
        <dd>
          {reason.text}
        </dd>
        {reason.fix && (
          <>
            <dt>Cần làm</dt>
            <dd>{reason.fix}</dd>
          </>
        )}
      </dl>
      <div className="retry-one__actions">
        <Button disabled={!reason.retry || m.isPending} onClick={() => m.mutate()}>
          {m.isPending ? 'Đang gửi lại…' : 'Gửi lại'}
        </Button>
        <ProtoBadge note="Chỉ gửi lại lỗi tạm thời; lỗi dữ liệu phải sửa trước khi gửi lại." />
        {!reason.retry && <span className="chart-note">Chưa gửi lại được vì lỗi nằm ở dữ liệu NNT.</span>}
      </div>
    </div>
  );
}

export function NotificationDetail({ id }: { id: string }) {
  const { canSeeTaxpayer } = usePermissions();
  const [, bump] = useState(0);
  const n = notifications.find((x) => x.id === id);
  if (!n) return <BlockError message="Không tìm thấy thông báo." onRetry={() => location.reload()} />;
  if (!canSeeTaxpayer(n.taxpayerId)) return <OutOfScope />;
  const tp = taxpayers[n.taxpayerId];
  const delivery = n.delivery;
  const push = pushText(n);
  return (
    <>
      <section className="ov-section">
        <dl className="kv">
          <dt>Người nhận</dt>
          <dd>
            {tp.name} · MST {tp.mst}
          </dd>
          <dt>Cán bộ phụ trách</dt>
          <dd><Officer taxpayerId={n.taxpayerId} /></dd>
          <dt>Nhóm</dt>
          <dd>
            <GroupTags groups={n.groups} />
          </dd>
          <dt>Thời điểm tạo</dt>
          <dd>{dmyhm(n.createdAt)}</dd>
          <dt>Đợt gửi</dt>
          <dd className="id">{n.runId}</dd>
        </dl>
      </section>
      <section className="ov-section">
        <h3 className="ov-section__title">Kết quả</h3>
        <dl className="kv">
          <dt>Gửi tới trung tâm</dt>
          <dd><Pill map={SEND} value={n.send} /></dd>
          <dt>Giao tới người dùng</dt>
          <dd><Pill map={DELIVERY} value={delivery} /></dd>
          {n.deliveredAt && delivery === 'DELIVERED' && (
            <>
              <dt>Thời gian phản hồi</dt>
              <dd>{duration((new Date(n.deliveredAt).getTime() - new Date(n.createdAt).getTime()) / 60_000)}</dd>
            </>
          )}
        </dl>
        {n.send === 'FAILED' && <RetryOne id={n.id} onDone={() => bump((x) => x + 1)} />}
      </section>
      <section className="ov-section">
        <h3 className="ov-section__title">Bản đẩy</h3>
        <PushPreview {...push} />
      </section>
      <section className="ov-section">
        <h3 className="ov-section__title">Nội dung đầy đủ</h3>
        <FullContent n={n} />
      </section>
      <section className="ov-section">
        <h3 className="ov-section__title">Diễn biến</h3>
        <ol className="timeline">
          <li><time>{hm(n.createdAt)}</time><span>Tạo thông báo trong lượt rà soát</span></li>
          {n.processedAt && <li><time>{hm(n.processedAt)}</time><span>{SEND[n.send].label}</span></li>}
          {n.deliveredAt && delivery === 'DELIVERED' && <li><time>{hm(n.deliveredAt)}</time><span>iHanoi tiếp nhận</span></li>}
          {retryOf(n.id) && <li><time>{hm(retryOf(n.id)!.at)}</time><span>Gửi lại theo yêu cầu của {retryOf(n.id)!.by}</span></li>}
          {n.send === 'PENDING' && <li><time>—</time><span>Đang chờ tới lượt trong khung 06:00–10:00</span></li>}
        </ol>
      </section>
    </>
  );
}
