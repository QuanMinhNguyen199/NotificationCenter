// Mock API phần Notification Center: kênh gửi, mẫu tin, gửi chủ động (tài liệu web/doc/Notification Center Service.md).
// Dữ liệu minh họa trong bộ nhớ; tiến độ gửi mô phỏng theo thời gian thực để màn theo dõi có chuyển động thật.
import { taxpayers } from '@/shared/data/mock';
import { officerOf, TEAMS } from '@/shared/data/org';
import { ApiError, orgSnapshot } from '@/shared/api/mockApi';

const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms));
/** Giờ hiển thị của bản mô phỏng, khớp các thao tác khác (đợt gửi, thiết lập). */
const NOW_LABEL = '2026-10-28T09:16';

/* ---------- Kênh gửi ---------- */

export type ChannelId = 'IN_APP' | 'IHANOI' | 'EMAIL' | 'ZALO';
export type ChannelStatus = 'ACTIVE' | 'PAUSED' | 'DISABLED_EMERGENCY' | 'NOT_CONNECTED';
export type Capability = 'VERIFIED' | 'UNVERIFIED' | 'NONE';

export interface Channel {
  id: ChannelId;
  name: string;
  desc: string;
  status: ChannelStatus;
  /** Có xác nhận đã tới máy người nhận không. */
  receipt: Capability;
  retrySafe: Capability;
  history: { at: string; by: string; from: ChannelStatus; to: ChannelStatus; reason: string }[];
}

let channels: Channel[] = [
  { id: 'IN_APP', name: 'Hộp thư trong ứng dụng', desc: 'Lưu vào hộp thư chung của NNT trên Mobile và Web; đọc trên thiết bị nào cũng đồng bộ.', status: 'ACTIVE', receipt: 'VERIFIED', retrySafe: 'VERIFIED', history: [] },
  { id: 'IHANOI', name: 'Thông báo đẩy iHanoi', desc: 'Đẩy qua iHanoi theo CCCD đã ánh xạ. iHanoi chỉ xác nhận đã tiếp nhận, chưa xác minh có xác nhận đã tới máy.', status: 'ACTIVE', receipt: 'UNVERIFIED', retrySafe: 'UNVERIFIED', history: [] },
  { id: 'EMAIL', name: 'Email', desc: 'Chưa chọn nhà cung cấp và địa chỉ gửi. Cần thông tin kết nối và kiểm thử hợp đồng trước khi bật.', status: 'NOT_CONNECTED', receipt: 'NONE', retrySafe: 'NONE', history: [] },
  { id: 'ZALO', name: 'Zalo OA', desc: 'Chưa có tài khoản OA và mẫu tin được Zalo duyệt. Không gửi được nội dung tự do qua Zalo.', status: 'NOT_CONNECTED', receipt: 'NONE', retrySafe: 'NONE', history: [] },
];

export async function fetchChannels() {
  await wait(300);
  return channels.map((c) => ({ ...c, history: [...c.history] }));
}

export async function setChannelStatus(id: ChannelId, to: ChannelStatus, reason: string, by: string) {
  await wait(500);
  const c = channels.find((x) => x.id === id)!;
  if (c.status === 'NOT_CONNECTED') throw new ApiError('INVALID', 'Kênh chưa kết nối, không đổi trạng thái được.');
  channels = channels.map((x) => (x.id === id ? { ...x, status: to, history: [{ at: NOW_LABEL, by, from: x.status, to, reason }, ...x.history] } : x));
  return channels.find((x) => x.id === id)!;
}
const channelOf = (id: ChannelId) => channels.find((c) => c.id === id)!;

/* ---------- Mẫu tin ---------- */

export interface TemplateVersion {
  version: number;
  status: 'PUBLISHED' | 'DRAFT';
  title: string;
  body: string;
  by: string;
  at: string;
  reason?: string;
}
export interface Template {
  id: string;
  name: string;
  purpose: string;
  versions: TemplateVersion[];
}

/** Biến tự điền theo từng NNT; biến khác người gửi nhập khi gửi. */
export const AUTO_VARS: Record<string, string> = { ten_nnt: 'Tên NNT', mst: 'Mã số thuế' };
export const varsOf = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];

