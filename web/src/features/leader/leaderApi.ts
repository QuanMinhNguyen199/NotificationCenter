// Mock API cho phần thống kê của lãnh đạo trong màn Thống kê (view.docx).
// Số của Thuế cơ sở A lấy từ cùng nguồn với màn Quản lý HKD (fetchDaily/fetchStructure/fetchSupport) để hai màn khớp nhau.
// 24 đơn vị còn lại là dữ liệu giả lập, sinh ổn định từ hạt giống cố định; cần API cấp thành phố khi có.
import { fetchDaily, fetchStructure, fetchSupport } from '@/features/hkd/hkdApi';
import { orgSnapshot } from '@/shared/api/mockApi';
import { TEAMS } from '@/shared/data/org';

const wait = (ms = 380) => new Promise((r) => setTimeout(r, ms));
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const OWN_UNIT = 'A';
/** 25 Thuế cơ sở trên địa bàn thành phố: A … Y. */
export const CITY_UNITS = Array.from({ length: 25 }, (_, i) => {
  const value = String.fromCharCode(65 + i);
  return { value, label: `Thuế cơ sở ${value}` };
});
const UNIT_IDS = CITY_UNITS.map((u) => u.value);

export interface UnitRow {
  id: string;
  name: string;
  own: boolean;
  /** Tờ khai tiếp nhận trong 30 ngày. */
  received: number;
  /** Tờ khai xử lý thành công. */
  accepted: number;
  /** Tờ khai phải nộp trong kỳ (mẫu số tạm của tỷ lệ nộp tờ khai). */
  expected: number;
  /** Tỷ lệ nộp tờ khai = tờ khai đã nộp ÷ tờ khai phải nộp. */
  fileRate: number;
  okRate: number;
  failRate: number;
  /** Thời gian phản hồi trung bình của cán bộ (giờ). */
  avgHours: number;
  /** HKD đã đăng ký ứng dụng. */
  users: number;
  /** Tổng HKD trên địa bàn. */
  hkd: number;
}

// Hệ số giả lập cố định theo đơn vị; tạo một lần để mọi lần gọi trả cùng số.
const rand = rng(28102026);
const SHAPE = UNIT_IDS.map((id) => ({
  id,
  size: 0.55 + rand() * 1.05,
  ok: 0.875 + rand() * 0.105,
  file: 0.74 + rand() * 0.22,
  hours: 16 + rand() ** 1.4 * 46,
  app: 0.42 + rand() * 0.34,
}));

/** So sánh 25 Thuế cơ sở trong 30 ngày đến 28/10/2026. */
export async function fetchCityComparison(): Promise<{ units: UnitRow[]; avg: Omit<UnitRow, 'id' | 'name' | 'own'> }> {
  const [daily, structure, support] = await Promise.all([fetchDaily('ALL'), fetchStructure('ALL', 'ward'), fetchSupport('ALL'), wait()]);
  const received = daily.series.reduce((s, x) => s + x.received, 0);
  const accepted = daily.series.reduce((s, x) => s + x.accepted, 0);
  const ownFile = 0.86;
  const own: UnitRow = {
    id: OWN_UNIT,
    name: 'Thuế cơ sở A',
    own: true,
    received,
    accepted,
    expected: Math.round(received / ownFile),
    fileRate: ownFile,
    okRate: received ? accepted / received : 0,
    failRate: received ? 1 - accepted / received : 0,
    avgHours: support.avgHours ?? 0,
    users: daily.registered,
    hkd: structure.total,
  };
  const units = SHAPE.map((s): UnitRow => {
    if (s.id === OWN_UNIT) return own;
    const r = Math.round(received * s.size);
    const a = Math.round(r * s.ok);
    const hkd = Math.round(structure.total * s.size);
    return {
      id: s.id,
      name: `Thuế cơ sở ${s.id}`,
      own: false,
      received: r,
      accepted: a,
      expected: Math.round(r / s.file),
      fileRate: s.file,
      okRate: r ? a / r : 0,
      failRate: r ? 1 - a / r : 0,
      avgHours: s.hours,
      users: Math.round(hkd * s.app),
      hkd,
    };
  });
  const sum = (k: keyof UnitRow) => units.reduce((t, u) => t + (u[k] as number), 0);
  const n = units.length;
  // Trung bình thành phố: tỷ lệ tính trên tổng (không trung bình cộng các tỷ lệ), thời gian phản hồi lấy trung bình đơn vị.
  const avg = {
    received: sum('received') / n,
    accepted: sum('accepted') / n,
    expected: sum('expected') / n,
    fileRate: sum('received') / sum('expected'),
    okRate: sum('accepted') / sum('received'),
    failRate: 1 - sum('accepted') / sum('received'),
    avgHours: sum('avgHours') / n,
    users: sum('users') / n,
    hkd: sum('hkd') / n,
  };
  return { units, avg };
}

export interface OfficerPerf {
  id: string;
  name: string;
  team: string;
  teamName: string;
  /** Tờ khai xử lý thành công của NNT do cán bộ phụ trách (30 ngày). */
  declarations: number;
  /** Yêu cầu hỗ trợ đã tiếp nhận (30 ngày). */
  requests: number;
  avgHours: number | null;
  /** Tỷ lệ yêu cầu phản hồi trong hạn 48 giờ (giả lập). */
  onTime: number | null;
}

/** Hiệu quả từng cán bộ trong Thuế cơ sở A, 30 ngày. */
export async function fetchOfficerPerf(): Promise<OfficerPerf[]> {
  const officers = orgSnapshot().filter((s) => s.role === 'officer' && s.active);
  const [support, ...dailies] = await Promise.all([fetchSupport('ALL'), ...officers.map((o) => fetchDaily(o.id))]);
  return officers.map((o, i) => {
    const sup = support.officers.find((r) => r.name === o.name);
    const r = rng([...o.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    const h = sup?.avgHours ?? null;
    return {
      id: o.id,
      name: o.name,
      team: o.team ?? '',
      teamName: TEAMS.find((t) => t.id === o.team)?.name ?? '',
      declarations: dailies[i].series.reduce((s, x) => s + x.accepted, 0),
      requests: sup?.total ?? 0,
      avgHours: h,
      onTime: h == null ? null : Math.max(0.55, Math.min(0.99, 0.97 - (h - 24) / 120 + (r() - 0.5) * 0.06)),
    };
  });
}

