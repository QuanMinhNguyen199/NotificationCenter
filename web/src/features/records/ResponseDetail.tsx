import { useQuery } from '@tanstack/react-query';
import { fetchResponse, type StatsFilter } from '@/shared/api/mockApi';
import { BlockError, Skel } from '@/shared/components/Blocks';
import { usePermissions } from '@/shared/demo/useDemo';
import { dm, dmy, duration, num, pct } from '@/shared/lib/format';
import { InfoTip } from '@/shared/components/InfoTip';

/* ---------- Thời gian phản hồi ---------- */

/** Giờ:phút gọn cho bảng, ví dụ 5:48. */
const hhmm = (min: number | null) => (min == null ? '—' : `${Math.floor(Math.round(min) / 60)}:${String(Math.round(min) % 60).padStart(2, '0')}`);

export function ResponseDetail({ filter }: { filter: StatsFilter }) {
  const { scopeLabel } = usePermissions();
  const q = useQuery({ queryKey: ['response', filter], queryFn: () => fetchResponse(filter) });
  if (q.isError) return <BlockError message="Không tải được thời gian phản hồi." onRetry={() => q.refetch()} />;
  if (!q.data) return <Skel w="100%" h={240} />;
  const r = q.data;
  const scope = `${scopeLabel(filter.unit)}, ${dm(filter.from)}–${dmy(filter.to)}`;
  if (r.total == null) {
    return <p className="chart-note">Chưa có thông báo nào có mốc iHanoi tiếp nhận trong phạm vi {scope}.</p>;
  }
  const sendShare = (r.toSend! / r.total) * 100;

  return (
    <>
      <section className="ov-section">
        <p className="caption-line">{scope}.</p>
        <div className="resp">
          <div className="resp__total">
            <small className="title-with-tip">Trung bình từ lúc tạo tới khi iHanoi tiếp nhận<InfoTip>Tính trên {num(r.count)} thông báo có mốc iHanoi tiếp nhận trong phạm vi {scope}.</InfoTip></small>
            <b>{duration(r.total)}</b>
          </div>
          <div className="resp__bar" role="img" aria-label={`Tạo tới gửi chiếm ${pct(r.toSend!, r.total)}, gửi tới giao chiếm ${pct(r.toDeliver!, r.total)}`}>
            <span className="resp__seg resp__seg--send" style={{ width: `${sendShare}%` }} />
            <span className="resp__seg resp__seg--deliver" style={{ width: `${100 - sendShare}%` }} />
          </div>
          <dl className="resp__legs">
            <div>
              <dt><i className="resp__dot resp__dot--send" aria-hidden="true" />Tạo → gửi<InfoTip>Từ lúc tạo thông báo tới lúc gửi, gồm thời gian chờ tới khung giờ gửi và xếp lượt gửi.</InfoTip></dt>
              <dd>{duration(r.toSend!)}</dd>
            </div>
            <div>
              <dt><i className="resp__dot resp__dot--deliver" aria-hidden="true" />Gửi → iHanoi tiếp nhận<InfoTip>Từ khi gửi tới iHanoi tới khi iHanoi xác nhận tiếp nhận. Chưa có xác nhận đã tới máy người nhận.</InfoTip></dt>
              <dd>{duration(r.toDeliver!)}</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="ov-section">
        <h3 className="ov-section__title title-with-tip">Theo ngày tạo<InfoTip>Thời gian trung bình của các thông báo tạo trong ngày, đơn vị giờ:phút.</InfoTip></h3>
        <table className="mini-table">
          <thead>
            <tr>
              <th scope="col">Ngày</th>
              <th scope="col">Tiếp nhận</th>
              <th scope="col">Tạo → gửi</th>
              <th scope="col">Gửi → tiếp nhận</th>
              <th scope="col">Tổng</th>
            </tr>
          </thead>
          <tbody>
            {r.byDay.map((d) => (
              <tr key={d.date}>
                <th scope="row">{dm(d.date)}</th>
                <td>{num(d.count)}</td>
                <td>{hhmm(d.toSend)}</td>
                <td>{hhmm(d.toDeliver)}</td>
                <td><b>{hhmm(d.total)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
