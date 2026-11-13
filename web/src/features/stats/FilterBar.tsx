import { IconButton } from '@/shared/components/IconButton';
import { GroupedSelect, OptionGroup, BottomSheet, DateRangeField } from '@/shared/components/Controls';
import { Button } from '@/shared/ui/button';
import { X, ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { useEffect, useState, type ReactNode } from 'react';

import { usePermissions } from '@/shared/demo/useDemo';
import { dm, dmy } from '@/shared/lib/format';
import { useBreakpoint } from '@/shared/lib/useMedia';
import { useHideNavWhile } from '@/shared/lib/overlay';
import type { GroupCode } from '@/shared/data/types';
import { GROUP_LABEL } from '@/shared/lib/status';
import { FEATURES } from '@/shared/lib/features';
import { TODAY, type StatsParams } from './useStatsParams';

type Preset = 'today' | '7' | '30' | 'custom';
// Lùi n ngày trên chuỗi ISO, tính theo UTC để không lệch múi giờ.
const minusDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) - n * 864e5).toISOString().slice(0, 10);
const presetRange = (p: Exclude<Preset, 'custom'>) => ({ from: p === 'today' ? TODAY : minusDays(TODAY, p === '7' ? 6 : 29), to: TODAY });
function presetOf(from: string, to: string): Preset {
  for (const p of ['today', '7', '30'] as const) {
    const r = presetRange(p);
    if (r.from === from && r.to === to) return p;
  }
  return 'custom';
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7', label: '7 ngày' },
  { value: '30', label: '30 ngày' },
  { value: 'custom', label: 'Tùy chọn' },
];

// Menu cây cho bộ lọc Nhóm. D2 là cấu hình chung, không phải loại thông báo để đếm.
// Nhóm cha "Nhắc nghĩa vụ thuế" (D1) chọn được để lọc cả khai và nộp.
const GROUP_TREE: { label: string; items: { value: string; label: string; child?: boolean }[] }[] = [
  { label: 'Nhắc nghĩa vụ', items: [{ value: 'D1', label: GROUP_LABEL.D1 }, { value: 'D1a', label: GROUP_LABEL.D1a, child: true }, { value: 'D1b', label: GROUP_LABEL.D1b, child: true }] },
  { label: 'Cảnh báo', items: [{ value: 'D4', label: GROUP_LABEL.D4 }] },
  { label: 'Khác', items: ((FEATURES.routing ? ['D1c', 'D3', 'D5', 'D6'] : ['D1c', 'D5', 'D6']) as GroupCode[]).map((g) => ({ value: g, label: GROUP_LABEL[g] })) },
];
const groupLabel = (v: string) => (v === 'all' ? 'Tất cả nhóm' : GROUP_LABEL[v] ?? v);

interface Draft {
  unit: string;
  from: string;
  to: string;
  group: string;
}

function useDraft(p: StatsParams) {
  const [draft, setDraft] = useState<Draft>({ unit: p.unit, from: p.from, to: p.to, group: p.group });
  const [preset, setPreset] = useState<Preset>(presetOf(p.from, p.to));
  // Bộ lọc đã áp dụng đổi (vd. bấm link, quay lại): đặt lại nháp theo giá trị mới ngay trong lúc render.
  const applied = `${p.unit}|${p.from}|${p.to}|${p.group}`;
  const [prevApplied, setPrevApplied] = useState(applied);
  if (applied !== prevApplied) {
    setPrevApplied(applied);
    setDraft({ unit: p.unit, from: p.from, to: p.to, group: p.group });
    setPreset(presetOf(p.from, p.to));
  }
  return { draft, setDraft, preset, setPreset };
}