/** Tên hiển thị của biến: giao diện không lộ cú pháp {ten_bien} cho người dùng. */
const VAR_LABEL: Record<string, string> = {
  ...AUTO_VARS,
  ky_khai: 'Kỳ khai',
  han_nop: 'Hạn nộp',
  thoi_gian: 'Thời gian',
  dia_diem: 'Địa điểm',
  bat_dau: 'Bắt đầu',
  ket_thuc: 'Kết thúc',
};
export const varLabel = (k: string) => VAR_LABEL[k] ?? k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

let templates: Template[] = [
  {
    id: 'tpl-han-khai',
    name: 'Nhắc hạn nộp hồ sơ khai thuế',
    purpose: 'Nhắc NNT còn hồ sơ khai chưa nộp trước hạn.',
    versions: [
      { version: 2, status: 'PUBLISHED', title: 'Nhắc nộp hồ sơ khai thuế', body: 'Kính gửi {ten_nnt} (MST {mst}), hồ sơ khai thuế {ky_khai} cần nộp trước ngày {han_nop}. Mở iHanoi để nộp hồ sơ.', by: 'Nguyễn Minh An', at: '2026-10-20T10:12', reason: 'Thêm kỳ khai vào nội dung' },
      { version: 1, status: 'PUBLISHED', title: 'Nhắc nộp hồ sơ khai thuế', body: 'Kính gửi {ten_nnt}, hồ sơ khai thuế cần nộp trước ngày {han_nop}.', by: 'Nguyễn Minh An', at: '2026-09-02T08:30', reason: 'Tạo mẫu' },
    ],
  },
  {
    id: 'tpl-lich-tiep',
    name: 'Thông báo lịch tiếp NNT',
    purpose: 'Báo lịch tiếp và hỗ trợ NNT tại cơ quan thuế.',
    versions: [{ version: 1, status: 'PUBLISHED', title: 'Lịch tiếp người nộp thuế', body: 'Thuế cơ sở A tiếp và hướng dẫn NNT vào {thoi_gian} tại {dia_diem}. Kính mời {ten_nnt} sắp xếp tham dự.', by: 'Nguyễn Minh An', at: '2026-10-15T14:05', reason: 'Tạo mẫu' }],
  },
  {
    id: 'tpl-bao-tri',
    name: 'Thông báo tạm dừng hệ thống',
    purpose: 'Báo trước lịch bảo trì dịch vụ thuế điện tử.',
    versions: [
      { version: 1, status: 'DRAFT', title: 'Tạm dừng dịch vụ thuế điện tử', body: 'Dịch vụ thuế điện tử tạm dừng từ {bat_dau} đến {ket_thuc} để bảo trì. Mong {ten_nnt} thông cảm.', by: 'Nguyễn Minh An', at: '2026-10-27T16:40' },
    ],
  },
];

export const publishedOf = (t: Template) => t.versions.find((v) => v.status === 'PUBLISHED') ?? null;
export const draftOf = (t: Template) => t.versions.find((v) => v.status === 'DRAFT') ?? null;

export async function fetchTemplates() {
  await wait(320);
  return templates.map((t) => ({ ...t, versions: [...t.versions] }));
}

export interface TemplateInput {
  id?: string;
  name: string;
  purpose: string;
  title: string;
  body: string;
}

/** Lưu nháp: mỗi mẫu có tối đa một bản nháp, ghi đè bản nháp cũ. */
export async function saveDraft(input: TemplateInput, by: string) {
  await wait(450);
  const draft = { status: 'DRAFT' as const, title: input.title, body: input.body, by, at: NOW_LABEL };
  if (!input.id) {
    const t: Template = { id: `tpl-${Date.now()}`, name: input.name, purpose: input.purpose, versions: [{ version: 1, ...draft }] };
    templates = [t, ...templates];
    return t;
  }
  templates = templates.map((t) => {
    if (t.id !== input.id) return t;
    const top = Math.max(...t.versions.map((v) => v.version));
    const rest = t.versions.filter((v) => v.status !== 'DRAFT');
    const version = draftOf(t)?.version ?? top + 1;
    return { ...t, name: input.name, purpose: input.purpose, versions: [{ version, ...draft }, ...rest] };
  });
  return templates.find((t) => t.id === input.id)!;
}

