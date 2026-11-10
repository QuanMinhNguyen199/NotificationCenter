import { Panel } from '@/components/Blocks';
import { ProtoBadge, ProtoNote } from '@/components/Proto';
import { StatusPill } from '@/components/Status';
import { INITIAL_CONFIG } from '../data/config';
import { SEVERITY, TYPES, severityRange, type SendMode, type TypeMeta } from './notifyPlanApi';
import './notify.css';

const MODES: { mode: SendMode; title: string; desc: string }[] = [
  { mode: 'window', title: 'Theo khung giờ', desc: `Hệ thống rà soát lúc ${INITIAL_CONFIG.scanTime} hằng ngày, xếp hàng và gửi trong khung ${INITIAL_CONFIG.sendStart}–${INITIAL_CONFIG.sendEnd}.` },
  { mode: 'event', title: 'Gửi ngay theo sự kiện', desc: 'Gửi khi hệ thống nguồn trả kết quả, không chờ khung giờ.' },
];

/** Danh mục 8 loại thông báo: điều kiện gửi, cách gửi, trạng thái trong hệ thống. */
export function NotificationTypes() {
  const live = TYPES.filter((t) => t.live).length;
  return (
    <Panel
      id="nt-types-title"
      title="Các loại thông báo"
      sub={`${TYPES.length} loại; ${live} loại đang chạy trong hệ thống, ${TYPES.length - live} loại còn lại là giả lập để duyệt luồng.`}
      className="nt-panel"
    >
      {MODES.map((m) => {
        const list = TYPES.filter((t) => t.mode === m.mode);
        return (
          <section key={m.mode} className="nt-mode" aria-labelledby={`nt-mode-${m.mode}`}>
            <h3 id={`nt-mode-${m.mode}`} className="nt-mode__title">{m.title} <span className="nt-group__count">({list.length})</span></h3>
            <p className="nt-mode__desc">{m.desc}</p>
            <ul className="nt-types">{list.map((t) => <TypeCard key={t.id} t={t} />)}</ul>
          </section>
        );
      })}
    </Panel>
  );
}

function TypeCard({ t }: { t: TypeMeta }) {
  return (
    <li className="nt-type">
      <div className="nt-type__head">
        <h4 className="nt-type__name"><i className="swatch" style={{ background: t.color }} aria-hidden="true" />{t.label}</h4>
        {t.live ? <StatusPill tone="success">Đang chạy</StatusPill> : <ProtoBadge kind="mock" note="loại này chưa chạy trong hệ thống; lịch và kết quả chỉ mô phỏng" />}
      </div>
      <dl className="nt-type__facts">
        <div><dt>Khi nào gửi</dt><dd>{t.trigger}</dd></div>
        <div><dt>Cách gửi</dt><dd>{t.mode === 'window' ? `Theo khung giờ ${INITIAL_CONFIG.sendStart}–${INITIAL_CONFIG.sendEnd}` : 'Gửi ngay theo sự kiện'}</dd></div>
        {t.groups && <div><dt>Nhóm quy tắc</dt><dd>{t.groups}</dd></div>}
      </dl>
      {t.id === 'overdue' && (
        <div className="nt-sev">
          <ProtoNote kind="proposal">Chia mức theo số ngày quá hạn và giãn nhịp nhắc khi quá hạn lâu, để hộ quá hạn dài không nhận tin mỗi ngày. Ngưỡng ngày cần nghiệp vụ chốt.</ProtoNote>
          <table className="mini-table nt-sev__table">
            <caption className="sr-only">Mức quá hạn đề xuất</caption>
            <thead><tr><th scope="col">Mức</th><th scope="col">Số ngày quá hạn</th><th scope="col">Nhịp nhắc</th></tr></thead>
            <tbody>
              {SEVERITY.map((s) => (
                <tr key={s.level}><th scope="row">{s.label}</th><td>{severityRange(s)}</td><td>{s.every} ngày/lần</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {t.id === 'signature' && <ProtoNote kind="proposal">Nhắc hai lần: trước hạn 30 ngày và 7 ngày.</ProtoNote>}
    </li>
  );
}
