import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { BlockEmpty, BlockError, Panel, Skel } from '@/components/Blocks';
import { ChoiceSelect } from '@/components/Controls';
import { ProtoBadge, ProtoNote } from '@/components/Proto';
import { StatusPill } from '@/components/Status';
import { Button } from '@/components/ui/button';
import { INITIAL_CONFIG } from '../data/config';
import { usePermissions } from '../demo/DemoContext';
import { num } from '../lib/format';
import { useBreakpoint } from '../lib/useMedia';
import { SEVERITY, TODAY, TYPE, TYPES, fetchPlanMonth, shiftMonth, weekdayIndex, weekdayLong, type NotiType, type PlanDay, type PlanEntry } from './notifyPlanApi';
import './notify.css';
import { TopRows } from '../components/TopRows';

type Filter = NotiType | 'all';
const WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const MIN_YM = '2026-01';
const MAX_YM = '2027-12';

const monthLabel = (ym: string) => `Tháng ${+ym.slice(5, 7)}/${ym.slice(0, 4)}`;
const dayLabel = (iso: string) => `${weekdayLong(iso)} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const countOf = (d: PlanDay, f: Filter) => (f === 'all' ? d.total : d.byType[f]);
const LEVEL_TONE = { 1: 'warning', 2: 'danger', 3: 'danger' } as const;

export function NotificationCalendar() {
  const { user, role, canSeeTaxpayer, scopeLabel, fixedScope, defaultScope } = usePermissions();
  const mobile = useBreakpoint() === 'mobile';
  const [ym, setYm] = useState('2026-11');
  const [filter, setFilter] = useState<Filter>('all');
  const [picked, setPicked] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['notify-plan', ym, user.id, role, user.team],
    queryFn: () => fetchPlanMonth(ym, canSeeTaxpayer),
    placeholderData: keepPreviousData,
  });
  const d = q.data;

  const stats = useMemo(() => {
    if (!d) return null;
    const max = Math.max(0, ...d.days.map((x) => countOf(x, filter)));
    const total = d.days.reduce((s, x) => s + countOf(x, filter), 0);
    const hh = new Set<number>();
    Object.values(d.entries).forEach((l) => l.forEach((e) => (filter === 'all' || e.type === filter) && hh.add(e.taxpayerId)));
    return { max, total, households: hh.size };
  }, [d, filter]);

  // Ngày đang chọn: ngày người dùng bấm, nếu không thì ngày đầu tiên trong tháng có lịch.
  // Mobile: không tự mở ngày nào (danh sách ngày gọn), người dùng chạm để mở/đóng.
  const selected = d && picked && picked.startsWith(d.ym) ? picked : mobile ? null : d?.days.find((x) => countOf(x, filter) > 0)?.date ?? null;
  const go = (delta: number) => { setYm((v) => shiftMonth(v, delta)); setPicked(null); };

  const scope = scopeLabel(fixedScope ?? defaultScope);
  const head = (
    <div className="nt-toolbar">
      <div className="nt-month" role="group" aria-label="Chọn tháng">
        <Button variant="outline" size="icon" className="nt-icon-btn" aria-label="Tháng trước" disabled={ym <= MIN_YM} onClick={() => go(-1)}><ChevronLeft /></Button>
        <h3 className="nt-month__label" aria-live="polite">{monthLabel(ym)}</h3>
        <Button variant="outline" size="icon" className="nt-icon-btn" aria-label="Tháng sau" disabled={ym >= MAX_YM} onClick={() => go(1)}><ChevronRight /></Button>
      </div>
      <ChoiceSelect<Filter>
        aria-label="Lọc theo loại thông báo"
        value={filter}
        onValueChange={(v) => { setFilter(v); setPicked(null); }}
        options={[{ value: 'all', label: 'Tất cả loại' }, ...TYPES.map((t) => ({ value: t.id as Filter, label: t.label }))]}
        style={{ minWidth: 220 }}
      />
    </div>
  );

  let body;
  if (q.isError) body = <BlockError message="Không tải được lịch thông báo." onRetry={() => q.refetch()} />;
  else if (!d || !stats) body = <div className="nt-loading" aria-busy="true"><Skel w="60%" h={16} /><Skel w="100%" h={mobile ? 320 : 420} /></div>;
  else if (d.scopeCount === 0) body = <BlockEmpty>Tài khoản này chưa được giao hộ nào, nên chưa có lịch thông báo.</BlockEmpty>;
  else {
    const typeName = filter === 'all' ? 'thông báo' : `thông báo ${TYPE[filter].label.toLowerCase()}`;
    body = (
      <div className={q.isPlaceholderData ? 'is-stale' : undefined} aria-busy={q.isPlaceholderData}>
        <p className="nt-summary" role="status">
          {stats.total === 0
            ? <>{monthLabel(ym)} chưa có {typeName} dự kiến trong phạm vi {scope.toLowerCase()}.</>
            : <><b>{num(stats.total)}</b> {typeName} dự kiến trong {monthLabel(ym).toLowerCase()}, gửi tới <b>{num(stats.households)}</b> hộ ({scope}).</>}
        </p>
        <Legend filter={filter} />
        {stats.total === 0 ? (
          <BlockEmpty action={filter !== 'all' ? <Button variant="outline" size="sm" onClick={() => setFilter('all')}>Xem tất cả loại</Button> : undefined}>
            Không có ngày nào có lịch gửi. Thử tháng khác{filter !== 'all' ? ' hoặc bỏ lọc loại' : ''}.
          </BlockEmpty>
        ) : mobile ? (
          // Bấm lại ngày đang mở thì đóng: giá trị "-none" vẫn thuộc tháng nên không rơi về ngày mặc định.
          <Agenda days={d.days} entries={d.entries} filter={filter} selected={selected} onSelect={(v) => setPicked(v === selected ? `${d.ym}-none` : v)} />
        ) : (
          <div className="nt-cal-layout">
            <MonthGrid days={d.days} filter={filter} max={stats.max} selected={selected} onSelect={setPicked} />
            <aside className="nt-detail" aria-label="Lịch gửi của ngày đang chọn">
              {selected ? <DayDetail key={`${selected}-${filter}`} date={selected} entries={d.entries[selected] ?? []} filter={filter} /> : <BlockEmpty>Chọn một ngày để xem danh sách hộ được nhắc.</BlockEmpty>}
            </aside>
          </div>
        )}
      </div>
    );
  }

  return (
    <Panel
      id="nt-cal-title"
      title={<span className="nt-title">Lịch thông báo theo ngày <ProtoBadge kind="mock" note="lịch tính từ nghĩa vụ mô phỏng của từng hộ, chưa nối nguồn thật" /></span>}
      className="nt-panel"
    >
      {head}
      <p className="nt-channel">Tất cả gửi qua thông báo đẩy iHanoi. Loại theo khung giờ gửi trong {INITIAL_CONFIG.sendStart}–{INITIAL_CONFIG.sendEnd} của ngày dự kiến; loại theo sự kiện gửi ngay khi có kết quả.</p>
      {body}
    </Panel>
  );
}

function Legend({ filter }: { filter: Filter }) {
  const list = filter === 'all' ? TYPES : [TYPE[filter]];
  return (
    <div className="chart-legend nt-legend" aria-hidden="true">
      {list.map((t) => <span key={t.id}><i className="swatch" style={{ background: t.color }} /> {t.short}</span>)}
    </div>
  );
}

/** Thanh tỷ lệ theo loại trong một ngày (trang trí, số đọc được trong aria-label và danh sách). */
function MixBar({ day, filter }: { day: PlanDay; filter: Filter }) {
  const total = countOf(day, filter);
  if (!total) return null;
  const list = filter === 'all' ? TYPES.filter((t) => day.byType[t.id]) : [TYPE[filter]];
  return (
    <span className="nt-mix" aria-hidden="true">
      {list.map((t) => <i key={t.id} style={{ background: t.color, flexGrow: day.byType[t.id] }} />)}
    </span>
  );
}

function ariaFor(day: PlanDay, filter: Filter) {
  const n = countOf(day, filter);
  if (!n) return `${dayLabel(day.date)}: không có thông báo`;
  const parts = filter === 'all' ? TYPES.filter((t) => day.byType[t.id]).map((t) => `${t.label} ${day.byType[t.id]}`) : [];
  return `${dayLabel(day.date)}: ${num(n)} thông báo${parts.length ? ` (${parts.join(', ')})` : ''}${day.date === TODAY ? ', hôm nay' : ''}`;
}

function MonthGrid({ days, filter, max, selected, onSelect }: { days: PlanDay[]; filter: Filter; max: number; selected: string | null; onSelect: (d: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const lead = weekdayIndex(days[0].date);
  // Mũi tên trái/phải đổi một ngày, lên/xuống đổi một tuần; Home/End về đầu/cuối tháng.
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    const cur = Number((document.activeElement as HTMLElement | null)?.dataset.i);
    if (Number.isNaN(cur)) return;
    let next: number | undefined;
    if (step) next = cur + step;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = days.length - 1;
    if (next === undefined || next < 0 || next >= days.length) return;
    e.preventDefault();
    ref.current?.querySelector<HTMLButtonElement>(`[data-i="${next}"]`)?.focus();
  };
  const level = (n: number) => (!n || !max ? 0 : n / max > 0.66 ? 3 : n / max > 0.33 ? 2 : 1);
  return (
    <div className="nt-grid-wrap">
      <div className="nt-week" aria-hidden="true">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="nt-grid" ref={ref} role="group" aria-label="Các ngày trong tháng. Dùng phím mũi tên để chuyển ngày." onKeyDown={onKey}>
        {Array.from({ length: lead }, (_, i) => <span key={`b${i}`} className="nt-cell nt-cell--blank" aria-hidden="true" />)}
        {days.map((day, i) => {
          const n = countOf(day, filter);
          return (
            <button
              key={day.date}
              type="button"
              data-i={i}
              className={`nt-cell nt-heat-${level(n)}${day.date === selected ? ' is-selected' : ''}${day.date === TODAY ? ' is-today' : ''}`}
              aria-pressed={day.date === selected}
              aria-label={ariaFor(day, filter)}
              onClick={() => onSelect(day.date)}
            >
              <span className="nt-cell__day">{+day.date.slice(8, 10)}{day.date === TODAY && <span className="nt-today">Hôm nay</span>}</span>
              <span className="nt-cell__count">{n ? num(n) : '–'}</span>
              <MixBar day={day} filter={filter} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Agenda({ days, entries, filter, selected, onSelect }: { days: PlanDay[]; entries: Record<string, PlanEntry[]>; filter: Filter; selected: string | null; onSelect: (d: string) => void }) {
  const list = days.filter((x) => countOf(x, filter) > 0);
  return (
    <TopRows total={list.length} limit={7} noun="ngày">
    <ul className="nt-agenda">
      {list.map((day) => {
        const open = day.date === selected;
        const top = (filter === 'all' ? TYPES.filter((t) => day.byType[t.id]) : [TYPE[filter]])
          .sort((a, b) => day.byType[b.id] - day.byType[a.id]).slice(0, 3);
        const panelId = `nt-ag-${day.date}`;
        return (
          <li key={day.date} className={`nt-agenda__item${open ? ' is-open' : ''}`}>
            <button type="button" className="nt-agenda__btn" aria-expanded={open} aria-controls={panelId} aria-label={ariaFor(day, filter)} onClick={() => onSelect(day.date)}>
              <span className="nt-agenda__date">
                <b>{dayLabel(day.date)}</b>
                {day.date === TODAY && <span className="nt-today">Hôm nay</span>}
              </span>
              <span className="nt-agenda__count">{num(countOf(day, filter))}</span>
              <ChevronDown className="nt-agenda__chev" aria-hidden="true" />
              <span className="nt-agenda__mix" aria-hidden="true">
                {top.map((t) => <span key={t.id}><i className="swatch" style={{ background: t.color }} /> {t.short} {num(day.byType[t.id])}</span>)}
              </span>
            </button>
            {open && <div id={panelId} className="nt-agenda__panel"><DayDetail key={`${day.date}-${filter}`} date={day.date} entries={entries[day.date] ?? []} filter={filter} compact /></div>}
          </li>
        );
      })}
    </ul>
    </TopRows>
  );
}

const FIRST = 5;
/** Mobile (chi tiết ngày trong danh sách): mỗi loại hiện 3 hộ đầu. */
const FIRST_COMPACT = 3;
const MORE = 20;

function DayDetail({ date, entries, filter, compact }: { date: string; entries: PlanEntry[]; filter: Filter; compact?: boolean }) {
  const [shown, setShown] = useState<Partial<Record<NotiType, number>>>({});
  const rows = filter === 'all' ? entries : entries.filter((e) => e.type === filter);
  const groups = TYPES.map((t) => ({ t, list: rows.filter((e) => e.type === t.id) })).filter((g) => g.list.length);
  const hasOverdue = groups.some((g) => g.t.id === 'overdue');
  return (
    <div className="nt-day">
      {!compact && (
        <div className="nt-day__head">
          <h3>{dayLabel(date)}/{date.slice(0, 4)}</h3>
          <span className="nt-day__total">{num(rows.length)} thông báo</span>
        </div>
      )}
      {!rows.length && <BlockEmpty>Không có thông báo dự kiến trong ngày này.</BlockEmpty>}
      {hasOverdue && (
        <ProtoNote kind="proposal">
          Mức quá hạn: {SEVERITY.map((s) => `${s.label} ${s.level === 3 ? `trên ${s.from - 1}` : `${s.from}–${s.to}`} ngày, nhắc ${s.every} ngày/lần`).join('; ')}.
        </ProtoNote>
      )}
      {groups.map(({ t, list }) => {
        const limit = shown[t.id] ?? (compact ? FIRST_COMPACT : FIRST);
        const rest = list.length - limit;
        const hid = `nt-g-${date}-${t.id}`;
        return (
          <section key={t.id} className="nt-group" aria-labelledby={hid}>
            <h4 id={hid} className="nt-group__title">
              <i className="swatch" style={{ background: t.color }} aria-hidden="true" />
              {t.label} <span className="nt-group__count">({num(list.length)})</span>
              <span className="nt-group__mode">{t.mode === 'window' ? 'Theo khung giờ' : 'Gửi ngay theo sự kiện'}</span>
            </h4>
            <ul className="nt-rows">
              {list.slice(0, limit).map((e) => (
                <li key={e.id} className="nt-row">
                  <div className="nt-row__main">
                    <span className="nt-row__name">{e.name}</span>
                    <span className="nt-row__mst">MST {e.mst}</span>
                  </div>
                  <div className="nt-row__meta">
                    <span className="nt-row__time">{e.time ?? 'Khi có kết quả'}</span>
                    <span className="nt-row__reason">{e.reason}</span>
                    {e.level && <StatusPill tone={LEVEL_TONE[e.level]}>Mức {e.level}</StatusPill>}
                  </div>
                </li>
              ))}
            </ul>
            {rest > 0 && (
              <Button variant="outline" size="sm" className="nt-more" onClick={() => setShown((s) => ({ ...s, [t.id]: limit + MORE }))}>
                Hiện thêm {num(Math.min(MORE, rest))} hộ <span className="nt-more__rest">(còn {num(rest)})</span>
              </Button>
            )}
          </section>
        );
      })}
    </div>
  );
}