/** Xuất bản bản nháp thành phiên bản dùng được khi gửi. Phiên bản đã xuất bản không sửa được. */
export async function publishDraft(id: string, reason: string, by: string) {
  await wait(500);
  templates = templates.map((t) =>
    t.id === id ? { ...t, versions: t.versions.map((v) => (v.status === 'DRAFT' ? { ...v, status: 'PUBLISHED' as const, by, at: NOW_LABEL, reason } : v)) } : t,
  );
  return templates.find((t) => t.id === id)!;
}

/* ---------- Người nhận ---------- */

export type AudienceKind = 'pick' | 'team' | 'group';
export const GROUPS = [
  { id: 'file-overdue', name: 'Quá hạn khai thuế', match: (id: number) => taxpayers[id].filePriority === 'OVERDUE' },
  { id: 'pay-soon', name: 'Sắp hạn nộp thuế (0–7 ngày)', match: (id: number) => taxpayers[id].payPriority === 'DUE_SOON' },
  { id: 'paused', name: 'Tạm ngừng kinh doanh', match: (id: number) => taxpayers[id].hkdStatus === 'Tạm ngừng kinh doanh' },
];

/** NNT trong phạm vi người gửi: lãnh đạo cơ sở cả cơ sở, lãnh đạo tổ chỉ tổ mình. */
export function scopeTaxpayers(team: string | null) {
  if (!team) return taxpayers.map((t) => t.id);
  const owners = new Set(orgSnapshot().filter((s) => s.team === team).map((s) => s.id));
  return taxpayers.filter((t) => owners.has(officerOf[t.id])).map((t) => t.id);
}

export function resolveAudience(kind: AudienceKind, value: string[] | string, team: string | null): number[] {
  const scope = scopeTaxpayers(team);
  const inScope = new Set(scope);
  if (kind === 'pick') return (value as string[]).map(Number).filter((id) => inScope.has(id));
  if (kind === 'team') return scopeTaxpayers(value as string).filter((id) => inScope.has(id));
  const g = GROUPS.find((x) => x.id === value)!;
  return scope.filter(g.match);
}

/** NNT chưa có ánh xạ iHanoi (minh họa ~3%): bỏ qua kênh iHanoi với lý do Không có địa chỉ nhận. */
export const noIhanoi = (id: number) => (id * 2654435761) % 100 < 3;

/* ---------- Lần gửi chủ động ---------- */

export type DeliveryState = 'READY' | 'SENDING' | 'RETRY_WAIT' | 'ACCEPTED' | 'DELIVERED' | 'FAILED' | 'UNKNOWN' | 'SKIPPED' | 'CANCELED';
export interface Attempt {
  no: number;
  at: string;
  outcome: 'ACCEPTED' | 'DELIVERED' | 'REJECTED' | 'UNKNOWN';
  code?: string;
  latencyMs: number;
}
interface PlannedDelivery {
  channel: ChannelId;
  /** Kết quả cuối nếu không bị hủy. */
  final: DeliveryState;
  reason?: string;
  /** Mốc hoàn tất tính từ lúc bắt đầu gửi (ms). */
  doneAt: number;
  attempts: Attempt[];
}
interface PlannedRecipient {
  taxpayerId: number;
  deliveries: PlannedDelivery[];
}
export interface SendRequest {
  id: string;
  createdBy: string;
  createdAt: string;
  team: string | null;
  audienceLabel: string;
  channels: ChannelId[];
  contentLabel: string;
  freeText: boolean;
  title: string;
  body: string;
  /** Mốc thời gian thực bắt đầu gửi; null với lần gửi minh họa đã xong. */
  startedMs: number | null;
  canceled?: { by: string; at: string; reason: string; atMs: number };
  recipients: PlannedRecipient[];
}

