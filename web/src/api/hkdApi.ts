// Mock API khu vực "Quản lý HKD": cơ cấu và tuân thủ, nợ thuế, hỗ trợ HKD, chỉ tiêu hằng ngày.
// TOÀN BỘ là dữ liệu minh họa (06/11/2026), sinh ổn định từ hạt giống cố định; thay bằng API quản lý thuế khi có.
// 6.200 HKD đầu lấy từ danh sách NNT còn nghĩa vụ (mock.ts); thêm 3.600 HKD đã tuân thủ đầy đủ để có tổng thể.
import { POLICY_THRESHOLDS } from '../data/config';
import { PERIOD, taxpayers } from '../data/mock';
import { officerOf, TEAMS } from '../data/org';
import type { Priority } from '../data/types';
import { fetchConfig, orgSnapshot } from './mockApi';

const wait = (ms = 420) => new Promise((r) => setTimeout(r, ms));
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(6112026);
const pickW = <T,>(items: readonly T[], weights: readonly number[]) => {
  let r = rand() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) if ((r -= weights[i]) <= 0) return items[i];
  return items[items.length - 1];
};

/* ---------- Danh mục ---------- */

export const WARDS = ['Phường Hoàn Kiếm', 'Phường Cửa Nam', 'Phường Ba Đình', 'Phường Ngọc Hà', 'Phường Giảng Võ'] as const;
export const INDUSTRIES = ['Bán lẻ hàng hóa', 'Ăn uống', 'Dịch vụ', 'Sản xuất, gia công', 'Vận tải', 'Cho thuê tài sản'] as const;
export const REVENUE_BANDS = ['Dưới 100 triệu', '100–500 triệu', '500 triệu–1 tỷ', '1–3 tỷ', 'Trên 3 tỷ'] as const;
const BAND_RANGE: [number, number][] = [[30e6, 100e6], [100e6, 500e6], [500e6, 1e9], [1e9, 3e9], [3e9, 8e9]];

export type Compliance = 'COMPLIANT' | 'MISSING_FILE' | 'IN_DEBT' | 'BOTH';
export const COMPLIANCE_LABEL: Record<Compliance, string> = {
  COMPLIANT: 'Đã tuân thủ đầy đủ',
  MISSING_FILE: 'Còn thiếu tờ khai',
  IN_DEBT: 'Còn nợ thuế',
  BOTH: 'Thiếu tờ khai và nợ thuế',
};
export const COMPLIANCE_ORDER: Compliance[] = ['COMPLIANT', 'MISSING_FILE', 'IN_DEBT', 'BOTH'];

interface Hkd {
  id: number;
  ward: string;
  industry: string;
  band: number;
  revenue: number;
  officer: string;
  app: boolean;
  fileMissing: number;
  payMissing: number;
  debt: number;
  debtOverdue: number;
  filePr?: Priority;
  payPr?: Priority;
}

const OFFICERS = ['binh', 'mai', 'hung', 'hanh', 'long', 'trang', 'nam', 'oanh'];
const EXTRA = 3600;

const hkds: Hkd[] = Array.from({ length: taxpayers.length + EXTRA }, (_, id) => {
  const t = taxpayers[id];
  const band = REVENUE_BANDS.indexOf(pickW(REVENUE_BANDS, [0.22, 0.38, 0.2, 0.14, 0.06]));
  const [lo, hi] = BAND_RANGE[band];
  const payMissing = t?.payCount ?? 0;
  const debt = payMissing ? Math.round((2 + rand() * 38) * payMissing) * 1e6 : 0;
  const ward = pickW(WARDS, [0.24, 0.21, 0.2, 0.18, 0.17]);
  const industry = pickW(INDUSTRIES, [0.34, 0.24, 0.2, 0.09, 0.07, 0.06]);
  const revenue = Math.round(lo + rand() * (hi - lo));
  return {
    id,
    ward,
    industry,
    band,
    // Vài hộ rất lớn (minh họa) để mốc 50 tỷ có số liệu; không gọi rand() thêm nên các số khác giữ nguyên.
    revenue: band === 4 && id % 23 === 0 ? 50e9 + (id % 13) * 0.35e9 : revenue,
    officer: t ? officerOf[id] : OFFICERS[Math.floor(rand() * OFFICERS.length)],
    app: rand() < 0.63,
    fileMissing: t?.fileCount ?? 0,
    payMissing,
    debt,
    debtOverdue: t?.payPriority === 'OVERDUE' ? debt : 0,
    filePr: t?.filePriority,
    payPr: t?.payPriority,
  };
});

