// Lịch thông báo, danh mục loại và hiệu quả gửi (view.docx mục 4, các ý [Thêm]).
// Toàn bộ là dữ liệu giả lập, tính tất định từ danh sách NNT trong data/mock.ts; "hôm nay" = 28/10/2026.
import { INITIAL_CONFIG } from '../data/config';
import { taxpayers } from '../data/mock';

const wait = (ms = 520) => new Promise((r) => setTimeout(r, ms));

export const TODAY = '2026-10-28';

/* ---------- Loại thông báo ---------- */

export type NotiType = 'due' | 'overdue' | 'revenue' | 'forecast' | 'filing' | 'payment' | 'transfer' | 'signature';
export type SendMode = 'window' | 'event';

export interface TypeMeta {
  id: NotiType;
  label: string;
  /** Tên ngắn cho ô lịch và chú giải. */
  short: string;
  mode: SendMode;
  /** Đang chạy trong hệ thống hiện tại (theo nhóm quy tắc ở màn Cấu hình). */
  live: boolean;
  groups?: string;
  trigger: string;
  /** Màu chấm/thanh phân loại; luôn đi kèm tên loại, không dùng màu làm tín hiệu duy nhất. */
  color: string;
}

export const TYPES: TypeMeta[] = [
  { id: 'due', label: 'Nhắc hạn', short: 'Nhắc hạn', mode: 'window', live: true, groups: 'D1a, D1b', color: '#2563EB',
    trigger: `Hồ sơ khai hoặc khoản thuế còn ${INITIAL_CONFIG.daysBefore} ngày đến hạn mà chưa hoàn thành.` },
  { id: 'overdue', label: 'Quá hạn theo mức độ', short: 'Quá hạn', mode: 'window', live: true, groups: 'D1a, D1b', color: '#DC2626',
    trigger: 'Đã qua hạn mà hồ sơ chưa nộp hoặc tiền thuế chưa nộp đủ; nhịp nhắc theo mức quá hạn.' },
  { id: 'revenue', label: 'Ngưỡng doanh thu', short: 'Doanh thu', mode: 'window', live: true, groups: 'D4', color: '#B45309',
    trigger: `Doanh thu lũy kế đạt từ ${INITIAL_CONFIG.nearThresholdPct}% ngưỡng sử dụng hóa đơn.` },
  { id: 'forecast', label: 'Dự báo đổi nhóm', short: 'Đổi nhóm', mode: 'window', live: false, color: '#7C3AED',
    trigger: 'Doanh thu dự báo cả năm vượt ngưỡng của nhóm hộ hiện tại.' },
  { id: 'filing', label: 'Kết quả hồ sơ', short: 'KQ hồ sơ', mode: 'event', live: false, color: '#0F766E',
    trigger: 'Hồ sơ khai thuế đã được tiếp nhận và có kết quả xử lý.' },
  { id: 'payment', label: 'Kết quả nộp thuế', short: 'KQ nộp', mode: 'event', live: false, color: '#15803D',
    trigger: 'Giao dịch nộp thuế được ghi nhận vào sổ thuế.' },
  { id: 'transfer', label: 'Kết quả chuyển tuyến', short: 'Chuyển tuyến', mode: 'event', live: false, groups: 'D3 (chưa sử dụng)', color: '#475569',
    trigger: 'Hồ sơ chuyển tuyến có kết quả xử lý.' },
  { id: 'signature', label: 'Nhắc gia hạn chữ ký số', short: 'Chữ ký số', mode: 'window', live: false, color: '#BE185D',
    trigger: 'Chứng thư chữ ký số của hộ còn 30 ngày và 7 ngày đến ngày hết hạn.' },
];

export const TYPE: Record<NotiType, TypeMeta> = Object.fromEntries(TYPES.map((t) => [t.id, t])) as Record<NotiType, TypeMeta>;

