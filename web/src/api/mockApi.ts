// Mock API trong bộ nhớ: mô phỏng độ trễ, phân trang phía server, lỗi và xung đột. Thay bằng API quản trị thật khi backend sẵn sàng.
import { DAYS, OBLIGATION_CUTOFF, UPDATED_AT, UNITS, notifications, runs, taxpayers } from '../data/mock';
import { STAFF, TEAMS, officerOf } from '../data/org';
import { INITIAL_HISTORY, diffConfig, formatValue, type ConfigValues, type ConfigVersion } from '../data/config';
import type { DeliveryStatus, GroupCode, Notification, Priority, Role, RunStatus, SendRun, SendStatus, Staff, Taxpayer } from '../data/types';

// Độ trễ mô phỏng mạng để giao diện luôn đi qua trạng thái tải (skeleton).
const wait = (ms = 650) => new Promise((r) => setTimeout(r, ms));

export class ApiError extends Error {
  code: 'LOAD' | 'CONFLICT' | 'STATE_CHANGED' | 'INVALID';
  constructor(code: ApiError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

export interface StatsFilter {
  /** Phạm vi xem: 'ALL' (toàn cơ sở), mã tổ ('T1') hoặc mã cán bộ ('binh'). */
  unit: string;
  from: string;
  to: string;
  /** 'D1' = nhóm cha Nhắc nghĩa vụ (khai thuế hoặc nộp thuế). */
  group: 'all' | 'D1' | GroupCode;
}

/* ---------- Tài khoản và phạm vi xem ---------- */

// Kho tài khoản thay đổi được; giao diện đọc đồng bộ qua orgSnapshot() để tính quyền và phạm vi.
let staffStore: Staff[] = STAFF.map((s) => ({ ...s }));
const orgSubs = new Set<() => void>();
export const orgSnapshot = () => staffStore;
export const subscribeOrg = (cb: () => void) => (orgSubs.add(cb), () => void orgSubs.delete(cb));

/** NNT trong phạm vi; null nghĩa là toàn cơ sở. */
function scopeIds(scope: string): Set<number> | null {
  if (scope === 'ALL') return null;
  const team = TEAMS.some((t) => t.id === scope);
  const owners = new Set(team ? staffStore.filter((s) => s.team === scope).map((s) => s.id) : [scope]);
  const ids = new Set<number>();
  officerOf.forEach((o, id) => owners.has(o) && ids.add(id));
  return ids;
}

function filterNotifications(f: StatsFilter, day?: string | null) {
  const ids = scopeIds(f.unit);
  return notifications.filter((n) => {
    if (ids && !ids.has(n.taxpayerId)) return false;
    const d = n.createdAt.slice(0, 10);
    if (d < f.from || d > f.to) return false;
    if (day && d !== day) return false;
    if (f.group === 'D1' ? !n.groups.some((g) => g === 'D1a' || g === 'D1b') : f.group !== 'all' && !n.groups.includes(f.group)) return false;
    return true;
  });
}

export interface Summary {
  total: number;
  sent: number;
  delivered: number | null;
  pending: number;
  failed: number;
  /** Chưa rõ kết quả, hết hạn gửi hoặc bỏ qua: phần còn lại để Đã gửi + Chờ gửi + Gửi thất bại + khác = Tổng. */
  other: number;
  uniqueTaxpayers: number;
  /** Thời gian phản hồi trung bình (phút) từ lúc tạo tới khi iHanoi tiếp nhận; null nếu chưa có thông báo có mốc tiếp nhận. */
  avgResponse: number | null;
  updatedAt: string;
  stale: boolean;
  byDay: { date: string; total: number; sent: number }[];
}

const minutesBetween = (a: string, b: string) => (new Date(b).getTime() - new Date(a).getTime()) / 60_000;
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/** Hai chặng của thời gian phản hồi, chỉ tính thông báo đã giao. */
function responseOf(rows: Notification[]) {
  const done = rows.filter((n) => n.delivery === 'DELIVERED' && n.processedAt && n.deliveredAt);
  return {
    count: done.length,
    total: mean(done.map((n) => minutesBetween(n.createdAt, n.deliveredAt!))),
    toSend: mean(done.map((n) => minutesBetween(n.createdAt, n.processedAt!))),
    toDeliver: mean(done.map((n) => minutesBetween(n.processedAt!, n.deliveredAt!))),
  };
}

export async function fetchSummary(f: StatsFilter): Promise<Summary> {
  await wait();
  const rows = filterNotifications(f);
  const byDay = DAYS.filter((d) => d.date >= f.from && d.date <= f.to).map((d) => {
    const dayRows = rows.filter((r) => r.createdAt.startsWith(d.date));
    return { date: d.date, total: dayRows.length, sent: dayRows.filter((r) => r.send === 'SENT').length };
  });
  return {
    total: rows.length,
    sent: rows.filter((r) => r.send === 'SENT').length,
    delivered: rows.filter((r) => r.delivery === 'DELIVERED' || r.delivery === 'ACCEPTED').length,
    pending: rows.filter((r) => r.send === 'PENDING').length,
    failed: rows.filter((r) => r.send === 'FAILED').length,
    other: rows.filter((r) => r.send === 'UNKNOWN' || r.send === 'EXPIRED' || r.send === 'SKIPPED').length,
    uniqueTaxpayers: new Set(rows.map((r) => r.taxpayerId)).size,
    avgResponse: responseOf(rows).total,
    updatedAt: UPDATED_AT,
    stale: false,
    byDay,
  };
}

export interface ResponseBreakdown {
  /** Số thông báo đã giao được tính. */
  count: number;
  total: number | null;
  toSend: number | null;
  toDeliver: number | null;
  byDay: { date: string; count: number; total: number | null; toSend: number | null; toDeliver: number | null }[];
}

export async function fetchResponse(f: StatsFilter): Promise<ResponseBreakdown> {
  await wait(420);
  const rows = filterNotifications(f);
  const byDay = DAYS.filter((d) => d.date >= f.from && d.date <= f.to).map((d) => ({
    date: d.date,
    ...responseOf(rows.filter((r) => r.createdAt.startsWith(d.date))),
  }));
  return { ...responseOf(rows), byDay };
}

export interface ObligationBreakdown {
  cutoff: string;
  file: Record<Priority, number>;
  pay: Record<Priority, number>;
  both: number;
  unique: number;
}

export async function fetchObligations(f: StatsFilter): Promise<ObligationBreakdown> {
  await wait(520);
  const ids = scopeIds(f.unit);
  const scope = ids ? taxpayers.filter((t) => ids.has(t.id)) : taxpayers;
  const tally = (kind: 'filePriority' | 'payPriority') => {
    const r: Record<Priority, number> = { OVERDUE: 0, DUE_SOON: 0, IN_TERM: 0 };
    scope.forEach((t) => t[kind] && r[t[kind]!]++);
    return r;
  };
  return {
    cutoff: OBLIGATION_CUTOFF,
    file: tally('filePriority'),
    pay: tally('payPriority'),
    both: scope.filter((t) => t.fileCount && t.payCount).length,
    unique: scope.filter((t) => t.fileCount || t.payCount).length,
  };
}

export type SendFilter = 'all' | SendStatus;
export type DeliveryFilter = 'all' | DeliveryStatus;
export interface NotificationQuery extends StatsFilter {
  day: string | null;
  /** Kết quả gửi tới trung tâm. */
  send: SendFilter;
  /** Kết quả giao tới người dùng (chỉ có nghĩa với thông báo đã gửi). */
  delivery: DeliveryFilter;
  q: string;
  page: number;
  size: number;
}

export interface Page<T> {
  rows: T[];
  total: number;
}

const matchQ = (t: Taxpayer, q: string) => {
  if (!q) return true;
  const s = q.trim().toLowerCase();
  return t.name.toLowerCase().includes(s) || t.mst.includes(s);
};

export type NotificationRow = Notification & { taxpayer: Taxpayer };

export async function fetchNotifications(qy: NotificationQuery): Promise<Page<NotificationRow>> {
  await wait();
  const rows = filterNotifications(qy, qy.day).filter((n) => {
    if (qy.send !== 'all' && n.send !== qy.send) return false;
    // Lọc "Đã tiếp nhận" gồm cả hai mã DELIVERED và ACCEPTED.
    if (qy.delivery === 'DELIVERED' ? n.delivery !== 'DELIVERED' && n.delivery !== 'ACCEPTED' : qy.delivery !== 'all' && n.delivery !== qy.delivery) return false;
    return matchQ(taxpayers[n.taxpayerId], qy.q);
  });
  const start = (qy.page - 1) * qy.size;
  return {
    total: rows.length,
    rows: rows.slice(start, start + qy.size).map((n) => ({
      ...n,
      taxpayer: taxpayers[n.taxpayerId],
    })),
  };
}

export interface TaxpayerQuery extends StatsFilter {
  q: string;
  /** Chỉ NNT có thông báo trong kỳ (mở từ KPI NNT duy nhất). */
  notified: boolean;
  kind: 'file' | 'pay' | null;
  priority: Priority | null;
  /** Đã đăng ký app iHanoi nhưng còn hồ sơ khai chưa nộp (giả lập). */
  app?: boolean;
  page: number;
  size: number;
}

export async function fetchTaxpayers(qy: TaxpayerQuery): Promise<Page<Taxpayer>> {
  await wait();
  const ids = scopeIds(qy.unit);
  const notifiedSet = qy.notified ? new Set(filterNotifications(qy).map((n) => n.taxpayerId)) : null;
  const rank: Record<Priority, number> = { OVERDUE: 0, DUE_SOON: 1, IN_TERM: 2 };
  const top = (t: Taxpayer) => Math.min(t.filePriority ? rank[t.filePriority] : 9, t.payPriority ? rank[t.payPriority] : 9);
  const rows = taxpayers
    .filter((t) => {
      if (ids && !ids.has(t.id)) return false;
      if (notifiedSet) {
        if (!notifiedSet.has(t.id)) return false;
      } else if (!t.fileCount && !t.payCount) return false;
      if (qy.kind === 'file' && (!t.fileCount || (qy.priority && t.filePriority !== qy.priority))) return false;
      if (qy.kind === 'pay' && (!t.payCount || (qy.priority && t.payPriority !== qy.priority))) return false;
      if (!qy.kind && qy.priority && t.filePriority !== qy.priority && t.payPriority !== qy.priority) return false;
      if (qy.app && !(appRegistered(t.id) && t.fileCount > 0)) return false;
      return matchQ(t, qy.q);
    })
    .sort((a, b) => top(a) - top(b) || a.id - b.id);
  const start = (qy.page - 1) * qy.size;
  return { total: rows.length, rows: rows.slice(start, start + qy.size) };
}

export async function fetchTaxpayerNotifications(id: number) {
  await wait(260);
  return notifications.filter((n) => n.taxpayerId === id).slice(0, 10);
}

/* ---------- Đợt gửi (có trạng thái thay đổi được) ---------- */

const runStore: SendRun[] = runs.map((r) => ({ ...r, timeline: [...r.timeline] }));

export interface RunQuery extends StatsFilter {
  status: 'all' | RunStatus;
  q: string;
  page: number;
  size: number;
}

// Đợt gửi là của cả Thuế cơ sở nên không tách theo tổ/cán bộ: mọi phạm vi xem cùng một số liệu đợt.
export async function fetchRuns(qy: RunQuery): Promise<Page<SendRun>> {
  await wait();
  const rows = runStore
    .filter((r) => r.date >= qy.from && r.date <= qy.to && (qy.status === 'all' || r.status === qy.status))
    .filter((r) => !qy.q || r.id.toLowerCase().includes(qy.q.trim().toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));
  const start = (qy.page - 1) * qy.size;
  return { total: rows.length, rows: rows.slice(start, start + qy.size) };
}

/** Đợt còn đang vận hành gần nhất trong phạm vi: câu trả lời đầu tiên của màn Thống kê. */
export async function fetchActiveRun(_f: StatsFilter) {
  await wait();
  const r = runStore
    .filter((x) => !['DONE', 'CANCELLED'].includes(x.status))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  return r ? { ...r, timeline: [...r.timeline] } : null;
}

export async function fetchRun(id: string) {
  await wait(240);
  const r = runStore.find((x) => x.id === id);
  if (!r) throw new ApiError('LOAD', 'Không tìm thấy đợt gửi.');
  return { ...r, timeline: [...r.timeline] };
}

export type RunAction = 'approve' | 'pause' | 'resume' | 'cancel';
export const RUN_ACTIONS: Record<RunStatus, RunAction[]> = {
  PLANNED: ['approve', 'cancel'],
  HOLD: ['approve', 'cancel'],
  APPROVED: ['pause', 'cancel'],
  SENDING: ['pause', 'cancel'],
  PAUSED: ['resume', 'cancel'],
  DONE: [],
  CANCELLED: [],
};

const NEXT: Record<RunAction, RunStatus> = { approve: 'APPROVED', pause: 'PAUSED', resume: 'SENDING', cancel: 'CANCELLED' };
const ACTION_TEXT: Record<RunAction, string> = { approve: 'Duyệt đợt', pause: 'Tạm dừng', resume: 'Tiếp tục gửi', cancel: 'Hủy đợt' };

export async function actOnRun(id: string, action: RunAction, reason: string, expected: RunStatus, by: string) {
  await wait(600);
  const r = runStore.find((x) => x.id === id)!;
  if (r.status !== expected) throw new ApiError('STATE_CHANGED', 'Đợt đã đổi trạng thái trong lúc bạn đang xem. Chi tiết đã được tải lại.');
  if (!RUN_ACTIONS[r.status].includes(action)) throw new ApiError('STATE_CHANGED', 'Thao tác không còn hợp lệ với trạng thái hiện tại.');
  r.status = NEXT[action];
  if (action === 'cancel') {
    r.skipped += r.pending;
    r.pending = 0;
  }
  r.timeline.push({ at: '2026-10-28T09:16', text: `${ACTION_TEXT[action]}${reason ? ` — ${reason}` : ''}`, by });
  return { ...r, timeline: [...r.timeline] };
}

/* ---------- Cấu hình ---------- */

let history: ConfigVersion[] = INITIAL_HISTORY.map((h) => ({ ...h }));

export async function fetchConfig() {
  await wait(320);
  return { current: history.find((h) => !h.pending)!, history: [...history] };
}

export interface SavePayload {
  baseVersion: number;
  values: ConfigValues;
  reason: string;
  effective: 'now' | string;
  by: string;
}

export async function saveConfig(p: SavePayload) {
  await wait(700);
  const latest = history[0];
  if (p.baseVersion !== latest.version) throw new ApiError('CONFLICT', 'Thiết lập đã được cập nhật bởi người khác.');
  const keys = diffConfig(latest.values, p.values);
  const pending = p.effective !== 'now';
  const next: ConfigVersion = {
    version: latest.version + 1,
    values: p.values,
    updatedBy: p.by,
    updatedAt: '2026-10-28T09:16',
    effectiveAt: pending ? p.effective : '2026-10-28T09:16',
    reason: p.reason,
    pending,
    changes: keys.map((key) => ({ key, from: formatValue(key, latest.values[key]), to: formatValue(key, p.values[key]) })),
  };
  history = [next, ...history];
  return next;
}

/* ---------- Tài khoản ---------- */

export type AccountRow = Staff & { taxpayers: number };

const loadOf = (id: string) => officerOf.reduce((n, o) => (o === id ? n + 1 : n), 0);

/** Tài khoản trong phạm vi quản lý: cả cơ sở, hoặc một tổ. */
export async function fetchAccounts(team: string | null): Promise<AccountRow[]> {
  await wait(380);
  return staffStore.filter((s) => !team || s.team === team).map((s) => ({ ...s, taxpayers: loadOf(s.id) }));
}

export interface AccountPatch {
  role: Exclude<Role, 'base'>;
  team: string;
  active: boolean;
}

export async function updateAccount(id: string, patch: AccountPatch, actorId: string) {
  await wait(500);
  const target = staffStore.find((s) => s.id === id);
  if (!target) throw new ApiError('LOAD', 'Không tìm thấy tài khoản.');
  if (id === actorId) throw new ApiError('INVALID', 'Không tự đổi quyền của chính mình.');
  if (target.role === 'base') throw new ApiError('INVALID', 'Tài khoản lãnh đạo cơ sở do cấp trên cấp, không đổi ở đây.');
  const lead = staffStore.find((s) => s.id !== id && s.active && s.role === 'team' && s.team === patch.team);
  if (patch.role === 'team' && patch.active && lead) {
    const team = TEAMS.find((t) => t.id === patch.team)!.name;
    throw new ApiError('INVALID', `${team} đã có lãnh đạo tổ là ${lead.name}. Chuyển ${lead.name} về Cán bộ trước.`);
  }
  staffStore = staffStore.map((s) => (s.id === id ? { ...s, ...patch } : s));
  orgSubs.forEach((f) => f());
  return { ...staffStore.find((s) => s.id === id)!, taxpayers: loadOf(id) };
}

export { UNITS };

/* ---------- [Thêm] Gửi lại, lý do lỗi, đăng ký app (giả lập: hệ thống thật chưa trả các trường này) ---------- */

const hashOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export interface FailReason {
  code: 'TIMEOUT' | 'NO_TOKEN' | 'NOT_REGISTERED' | 'MST_MISMATCH';
  text: string;
  /** Lỗi tạm thời gửi lại được; lỗi dữ liệu cần sửa trước khi gửi lại (đề xuất). */
  retry: boolean;
  fix?: string;
}

export const FAIL_REASONS: FailReason[] = [
  { code: 'TIMEOUT', text: 'iHanoi không phản hồi trong thời gian chờ', retry: true },
  { code: 'NO_TOKEN', text: 'Thiết bị chưa nhận được bản đẩy (ứng dụng đã gỡ hoặc tắt thông báo)', retry: true },
  { code: 'NOT_REGISTERED', text: 'NNT chưa đăng ký tài khoản iHanoi', retry: false, fix: 'Hướng dẫn NNT đăng ký iHanoi rồi gửi lại.' },
  { code: 'MST_MISMATCH', text: 'MST không khớp với tài khoản iHanoi', retry: false, fix: 'Kiểm tra lại MST trong hồ sơ NNT trước khi gửi lại.' },
];

export const failReason = (n: Pick<Notification, 'id'>) => FAIL_REASONS[hashOf(n.id) % FAIL_REASONS.length];

const retryLog = new Map<string, { at: string; by: string }>();
export const retryOf = (id: string) => retryLog.get(id);

/** Gửi lại: thông báo lỗi tạm thời quay về Chờ gửi, vào lượt gửi kế tiếp. */
export async function retryNotifications(ids: string[], by: string) {
  await wait(500);
  let ok = 0;
  let skipped = 0;
  ids.forEach((id) => {
    const n = notifications.find((x) => x.id === id);
    if (!n || n.send !== 'FAILED' || !failReason(n).retry) return void skipped++;
    n.send = 'PENDING';
    n.processedAt = undefined;
    retryLog.set(id, { at: UPDATED_AT, by });
    ok++;
  });
  return { ok, skipped };
}

/** Mã thông báo gửi thất bại, gửi lại được, theo đúng bộ lọc đang xem. */
export async function fetchRetryableIds(qy: NotificationQuery) {
  await wait(200);
  return filterNotifications(qy, qy.day)
    .filter((n) => n.send === 'FAILED' && failReason(n).retry && matchQ(taxpayers[n.taxpayerId], qy.q))
    .map((n) => n.id);
}

/** NNT đã đăng ký ứng dụng iHanoi (giả lập ổn định theo mã NNT). */
export const appRegistered = (id: number) => hashOf(`app-${id}`) % 100 < 58;