export const complianceOf = (h: Pick<Hkd, 'fileMissing' | 'payMissing'>): Compliance =>
  h.fileMissing && h.payMissing ? 'BOTH' : h.fileMissing ? 'MISSING_FILE' : h.payMissing ? 'IN_DEBT' : 'COMPLIANT';

/* ---------- Phạm vi: cơ sở / tổ / cán bộ, giống màn Thống kê ---------- */

function owners(scope: string): Set<string> | null {
  if (scope === 'ALL') return null;
  if (TEAMS.some((t) => t.id === scope)) return new Set(orgSnapshot().filter((s) => s.team === scope).map((s) => s.id));
  return new Set([scope]);
}
const inScope = (scope: string) => {
  const o = owners(scope);
  return o ? hkds.filter((h) => o.has(h.officer)) : hkds;
};
/** Đơn vị so sánh theo phạm vi: toàn cơ sở thì so các tổ, một tổ thì so các cán bộ. */
function units(scope: string): { id: string; name: string; officers: Set<string> }[] {
  const staff = orgSnapshot();
  if (scope === 'ALL') return TEAMS.map((t) => ({ id: t.id, name: t.name, officers: new Set(staff.filter((s) => s.team === t.id).map((s) => s.id)) }));
  const o = owners(scope)!;
  return staff.filter((s) => o.has(s.id) && s.role === 'officer').map((s) => ({ id: s.id, name: s.name, officers: new Set([s.id]) }));
}