function Fields({ draft, setDraft, preset, setPreset, stacked }: ReturnType<typeof useDraft> & { stacked?: boolean }) {
  const { fixedScope, scopes, scopeLabel } = usePermissions();
  const pickPreset = (next: Preset) => {
    setPreset(next);
    if (next !== 'custom') setDraft({ ...draft, ...presetRange(next) });
  };

  // Cán bộ: phạm vi cố định, hiện dạng chữ ở đầu thanh lọc (trong bottom sheet mobile thì bỏ vì không chọn được).
  const unit = fixedScope ? (
    stacked ? null : <span className="scope-text"><span className="scope-text__label">Phạm vi:</span>{scopeLabel(fixedScope)}</span>
  ) : (
    <GroupedSelect aria-label="Phạm vi" prefix={stacked ? undefined : 'Phạm vi:'} value={draft.unit} groups={scopes} onValueChange={(u) => setDraft({ ...draft, unit: u })} className={stacked ? 'choice-select--min168 choice-select--full' : 'choice-select--min168'} />
  );

  const period = (
    <div className="filters__period">
      <OptionGroup aria-label="Khoảng ngày thông báo" value={preset} options={PRESETS} block={stacked} onValueChange={(v) => pickPreset(v as Preset)} />
      {preset === 'custom' ? (
        <DateRangeField from={draft.from} to={draft.to} latest={TODAY} onValueChange={(from, to) => setDraft({ ...draft, from, to })} />
      ) : stacked ? (
        <span className="filters__range num">
          {dm(draft.from)}–{dmy(draft.to)}
        </span>
      ) : null}
    </div>
  );

  const groups = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={`group-trigger${stacked ? ' group-trigger--block' : ''}`} aria-label={`Nhóm thông báo: ${groupLabel(draft.group)}`}>
          {!stacked && <span className="group-trigger__prefix">Nhóm:</span>}
          <span className="group-trigger__value">{groupLabel(draft.group)}</span>
          <ChevronDown className="size-4 opacity-60" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="group-menu min-w-60">
        <DropdownMenuRadioGroup value={draft.group} onValueChange={(group) => setDraft({ ...draft, group })}>
          <DropdownMenuRadioItem value="all">Tất cả nhóm</DropdownMenuRadioItem>
          {GROUP_TREE.map((sec) => (
            <div key={sec.label} role="group" aria-label={sec.label}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="group-menu__label">{sec.label}</DropdownMenuLabel>
              {sec.items.map((it) => (
                <DropdownMenuRadioItem key={it.value} value={it.value} className={it.child ? 'group-menu__child' : undefined}>
                  {it.label}
                </DropdownMenuRadioItem>
              ))}
            </div>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (stacked) {
    return (
      <>
        {unit && (
          <div className="filters__field">
            <span className="filters__label">Phạm vi</span>
            {unit}
          </div>
        )}
        <div className="filters__field">
          <span className="filters__label">Khoảng ngày thông báo</span>
          {period}
        </div>
        <div className="filters__field">
          <span className="filters__label">Nhóm thông báo</span>
          {groups}
        </div>
      </>
    );
  }
  return (
    <>
      {unit}
      {period}
      {groups}
    </>
  );
}

const DEFAULTS = { ...presetRange('7'), group: 'all' };

export function FilterBar({ p, apply, stamp }: { p: StatsParams; apply: (d: Draft) => void; stamp?: ReactNode }) {
  const bp = useBreakpoint();
  const state = useDraft(p);
  const [sheet, setSheet] = useState(false);
  const { fixedScope: fixedUnit, defaultScope: defaultUnit, scopeLabel } = usePermissions();
  useHideNavWhile(sheet);
  const changed = state.draft.unit !== p.unit || state.draft.from !== p.from || state.draft.to !== p.to || state.draft.group !== p.group;
  const isDefault = p.unit === defaultUnit && p.from === DEFAULTS.from && p.to === DEFAULTS.to && p.group === 'all';

  // Desktop/tablet: chọn xong là áp dụng ngay (chỉ khi giá trị đã hoàn chỉnh — không gọi API khi đang gõ).
  useEffect(() => {
    if (bp !== 'mobile' && changed) apply(state.draft);
  }, [state.draft]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    const d = { ...DEFAULTS, unit: defaultUnit };
    state.setDraft(d);
    state.setPreset('7');
    return d;
  };

  if (bp !== 'mobile') {
    return (
      <div className="filters-dock" role="search" aria-label="Bộ lọc thống kê">
        <div className="filters">
          <Fields {...state} />
          {!isDefault && (
            <IconButton variant="ghost" icon={RotateCcw} className="filters__reset" onClick={() => apply(reset())} label="Đặt lại bộ lọc thống kê" />
          )}
          {stamp && <div className="filters__stamp">{stamp}</div>}
        </div>
      </div>
    );
  }

  // Mobile: thẻ khoảng ngày + nút Bộ lọc (n); điều kiện đang áp dụng hiện bằng chip.
  const unitName = scopeLabel(p.unit);
  const isDefaultRange = p.from === DEFAULTS.from && p.to === DEFAULTS.to;
  const n = (p.unit !== defaultUnit && !fixedUnit ? 1 : 0) + (isDefaultRange ? 0 : 1) + (p.group !== 'all' ? 1 : 0);

  return (
    <>
      <div className="m-filter">
        <div className="m-filter__range">
          <span className="m-filter__unit">{unitName}</span>
          <b className="num">
            {dm(p.from)}–{dmy(p.to)}
          </b>
        </div>
        {stamp}
        <IconButton icon={SlidersHorizontal} label={n ? `Mở bộ lọc, ${n} điều kiện đang áp dụng` : 'Mở bộ lọc'} badge={n} onClick={() => setSheet(true)} aria-haspopup="dialog" aria-expanded={sheet} />
      </div>
      <div className="chips m-filter-chips">
        {!fixedUnit && p.unit !== defaultUnit && (
          <span className="chip">
            {unitName}
            <button type="button" aria-label={`Bỏ điều kiện ${unitName}`} onClick={() => apply({ ...p, unit: defaultUnit })}>
              <X />
            </button>
          </span>
        )}
        {!isDefaultRange && (
          <span className="chip">
            {dm(p.from)}–{dm(p.to)}
            <button type="button" aria-label="Bỏ khoảng ngày, về 7 ngày" onClick={() => apply({ ...p, from: DEFAULTS.from, to: DEFAULTS.to })}>
              <X />
            </button>
          </span>
        )}
        {p.group !== 'all' && (
          <span className="chip">
            {GROUP_LABEL[p.group]}
            <button type="button" aria-label={`Bỏ nhóm ${p.group}`} onClick={() => apply({ ...p, group: 'all' })}>
              <X />
            </button>
          </span>
        )}
      </div>
      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Bộ lọc"
        footer={
          <div className="sheet__footer">
            <Button variant="outline" size="lg" onClick={reset}>
              Đặt lại
            </Button>
            <Button
              size="lg"
              variant="default"
              onClick={() => {
                apply(state.draft);
                setSheet(false);
              }}
            >
              Áp dụng
            </Button>
          </div>
        }
      >
        <div className="sheet__fields">
          <Fields {...state} stacked />
        </div>
      </BottomSheet>
    </>
  );
}