/** Mức quá hạn và nhịp nhắc — đề xuất của nhóm thiết kế, chưa được nghiệp vụ chốt. */
export const SEVERITY = [
  { level: 1 as const, label: 'Mức 1', from: 1, to: 10, every: 3 },
  { level: 2 as const, label: 'Mức 2', from: 11, to: 30, every: 7 },
  { level: 3 as const, label: 'Mức 3', from: 31, to: 120, every: 14 },
];
export const severityRange = (s: (typeof SEVERITY)[number]) => (s.level === 3 ? `Trên ${s.from - 1} ngày` : `${s.from}–${s.to} ngày`);

/* ---------- Ngày dạng số (UTC, tránh lệch múi giờ) ---------- */

const DAY = 86_400_000;
const idx = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d) / DAY;
const isoOf = (i: number) => new Date(i * DAY).toISOString().slice(0, 10);
const idxOf = (iso: string) => idx(+iso.slice(0, 4), +iso.slice(5, 7), +iso.slice(8, 10));
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const ddmm = (i: number) => { const s = isoOf(i); return `${s.slice(8, 10)}/${s.slice(5, 7)}`; };
const ddmmyyyy = (i: number) => { const s = isoOf(i); return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`; };

/** Băm tất định → [0, 1). */
function h(...parts: (number | string)[]) {
  let x = 2166136261;
  for (const p of parts.join('|')) x = Math.imul(x ^ p.charCodeAt(0), 16777619);
  x ^= x >>> 13; x = Math.imul(x, 0x5bd1e995); x ^= x >>> 15;
  return (x >>> 0) / 4294967296;
}

/* ---------- Kế hoạch theo từng hộ ---------- */

export interface PlanEntry {
  id: string;
  date: string;
  type: NotiType;
  taxpayerId: number;
  name: string;
  mst: string;
  /** Giờ dự kiến trong khung gửi; null = gửi ngay khi có sự kiện. */
  time: string | null;
  reason: string;
  level?: 1 | 2 | 3;
}

interface Cycle { deadline: number; period: string }

function cycles(monthly: boolean, from: number, to: number): Cycle[] {
  const out: Cycle[] = [];
  for (let y = 2025; y <= 2028; y++) {
    if (monthly) {
      for (let m = 1; m <= 12; m++) {
        const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
        const d = idx(ny, nm, 20);
        if (d >= from && d <= to) out.push({ deadline: d, period: `tháng ${m}/${y}` });
      }
    } else {
      for (let q = 1; q <= 4; q++) {
        const ny = q === 4 ? y + 1 : y, nm = q === 4 ? 1 : q * 3 + 1;
        const d = idx(ny, nm, lastDay(ny, nm));
        if (d >= from && d <= to) out.push({ deadline: d, period: `quý ${['I', 'II', 'III', 'IV'][q - 1]}/${y}` });
      }
    }
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, '0');
const slot = (...k: (number | string)[]) => {
  const start = 6 * 60, span = 4 * 60; // 06:00–10:00 theo cấu hình
  const min = start + Math.floor(h(...k) * (span / 5)) * 5;
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
};

/** Ngày hoàn thành nghĩa vụ so với hạn (âm = trước hạn). */
function resolveOffset(id: number, kind: string, deadline: number) {
  const u = h(id, kind, deadline, 'r');
  const v = h(id, kind, deadline, 'v');
  if (u < 0.55) return -1 - Math.floor(v * 20);
  if (u < 0.8) return 1 + Math.floor(v * 10);
  if (u < 0.93) return 11 + Math.floor(v * 20);
  return 31 + Math.floor(v * 60);
}

function planOf(tpId: number, from: number, to: number, push: (e: Omit<PlanEntry, 'id' | 'name' | 'mst' | 'date'> & { day: number }) => void) {
  const t = taxpayers[tpId];
  const active = t.hkdStatus === 'Đang hoạt động';
  const monthly = h(tpId, 'freq') < 0.3;
  const within = (d: number) => d >= from && d <= to;

  // Nghĩa vụ khai và nộp: nhắc hạn, quá hạn theo mức, kết quả khi hoàn thành.
  const kinds: { key: 'file' | 'pay'; has: boolean; what: string; result: NotiType }[] = [
    { key: 'file', has: t.fileCount > 0, what: 'Tờ khai', result: 'filing' },
    { key: 'pay', has: t.payCount > 0, what: 'Tiền thuế', result: 'payment' },
  ];
  for (const k of kinds) {
    if (!k.has || !active) continue;
    for (const c of cycles(monthly, from - 130, to + INITIAL_CONFIG.daysBefore)) {
      const done = c.deadline + resolveOffset(tpId, k.key, c.deadline);
      const remind = c.deadline - INITIAL_CONFIG.daysBefore;
      const label = `${k.what} ${c.period}`;
      if (done > remind && within(remind)) {
        push({ day: remind, type: 'due', taxpayerId: tpId, time: slot(tpId, 'due', remind), reason: `${label}, hạn ${ddmm(c.deadline)}` });
      }
      for (const s of SEVERITY) {
        for (let n = s.from; n <= s.to; n += s.every) {
          const d = c.deadline + n;
          if (d >= done) break;
          if (within(d)) push({ day: d, type: 'overdue', level: s.level, taxpayerId: tpId, time: slot(tpId, 'od', d), reason: `${label} quá hạn ${n} ngày (hạn ${ddmm(c.deadline)})` });
        }
      }
      if (within(done + 1)) {
        push({ day: done + 1, type: k.result, taxpayerId: tpId, time: null,
          reason: k.key === 'file' ? `${label} đã được tiếp nhận` : `${label} đã ghi nhận nộp` });
      }
    }
  }

  // Doanh thu: cảnh báo gần ngưỡng hằng tháng; dự báo đổi nhóm.
  const months: { y: number; m: number }[] = [];
  for (let i = from; i <= to; ) {
    const s = isoOf(i); const y = +s.slice(0, 4), m = +s.slice(5, 7);
    months.push({ y, m }); i = idx(y, m, lastDay(y, m)) + 1;
  }
  if (active && h(tpId, 'rev') < 0.07) {
    const p = INITIAL_CONFIG.nearThresholdPct + Math.floor(h(tpId, 'revp') * 19);
    for (const { y, m } of months) {
      const d = idx(y, m, 1 + Math.floor(h(tpId, 'revd', m) * 27));
      if (within(d)) push({ day: d, type: 'revenue', taxpayerId: tpId, time: slot(tpId, 'rev', d), reason: `Doanh thu lũy kế đạt ${p}% ngưỡng sử dụng hóa đơn` });
    }
  }
  if (active && h(tpId, 'fc') < 0.025) {
    for (const { y, m } of months) {
      const d = idx(y, m, 1 + Math.floor(h(tpId, 'fcd', m) * 27));
      if (within(d)) push({ day: d, type: 'forecast', taxpayerId: tpId, time: slot(tpId, 'fc', d), reason: `Doanh thu dự báo năm ${y} vượt ngưỡng nhóm hiện tại` });
    }
  }
  for (const { y, m } of months) {
    if (h(tpId, 'tr', y, m) < 0.012) {
      const d = idx(y, m, 1 + Math.floor(h(tpId, 'trd', y, m) * 27));
      if (within(d)) push({ day: d, type: 'transfer', taxpayerId: tpId, time: null, reason: 'Hồ sơ chuyển tuyến đã có kết quả xử lý' });
    }
  }
  // Chữ ký số: 35% hộ có chứng thư, hạn rải trong 2 năm từ 01/07/2026.
  if (h(tpId, 'cks') < 0.35) {
    const exp = idx(2026, 7, 1) + Math.floor(h(tpId, 'cksd') * 730);
    for (const before of [30, 7]) {
      const d = exp - before;
      if (within(d)) push({ day: d, type: 'signature', taxpayerId: tpId, time: slot(tpId, 'cks', d), reason: `Chữ ký số hết hạn ${ddmmyyyy(exp)}, còn ${before} ngày` });
    }
  }
}

export interface PlanDay { date: string; total: number; byType: Record<NotiType, number> }
export interface PlanMonth {
  ym: string;
  days: PlanDay[];
  entries: Record<string, PlanEntry[]>;
  /** Số NNT trong phạm vi tài khoản (để phân biệt "chưa phụ trách hộ nào" với "tháng không có lịch"). */
  scopeCount: number;
}

const zero = () => Object.fromEntries(TYPES.map((t) => [t.id, 0])) as Record<NotiType, number>;
const ORDER = Object.fromEntries(TYPES.map((t, i) => [t.id, i])) as Record<NotiType, number>;

export async function fetchPlanMonth(ym: string, canSee: (id: number) => boolean): Promise<PlanMonth> {
  await wait();
  const y = +ym.slice(0, 4), m = +ym.slice(5, 7);
  const from = idx(y, m, 1), to = idx(y, m, lastDay(y, m));
  const entries: Record<string, PlanEntry[]> = {};
  let scopeCount = 0;
  let n = 0;
  for (const t of taxpayers) {
    if (!canSee(t.id)) continue;
    scopeCount++;
    planOf(t.id, from, to, (e) => {
      const date = isoOf(e.day);
      (entries[date] ??= []).push({ id: `P${++n}`, date, type: e.type, taxpayerId: e.taxpayerId, name: t.name, mst: t.mst, time: e.time, reason: e.reason, level: e.level });
    });
  }
  const days: PlanDay[] = [];
  for (let i = from; i <= to; i++) {
    const date = isoOf(i);
    const list = (entries[date] ??= []);
    list.sort((a, b) => ORDER[a.type] - ORDER[b.type] || (a.level ?? 0) - (b.level ?? 0) || (a.time ?? '').localeCompare(b.time ?? '') || a.name.localeCompare(b.name, 'vi'));
    const byType = zero();
    list.forEach((e) => byType[e.type]++);
    days.push({ date, total: list.length, byType });
  }
  return { ym, days, entries, scopeCount };
}

/* ---------- Hiệu quả gửi ---------- */

export const TARGETS = { onTime: 98, matched: 80 };

export interface EffectDay { date: string; sent: number; onTime: number; checked: number; matched: number }
export interface Effectiveness { from: string; to: string; days: EffectDay[]; sent: number; onTime: number; checked: number; matched: number }

/** 30 ngày tới hôm nay. Khối lượng theo tỷ lệ NNT trong phạm vi. */
export async function fetchEffectiveness(scopeKey: string, canSee: (id: number) => boolean): Promise<Effectiveness> {
  await wait(460);
  let inScope = 0;
  for (const t of taxpayers) if (canSee(t.id)) inScope++;
  const share = inScope / taxpayers.length;
  const end = idxOf(TODAY);
  const days: EffectDay[] = [];
  for (let i = end - 29; i <= end; i++) {
    const date = isoOf(i);
    const u = h(scopeKey, date, 'vol');
    const sent = inScope === 0 ? 0 : Math.max(1, Math.round(1300 * share * (0.7 + 0.6 * u)));
    // Ngày 26–27/10 hàng chờ cuối tháng làm một phần đợt gửi trễ khỏi khung (khớp lý do kéo dài khung gửi ở cấu hình v12).
    const late = date === '2026-10-26' || date === '2026-10-27' ? 0.035 : 0.004 + h(scopeKey, date, 'late') * 0.022;
    const onTime = Math.round(sent * (1 - late));
    const checked = Math.round(sent * 0.62); // nhắc hạn / quá hạn mới có "hồ sơ" để đối chiếu
    const matched = Math.round(checked * (0.74 + h(scopeKey, date, 'm') * 0.14));
    days.push({ date, sent, onTime, checked, matched });
  }
  const sum = (k: keyof Omit<EffectDay, 'date'>) => days.reduce((s, d) => s + d[k], 0);
  return { from: days[0].date, to: TODAY, days, sent: sum('sent'), onTime: sum('onTime'), checked: sum('checked'), matched: sum('matched') };
}

export const weekdayLong = (iso: string) => ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][new Date(`${iso}T00:00:00Z`).getUTCDay()];
/** Thứ trong tuần, bắt đầu từ Thứ Hai = 0. */
export const weekdayIndex = (iso: string) => (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7;
export const shiftMonth = (ym: string, delta: number) => {
  const y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + delta;
  const ny = y + Math.floor(m / 12), nm = ((m % 12) + 12) % 12 + 1;
  return `${ny}-${pad(nm)}`;
};