const TODAY = PERIOD.to; // 28/10/2026, khớp mốc của dữ liệu thông báo.
const dayList = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${TODAY}T00:00:00`);
    d.setDate(d.getDate() - (n - 1 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

/* ---------- 1. Cơ cấu và tuân thủ ---------- */

export type Dimension = 'ward' | 'band' | 'industry';
export interface StructureRow {
  key: string;
  total: number;
  counts: Record<Compliance, number>;
}

export async function fetchStructure(scope: string, dim: Dimension) {
  await wait();
  const rows = inScope(scope);
  const keys: string[] = dim === 'ward' ? [...WARDS] : dim === 'industry' ? [...INDUSTRIES] : [...REVENUE_BANDS];
  const keyOf = (h: Hkd) => (dim === 'ward' ? h.ward : dim === 'industry' ? h.industry : REVENUE_BANDS[h.band]);
  const empty = () => ({ COMPLIANT: 0, MISSING_FILE: 0, IN_DEBT: 0, BOTH: 0 });
  const by = new Map(keys.map((k) => [k, { key: k, total: 0, counts: empty() } as StructureRow]));
  const all = empty();
  rows.forEach((h) => {
    const c = complianceOf(h);
    const r = by.get(keyOf(h))!;
    r.total++;
    r.counts[c]++;
    all[c]++;
  });
  return { total: rows.length, counts: all, rows: [...by.values()] };
}

/* ---------- 2. Nợ thuế ---------- */

const MONTHS = ['11/2025', '12/2025', '01/2026', '02/2026', '03/2026', '04/2026', '05/2026', '06/2026', '07/2026', '08/2026', '09/2026', '10/2026'];
const debtShape = MONTHS.map((_, i) => 0.82 + 0.1 * Math.sin(i / 1.7) + i * 0.012 + (rand() - 0.5) * 0.04);

export async function fetchDebt(scope: string) {
  await wait();
  const rows = inScope(scope);
  const inDebt = rows.filter((h) => h.debt > 0);
  const total = inDebt.reduce((s, h) => s + h.debt, 0);
  const overdue = inDebt.reduce((s, h) => s + h.debtOverdue, 0);
  const last = debtShape[debtShape.length - 1];
  // Tháng hiện tại khớp số đang có; các tháng trước nội suy theo hình dạng minh họa.
  const trend = MONTHS.map((m, i) => ({ month: m, amount: Math.round((total * debtShape[i]) / last / 1e6) * 1e6, hkd: Math.round((inDebt.length * (0.9 + 0.1 * debtShape[i])) / (0.9 + 0.1 * last)) }));
  const byUnit = units(scope).map((u) => {
    const r = inDebt.filter((h) => u.officers.has(h.officer));
    return { name: u.name, hkd: r.length, amount: r.reduce((s, h) => s + h.debt, 0), overdue: r.reduce((s, h) => s + h.debtOverdue, 0) };
  });
  const byWard = WARDS.map((w) => {
    const r = inDebt.filter((h) => h.ward === w);
    return { name: w, hkd: r.length, amount: r.reduce((s, h) => s + h.debt, 0), overdue: r.reduce((s, h) => s + h.debtOverdue, 0) };
  });
  return { hkd: inDebt.length, total, overdue, avg: inDebt.length ? total / inDebt.length : 0, trend, byUnit, byWard };
}

/** Báo cáo nợ định kỳ theo tháng (CSV) — tháng hiện tại lấy số đang có, tháng trước theo xu hướng minh họa. */
export const REPORT_MONTHS = MONTHS.slice(-4).reverse();

/* ---------- 3. Hỗ trợ HKD ---------- */

export type RequestStatus = 'NEW' | 'PROCESSING' | 'NEED_MORE' | 'RESOLVED' | 'REJECTED';
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  NEW: 'Mới tiếp nhận',
  PROCESSING: 'Đang xử lý',
  NEED_MORE: 'Chờ bổ sung',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Từ chối',
};
export const REQUEST_TYPES = ['Hướng dẫn khai thuế', 'Đăng ký, đăng nhập ứng dụng', 'Điều chỉnh thông tin', 'Hoàn thuế, bù trừ', 'Khác'] as const;

const days30 = dayList(30);
const requests = Array.from({ length: 1450 }, (_, i) => {
  const h = hkds[Math.floor(rand() * hkds.length)];
  const dayIdx = Math.floor(rand() * 30);
  const age = 29 - dayIdx;
  const status: RequestStatus = age < 2
    ? pickW(['NEW', 'PROCESSING', 'NEED_MORE', 'RESOLVED'] as const, [0.45, 0.3, 0.1, 0.15])
    : pickW(['PROCESSING', 'NEED_MORE', 'RESOLVED', 'REJECTED'] as const, age < 7 ? [0.25, 0.15, 0.55, 0.05] : [0.04, 0.06, 0.84, 0.06]);
  return {
    id: `YC-${String(i + 1).padStart(5, '0')}`,
    date: days30[dayIdx],
    officer: h.officer,
    ward: h.ward,
    type: pickW(REQUEST_TYPES, [0.38, 0.24, 0.16, 0.08, 0.14]),
    status,
    hours: status === 'RESOLVED' || status === 'REJECTED' ? Math.round(2 + rand() ** 2 * 94) : null,
  };
});

export async function fetchSupport(scope: string) {
  await wait();
  const o = owners(scope);
  const rows = o ? requests.filter((r) => o.has(r.officer)) : requests;
  const count = (st: RequestStatus) => rows.filter((r) => r.status === st).length;
  const done = rows.filter((r) => r.hours !== null);
  const summarize = (list: typeof rows) => ({
    total: list.length,
    status: Object.fromEntries((Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[]).map((s) => [s, list.filter((r) => r.status === s).length])) as Record<RequestStatus, number>,
    avgHours: list.filter((r) => r.hours !== null).length ? list.reduce((s, r) => s + (r.hours ?? 0), 0) / list.filter((r) => r.hours !== null).length : null,
  });
  const staff = orgSnapshot();
  const officers = [...new Set(rows.map((r) => r.officer))].map((id) => ({ name: staff.find((s) => s.id === id)?.name ?? id, ...summarize(rows.filter((r) => r.officer === id)) })).sort((a, b) => b.total - a.total);
  const wards = WARDS.map((w) => ({ name: w, ...summarize(rows.filter((r) => r.ward === w)) }));
  const types = REQUEST_TYPES.map((t) => ({ name: t, total: rows.filter((r) => r.type === t).length }));
  const waiting = rows.filter((r) => r.status === 'NEED_MORE').slice(0, 8).map((r) => ({ ...r, officerName: staff.find((s) => s.id === r.officer)?.name ?? r.officer }));
  return {
    total: rows.length,
    resolved: count('RESOLVED'),
    needMore: count('NEED_MORE'),
    rejected: count('REJECTED'),
    open: count('NEW') + count('PROCESSING'),
    avgHours: done.length ? done.reduce((s, r) => s + (r.hours ?? 0), 0) / done.length : null,
    officers,
    wards,
    types,
    waiting,
  };
}

/* ---------- 4. Chỉ tiêu hằng ngày ---------- */

// Hình dạng tiếp nhận tờ khai theo ngày (toàn cơ sở): ngày làm việc cao, cuối tuần thấp, dồn vào tuần cuối trước hạn 30/10.
const declShape = days30.map((d, i) => {
  const wd = new Date(`${d}T00:00:00`).getDay();
  const base = wd === 0 || wd === 6 ? 40 : 190;
  const rush = i >= 22 ? 1.7 : 1;
  return { d, received: base * rush * (0.85 + rand() * 0.3), ok: 0.92 + rand() * 0.06, paid: 0.76 + rand() * 0.1 };
});

export async function fetchDaily(scope: string) {
  await wait();
  const rows = inScope(scope);
  const share = rows.length / hkds.length;
  const series = declShape.map((s) => {
    const received = Math.round(s.received * share);
    const accepted = Math.round(received * s.ok);
    const mustPay = Math.round(accepted * 0.72);
    return { date: s.d, received, accepted, mustPay, paid: Math.round(mustPay * s.paid) };
  });
  const sum = (k: 'received' | 'accepted' | 'mustPay' | 'paid') => series.reduce((a, s) => a + s[k], 0);
  const appMissing = rows.filter((h) => h.app && h.fileMissing > 0).length;
  // 8 tuần gần nhất: số hộ đã đăng ký app nhưng chưa nộp tờ khai giảm dần về số hiện tại.
  // Nhãn trục là khoảng ngày thật (7 ngày, kết thúc ở ngày số liệu cuối) thay cho T1…T8.
  const last = new Date(`${days30[days30.length - 1]}T00:00:00`);
  const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(last);
    end.setDate(last.getDate() - (7 - i) * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { label: `${ddmm(start)}–${ddmm(end)}`, value: Math.round(appMissing * (1 + (7 - i) * 0.045)) };
  });
  const byUnit = units(scope).map((u) => {
    const r = rows.filter((h) => u.officers.has(h.officer));
    const k = r.length / Math.max(rows.length, 1);
    // Chênh lệch minh họa ổn định theo đơn vị để bảng so sánh có ý nghĩa.
    const v = ([...u.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 9) / 100 - 0.04;
    return {
      name: u.name,
      received: Math.round(sum('received') * k),
      okRate: Math.min(0.995, (sum('received') ? sum('accepted') / sum('received') : 0) + v / 2),
      paidRate: Math.min(0.99, (sum('mustPay') ? sum('paid') / sum('mustPay') : 0) + v),
      appMissing: r.filter((h) => h.app && h.fileMissing > 0).length,
      registered: r.filter((h) => h.app).length,
    };
  });
  const today = series[series.length - 1];
  const avg7 = series.slice(-8, -1).reduce((a, s) => a + s.received, 0) / 7;
  return {
    today,
    avg7,
    okRate: sum('received') ? sum('accepted') / sum('received') : 0,
    paidRate: sum('mustPay') ? sum('paid') / sum('mustPay') : 0,
    registered: rows.filter((h) => h.app).length,
    appMissing,
    series,
    weeks,
    byUnit,
  };
}

/* ---------- 5. Thông báo và nhắc việc ---------- */

export type ReminderKind = 'DUE_SOON' | 'OVERDUE' | 'TODO' | 'THRESHOLD';
export const REMINDER_ORDER: ReminderKind[] = ['DUE_SOON', 'OVERDUE', 'TODO', 'THRESHOLD'];
export const REMINDER_LABEL: Record<ReminderKind, string> = {
  DUE_SOON: 'Sắp đến hạn',
  OVERDUE: 'Quá hạn chưa làm',
  TODO: 'Việc phải làm',
  THRESHOLD: 'Sắp đạt ngưỡng doanh thu',
};
export const REMINDER_HINT: Record<ReminderKind, string> = {
  DUE_SOON: 'Nhắc HKD sắp đến hạn nộp tờ khai, nộp thuế',
  OVERDUE: 'Nhắc HKD chưa nộp tờ khai, chưa nộp thuế đúng hạn',
  TODO: 'Nhắc HKD lập tờ khai, nộp thuế khi phát sinh nghĩa vụ',
  THRESHOLD: 'Báo HKD có doanh thu sắp vượt mốc',
};

// Giả định minh họa: số thông báo trung bình mỗi HKD trong 30 ngày, tỷ lệ HKD hoàn thành việc sau khi được nhắc, tỷ lệ kênh đã tiếp nhận.
const REM_RATE: Record<ReminderKind, { perHkd: number; done: number | null; accepted: number }> = {
  DUE_SOON: { perHkd: 3.4, done: 0.58, accepted: 0.95 },
  OVERDUE: { perHkd: 7.2, done: 0.29, accepted: 0.93 },
  TODO: { perHkd: 1.6, done: 0.44, accepted: 0.95 },
  THRESHOLD: { perHkd: 1.2, done: null, accepted: 0.96 },
};
const YTD = 301 / 365; // 28/10 là ngày thứ 301 của năm; doanh thu từ đầu năm ước theo doanh thu năm.
const PR_OF: Record<Exclude<ReminderKind, 'THRESHOLD'>, Priority> = { DUE_SOON: 'DUE_SOON', OVERDUE: 'OVERDUE', TODO: 'IN_TERM' };
// Hình dạng gửi theo ngày: sắp hạn dồn vào tuần trước hạn 30/10, việc phải làm dồn đầu kỳ (01/10), ngưỡng doanh thu gửi theo lô đầu tuần.
const remShape: Record<ReminderKind, number[]> = {
  DUE_SOON: days30.map((_, i) => (i >= 21 ? 3 : i >= 13 && i <= 19 ? 1.4 : 0.35)),
  OVERDUE: days30.map((d) => ([0, 6].includes(new Date(`${d}T00:00:00`).getDay()) ? 0.5 : 1) * (0.9 + rand() * 0.2)),
  TODO: days30.map((_, i) => (i < 2 ? 0.3 : Math.max(0.25, 3 - (i - 2) * 0.35))),
  THRESHOLD: days30.map((d) => (new Date(`${d}T00:00:00`).getDay() === 1 ? 1 : 0.05)),
};

export async function fetchReminders(scope: string) {
  const [{ current }] = await Promise.all([fetchConfig(), wait()]);
  const cfg = current.values;
  const near = cfg.nearThresholdPct / 100;
  const rows = inScope(scope);
  const ytd = (h: Hkd) => h.revenue * YTD;
  /** Mốc doanh thu HKD sắp đạt (từ ngưỡng nhắc tới dưới mốc), -1 nếu không có. */
  const nearMilestone = (h: Hkd) => POLICY_THRESHOLDS.findIndex((t) => ytd(h) >= near * t.amount && ytd(h) < t.amount);
  const hits = (h: Hkd, k: ReminderKind) => (k === 'THRESHOLD' ? nearMilestone(h) >= 0 : h.filePr === PR_OF[k] || h.payPr === PR_OF[k]);

  const kinds = REMINDER_ORDER.map((k) => {
    const list = rows.filter((h) => hits(h, k));
    const r = REM_RATE[k];
    const done = r.done == null ? null : Math.round((list.length * r.done) / (1 - r.done));
    const reminded = list.length + (done ?? 0);
    const sent = Math.round(reminded * r.perHkd);
    const subs = k === 'THRESHOLD'
      ? POLICY_THRESHOLDS.map((t, i) => ({ name: `Mốc ${num0(t.amount / 1e9)} tỷ`, hkd: list.filter((h) => nearMilestone(h) === i).length }))
      : [
          { name: 'Tờ khai', hkd: list.filter((h) => h.filePr === PR_OF[k]).length },
          { name: 'Nộp thuế', hkd: list.filter((h) => h.payPr === PR_OF[k]).length },
        ];
    return { kind: k, hkd: list.length, subs, reminded, done, sent, accepted: Math.round(sent * r.accepted), enabled: k === 'THRESHOLD' ? cfg.revenueEnabled : cfg.reminderEnabled };
  });

  const series = days30.map((date, i) => {
    const point: Record<ReminderKind, number> & { date: string } = { date, DUE_SOON: 0, OVERDUE: 0, TODO: 0, THRESHOLD: 0 };
    kinds.forEach((k) => {
      const shape = remShape[k.kind];
      point[k.kind] = Math.round((k.sent * shape[i]) / shape.reduce((a, b) => a + b, 0));
    });
    return point;
  });

  const milestones = POLICY_THRESHOLDS.map((t, i) => {
    const nearList = rows.filter((h) => nearMilestone(h) === i);
    return {
      code: t.code,
      amount: t.amount,
      meaning: t.meaning.replace(/\s*\(minh họa\)/, ''),
      near: nearList.length,
      notified: Math.round(nearList.length * REM_RATE.THRESHOLD.perHkd),
      passed: rows.filter((h) => ytd(h) >= t.amount).length,
    };
  });

  const byUnit = units(scope).map((u) => {
    const r = rows.filter((h) => u.officers.has(h.officer));
    const counts = Object.fromEntries(REMINDER_ORDER.map((k) => [k, r.filter((h) => hits(h, k)).length])) as Record<ReminderKind, number>;
    const sent = kinds.reduce((s, k) => s + Math.round(k.sent * (k.hkd ? counts[k.kind] / k.hkd : 0)), 0);
    return { name: u.name, counts, sent };
  });

  return {
    rule: { daysBefore: cfg.daysBefore, nearPct: cfg.nearThresholdPct },
    totalSent: kinds.reduce((s, k) => s + k.sent, 0),
    totalAccepted: kinds.reduce((s, k) => s + k.accepted, 0),
    kinds,
    series,
    milestones,
    byUnit,
  };
}

const num0 = (v: number) => v.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