const REASON: Record<string, string> = {
  NO_ENDPOINT: 'Chưa có ánh xạ iHanoi',
  INVALID_TARGET: 'iHanoi từ chối người nhận',
  TIMEOUT_UNKNOWN: 'Hết thời gian chờ, chưa rõ iHanoi đã nhận chưa',
  CHANNEL_PAUSED: 'Kênh đang tạm dừng',
  EMERGENCY_DISABLED: 'Kênh bị ngắt khẩn cấp',
  CANCELED_BY_USER: 'Đã hủy phần chưa gửi',
  // Mã lỗi của từng lần thử (hiện cạnh kết quả lần thử).
  CONNECT_FAILED: 'Không kết nối được iHanoi',
  READ_TIMEOUT: 'Hết thời gian chờ phản hồi',
};
export const reasonText = (code?: string) => (code ? REASON[code] ?? code : '');

const SPAN = 15_000;
const atLabel = (offsetMs: number) => {
  const s = 960 * 60 + Math.round(offsetMs / 1000);
  return `2026-10-28T${String(Math.floor(s / 3600) % 24).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

function plan(ids: number[], chans: ChannelId[]): PlannedRecipient[] {
  return ids.map((id, i) => {
    const base = Math.round((i / Math.max(ids.length, 1)) * SPAN);
    const deliveries = chans.map((channel): PlannedDelivery => {
      if (channel === 'IN_APP') {
        const doneAt = base + 300;
        return { channel, final: 'DELIVERED', doneAt, attempts: [{ no: 1, at: atLabel(doneAt), outcome: 'DELIVERED', latencyMs: 40 }] };
      }
      if (noIhanoi(id)) return { channel, final: 'SKIPPED', reason: 'NO_ENDPOINT', doneAt: base, attempts: [] };
      const r = (id * 40503 + i * 7) % 1000;
      const doneAt = base + 1200;
      if (r < 20) return { channel, final: 'FAILED', reason: 'INVALID_TARGET', doneAt, attempts: [{ no: 1, at: atLabel(doneAt), outcome: 'REJECTED', code: 'INVALID_TARGET', latencyMs: 640 }] };
      if (r < 35) return { channel, final: 'UNKNOWN', reason: 'TIMEOUT_UNKNOWN', doneAt: base + 10_000, attempts: [{ no: 1, at: atLabel(base + 10_000), outcome: 'UNKNOWN', code: 'READ_TIMEOUT', latencyMs: 10_000 }] };
      if (r < 85) {
        // Lỗi kết nối trước khi gửi (chắc chắn iHanoi chưa nhận) nên thử lại an toàn.
        return { channel, final: 'ACCEPTED', doneAt: doneAt + 2500, attempts: [{ no: 1, at: atLabel(doneAt), outcome: 'REJECTED', code: 'CONNECT_FAILED', latencyMs: 3000 }, { no: 2, at: atLabel(doneAt + 2500), outcome: 'ACCEPTED', latencyMs: 520 }] };
      }
      return { channel, final: 'ACCEPTED', doneAt, attempts: [{ no: 1, at: atLabel(doneAt), outcome: 'ACCEPTED', latencyMs: 480 }] };
    });
    return { taxpayerId: id, deliveries };
  });
}

// Ba lần gửi minh họa đã hoàn tất.
// Bước 37 nguyên tố cùng nhau với 6.200 nên lấy modulo vẫn ra mã NNT không trùng và luôn nằm trong danh sách.
const seedIds = (n: number, from: number) => Array.from({ length: n }, (_, k) => (from + k * 37) % taxpayers.length);
let sends: SendRequest[] = [
  { id: 'GC-20261027-02', createdBy: 'Trần Thu Hà', createdAt: '2026-10-27T15:20', team: 'T1', audienceLabel: 'Nhóm: Sắp hạn nộp thuế (0–7 ngày) · Tổ 1', channels: ['IN_APP', 'IHANOI'], contentLabel: 'Nhắc hạn nộp hồ sơ khai thuế · v2', freeText: false, title: 'Nhắc nộp hồ sơ khai thuế', body: 'Kính gửi {ten_nnt} (MST {mst}), hồ sơ khai thuế quý III/2026 cần nộp trước ngày 30/10/2026. Mở iHanoi để nộp hồ sơ.', startedMs: null, recipients: plan(seedIds(186, 11), ['IN_APP', 'IHANOI']) },
  { id: 'GC-20261027-01', createdBy: 'Nguyễn Minh An', createdAt: '2026-10-27T09:05', team: null, audienceLabel: 'Nhóm: Quá hạn khai thuế', channels: ['IHANOI'], contentLabel: 'Tự soạn', freeText: true, title: 'Hồ sơ khai thuế đã quá hạn', body: 'Kính gửi {ten_nnt}, hồ sơ khai thuế của bạn đã quá hạn. Vui lòng nộp sớm để tránh bị phạt chậm nộp.', startedMs: null, recipients: plan(seedIds(420, 5), ['IHANOI']) },
  { id: 'GC-20261025-01', createdBy: 'Nguyễn Minh An', createdAt: '2026-10-25T08:30', team: null, audienceLabel: '12 NNT được chọn', channels: ['IN_APP', 'IHANOI'], contentLabel: 'Thông báo lịch tiếp NNT · v1', freeText: false, title: 'Lịch tiếp người nộp thuế', body: 'Thuế cơ sở A tiếp và hướng dẫn NNT vào 8:00 ngày 30/10/2026 tại 12 Lê Lợi. Kính mời {ten_nnt} sắp xếp tham dự.', startedMs: null, recipients: plan(seedIds(12, 3), ['IN_APP', 'IHANOI']) },
];

export interface DeliveryView {
  channel: ChannelId;
  state: DeliveryState;
  reason?: string;
  attempts: Attempt[];
}
export interface SendView extends Omit<SendRequest, 'recipients'> {
  status: 'SENDING' | 'DONE' | 'CANCELED';
  total: number;
  perChannel: { channel: ChannelId; counts: Partial<Record<DeliveryState, number>>; done: number; total: number }[];
}

/** Trạng thái một lần gửi tại thời điểm hiện tại, tính lại từ kế hoạch, trạng thái kênh và việc hủy. */
function deliveryNow(s: SendRequest, d: PlannedDelivery, nowMs: number): DeliveryView {
  if (s.startedMs === null) return { channel: d.channel, state: d.final, reason: d.reason, attempts: d.attempts };
  const elapsed = nowMs - s.startedMs;
  const finished = d.doneAt <= elapsed && (!s.canceled || d.doneAt <= s.canceled.atMs - s.startedMs);
  if (finished) return { channel: d.channel, state: d.final, reason: d.reason, attempts: d.attempts };
  if (s.canceled) return { channel: d.channel, state: 'CANCELED', reason: 'CANCELED_BY_USER', attempts: [] };
  const ch = channelOf(d.channel);
  if (ch.status === 'DISABLED_EMERGENCY') return { channel: d.channel, state: 'CANCELED', reason: 'EMERGENCY_DISABLED', attempts: [] };
  if (ch.status === 'PAUSED') return { channel: d.channel, state: 'READY', reason: 'CHANNEL_PAUSED', attempts: [] };
  const firstAttemptAt = d.attempts.length > 1 ? d.doneAt - 2500 : d.doneAt;
  if (d.attempts.length > 1 && elapsed >= firstAttemptAt) return { channel: d.channel, state: 'RETRY_WAIT', attempts: d.attempts.slice(0, 1) };
  return { channel: d.channel, state: elapsed >= firstAttemptAt - 800 ? 'SENDING' : 'READY', attempts: [] };
}

const TERMINAL: DeliveryState[] = ['ACCEPTED', 'DELIVERED', 'FAILED', 'UNKNOWN', 'SKIPPED', 'CANCELED'];

function view(s: SendRequest, nowMs = Date.now()): SendView {
  const perChannel = s.channels.map((channel) => {
    const counts: Partial<Record<DeliveryState, number>> = {};
    let done = 0;
    s.recipients.forEach((r) => {
      const d = r.deliveries.find((x) => x.channel === channel)!;
      const st = deliveryNow(s, d, nowMs).state;
      counts[st] = (counts[st] ?? 0) + 1;
      if (TERMINAL.includes(st)) done++;
    });
    return { channel, counts, done, total: s.recipients.length };
  });
  const allDone = perChannel.every((c) => c.done === c.total);
  const { recipients, ...rest } = s;
  return { ...rest, total: recipients.length, perChannel, status: s.canceled ? 'CANCELED' : allDone ? 'DONE' : 'SENDING' };
}

/** Cán bộ chỉ thấy lần gửi có NNT mình phụ trách; lãnh đạo tổ thấy lần gửi trong tổ và lần gửi toàn cơ sở. */
function visibleTo(s: SendRequest, role: string, userId: string, team: string | null) {
  if (role === 'base') return true;
  if (role === 'team') return s.team === null || s.team === team;
  return s.recipients.some((r) => officerOf[r.taxpayerId] === userId);
}

export async function fetchSends(role: string, userId: string, team: string | null) {
  await wait(380);
  return sends.filter((s) => visibleTo(s, role, userId, team)).map((s) => view(s));
}

export async function fetchSend(id: string) {
  await wait(160);
  const s = sends.find((x) => x.id === id);
  if (!s) throw new ApiError('LOAD', 'Không tìm thấy lần gửi.');
  return view(s);
}

export interface RecipientRow {
  taxpayerId: number;
  name: string;
  mst: string;
  deliveries: DeliveryView[];
}
export type RecipientFilter = 'all' | 'problem';

export async function fetchSendRecipients(id: string, filter: RecipientFilter, page: number, size = 20) {
  await wait(220);
  const s = sends.find((x) => x.id === id)!;
  const now = Date.now();
  const rows: RecipientRow[] = s.recipients.map((r) => ({
    taxpayerId: r.taxpayerId,
    name: taxpayers[r.taxpayerId].name,
    mst: taxpayers[r.taxpayerId].mst,
    deliveries: r.deliveries.map((d) => deliveryNow(s, d, now)),
  }));
  const filtered = filter === 'problem' ? rows.filter((r) => r.deliveries.some((d) => ['FAILED', 'UNKNOWN', 'SKIPPED', 'CANCELED'].includes(d.state))) : rows;
  return { total: filtered.length, rows: filtered.slice((page - 1) * size, page * size) };
}

export interface SendInput {
  ids: number[];
  team: string | null;
  audienceLabel: string;
  channels: ChannelId[];
  contentLabel: string;
  freeText: boolean;
  title: string;
  body: string;
  idempotencyKey: string;
}

const used = new Map<string, string>();
let seq = 1;

export async function createSend(input: SendInput, by: string) {
  await wait(650);
  // Bấm gửi lại khi mạng chập chờn dùng cùng khóa: trả lần gửi cũ, không tạo lần gửi mới.
  const prev = used.get(input.idempotencyKey);
  if (prev) return view(sends.find((s) => s.id === prev)!);
  const blocked = input.channels.filter((c) => channelOf(c).status === 'DISABLED_EMERGENCY' || channelOf(c).status === 'NOT_CONNECTED');
  if (blocked.length) throw new ApiError('INVALID', `Kênh ${blocked.map((c) => channelOf(c).name).join(', ')} không còn gửi được. Chọn lại kênh.`);
  if (!input.ids.length) throw new ApiError('INVALID', 'Chưa có người nhận trong phạm vi được phép.');
  const s: SendRequest = {
    id: `GC-20261028-${String(seq++).padStart(2, '0')}`,
    createdBy: by,
    createdAt: NOW_LABEL,
    team: input.team,
    audienceLabel: input.audienceLabel,
    channels: input.channels,
    contentLabel: input.contentLabel,
    freeText: input.freeText,
    title: input.title,
    body: input.body,
    startedMs: Date.now(),
    recipients: plan(input.ids, input.channels),
  };
  sends = [s, ...sends];
  used.set(input.idempotencyKey, s.id);
  return view(s);
}

/** Hủy phần chưa gửi. Phần iHanoi đã tiếp nhận không thu hồi được. */
export async function cancelSend(id: string, reason: string, by: string) {
  await wait(450);
  const s = sends.find((x) => x.id === id)!;
  if (view(s).status !== 'SENDING') throw new ApiError('STATE_CHANGED', 'Lần gửi đã xong, không còn phần nào để hủy.');
  s.canceled = { by, at: NOW_LABEL, reason, atMs: Date.now() };
  return view(s);
}

export const channelName = (id: ChannelId) => channelOf(id).name;
export { TEAMS };
