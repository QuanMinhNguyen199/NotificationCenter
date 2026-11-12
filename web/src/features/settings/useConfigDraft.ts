import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { fetchConfig } from '@/shared/api/mockApi';
import { diffConfig, type ConfigValues, type FieldKey } from '@/shared/data/config';
import { toMinutes } from '@/shared/lib/format';

export type Errors = Partial<Record<FieldKey, string>>;

const isInt = (v: unknown) => typeof v === 'number' && Number.isInteger(v);

export function validate(v: ConfigValues): Errors {
  const e: Errors = {};
  if (toMinutes(v.sendEnd) <= toMinutes(v.sendStart)) e.sendEnd = 'Giờ kết thúc phải sau giờ bắt đầu gửi.';
  if (toMinutes(v.catchupTime) <= toMinutes(v.scanTime)) e.catchupTime = 'Quét bù phải sau giờ rà soát chính.';
  else if (toMinutes(v.catchupTime) >= toMinutes(v.sendEnd)) e.catchupTime = 'Quét bù phải trước khi hết khung gửi.';
  const int = (k: FieldKey, min: number, msg: string, max?: number) => {
    const x = v[k] as number;
    if (!isInt(x)) e[k] = 'Nhập số nguyên.';
    else if (x < min || (max != null && x > max)) e[k] = msg;
  };
  int('growthFactor', 1, 'Hệ số tăng tối thiểu là 1.');
  int('historyRuns', 1, 'Cần ít nhất 1 đợt để so sánh.');
  int('minRuns', 1, 'Số đợt tối thiểu phải từ 1 tới số đợt lịch sử.', v.historyRuns);
  int('daysBefore', 0, 'Số ngày nhắc trước hạn không được âm.');
  int('nearThresholdPct', 1, 'Nhập tỷ lệ lớn hơn 0 và nhỏ hơn 100.', 99);
  int('forecastMarginPct', 0, 'Biên dự báo trong khoảng 0–100%.', 100);
  int('forecastMinDays', 1, 'Tối thiểu 1 ngày.');
  int('confirmGapDays', 0, 'Khoảng cách xác nhận không được âm.');
  int('confirmCount', 1, 'Cần ít nhất 1 lần xác nhận.');
  int('upsellCycleDays', 1, 'Chu kỳ gửi lại phải lớn hơn 0.');
  return e;
}

/** Bản nháp cấu hình: giữ trong phiên, không mất khi đóng accordion, đổi kích thước hay mở xem trước. */
export function useConfigDraft() {
  const q = useQuery({ queryKey: ['config'], queryFn: () => fetchConfig(), staleTime: Infinity });
  const latest = q.data?.history[0];
  const applied = q.data?.current;
  const [draft, setDraft] = useState<ConfigValues | null>(null);
  const [baseVersion, setBaseVersion] = useState<number | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // Khởi tạo bản nháp khi tải lần đầu (cập nhật ngay trong lúc render); sau đó không tự ghi đè khi dữ liệu nền đổi.
  if (latest && baseVersion == null) {
    setDraft(latest.values);
    setBaseVersion(latest.version);
  }

  const base = useMemo(() => q.data?.history.find((h) => h.version === baseVersion), [q.data, baseVersion]);
  const dirtyKeys = useMemo(() => (draft && base ? diffConfig(base.values, draft) : []), [draft, base]);
  const errors = useMemo(() => (draft ? validate(draft) : {}), [draft]);

  const update = useCallback(<K extends FieldKey>(k: K, v: ConfigValues[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d)), []);
  const discard = useCallback(() => {
    if (base) setDraft(base.values);
    setShowErrors(false);
  }, [base]);
  /** Sau xung đột: lấy phiên bản mới làm nền, giữ những trường người dùng đã sửa. */
  const rebase = useCallback(() => {
    if (!latest || !draft || !base) return;
    const mine = Object.fromEntries(dirtyKeys.map((k) => [k, draft[k]]));
    setDraft({ ...latest.values, ...mine });
    setBaseVersion(latest.version);
  }, [latest, draft, base, dirtyKeys]);
  const commit = useCallback((version: number, values: ConfigValues) => {
    setBaseVersion(version);
    setDraft(values);
    setShowErrors(false);
  }, []);

  return { q, latest, applied, base, draft, update, dirtyKeys, errors, showErrors, setShowErrors, discard, rebase, commit };
}

export type DraftApi = ReturnType<typeof useConfigDraft>;
