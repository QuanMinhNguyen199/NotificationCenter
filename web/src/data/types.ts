export type GroupCode = 'D1a' | 'D1b' | 'D1c' | 'D3' | 'D4' | 'D5' | 'D6';
export type SendStatus = 'SENT' | 'PENDING' | 'FAILED' | 'UNKNOWN' | 'EXPIRED' | 'SKIPPED';
export type DeliveryStatus = 'DELIVERED' | 'ACCEPTED' | 'DELIVERY_FAILED' | 'NO_FINAL' | 'NA';
export type RunStatus = 'PLANNED' | 'HOLD' | 'APPROVED' | 'SENDING' | 'PAUSED' | 'DONE' | 'CANCELLED';
export type Priority = 'OVERDUE' | 'DUE_SOON' | 'IN_TERM';
export type ObligationKind = 'file' | 'pay';
/** Ba cấp tài khoản: lãnh đạo Thuế cơ sở, lãnh đạo tổ, cán bộ quản lý HKD. */
export type Role = 'base' | 'team' | 'officer';

export interface Taxpayer {
  id: number;
  name: string;
  mst: string;
  hkdStatus: 'Đang hoạt động' | 'Tạm ngừng kinh doanh';
  /** Số hồ sơ khai còn thiếu (0 nếu không có nghĩa vụ khai). */
  fileCount: number;
  filePriority?: Priority;
  /** Số khoản còn phải nộp. */
  payCount: number;
  payPriority?: Priority;
  updatedAt: string;
}

export interface Notification {
  id: string;
  createdAt: string;
  taxpayerId: number;
  groups: GroupCode[];
  title: string;
  send: SendStatus;
  delivery: DeliveryStatus;
  runId: string;
  /** Thời điểm có kết quả gửi (không có khi còn chờ). */
  processedAt?: string;
  /** Thời điểm iHanoi xác nhận đã giao. */
  deliveredAt?: string;
}

export interface SendRun {
  id: string;
  date: string;
  unit: string;
  window: string;
  total: number;
  taxpayers: number;
  sent: number;
  pending: number;
  failed: number;
  unknown: number;
  expired: number;
  skipped: number;
  status: RunStatus;
  configVersion: number;
  holdReason?: string;
  approvedBy?: string;
  timeline: { at: string; text: string; by?: string }[];
}

export interface Unit {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
}

export interface Staff {
  id: string;
  name: string;
  /** Tên đăng nhập minh họa. */
  username: string;
  role: Role;
  /** Tổ trực thuộc; lãnh đạo cơ sở không thuộc tổ nào. */
  team: string | null;
  active: boolean;
}
