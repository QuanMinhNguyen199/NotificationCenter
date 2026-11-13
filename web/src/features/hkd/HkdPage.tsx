import { MobileDisclosure } from '@/shared/components/MobileDisclosure';
import { ChoiceSelect, GroupedSelect, ViewTabs } from '@/shared/components/Controls';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Dimension } from './hkdApi';
import { usePermissions } from '@/shared/demo/useDemo';
import { fetchObligations } from '@/shared/api/mockApi';
import { ObligationChart } from '@/features/stats/ObligationChart';
import { TaxpayersPane } from '@/features/records/TaxpayersPane';
import { DetailOverlay } from '@/features/records/Details';
import { filterOf, useStatsParams } from '@/features/stats/useStatsParams';
import { useRoute } from '@/shared/lib/router';
import { useBreakpoint } from '@/shared/lib/useMedia';
import { AiQaTab } from './AiQaTab';
import { FEATURES } from '@/shared/lib/features';
import { DailyTab } from './DailyTab';
import { StructureTab } from './StructureTab';
import { DebtTab } from './DebtTab';
import { SupportTab } from './SupportTab';
import { RemindersTab } from './RemindersTab';

function ObligationsList() {
  const { p, set, openDetail, closeDetail } = useStatsParams();
  const ob = useQuery({ queryKey: ['obligations', p.unit], queryFn: () => fetchObligations(filterOf(p)), placeholderData: keepPreviousData });
  return <>
    <MobileDisclosure label="Tổng quan nghĩa vụ"><ObligationChart groupNote={p.group !== 'all'} data={ob.data} error={ob.error} loading={ob.isLoading} onRetry={() => ob.refetch()} onPick={(kind, prio) => set({ kind, prio, notified: false, page: 1 })} /></MobileDisclosure>
    <TaxpayersPane p={p} set={set} open={openDetail} reset={() => set({ tq: null, notified: null, kind: null, prio: null, group: null, page: 1 })} />
    <DetailOverlay detail={p.detail} filter={filterOf(p)} onClose={closeDetail} />
  </>;
}

/* ---------- Màn chính ---------- */

const TABS = [
  { key: 'chi-tieu', label: 'Chỉ tiêu hằng ngày' },
  { key: 'co-cau', label: 'Cơ cấu và tuân thủ' },
  { key: 'no-thue', label: 'Nợ thuế' },
  ...(FEATURES.hkdSupport ? [{ key: 'ho-tro', label: 'Hỗ trợ HKD' }] : []),
  { key: 'nhac-viec', label: 'Hiệu quả nhắc việc' },
  { key: 'danh-sach', label: 'Danh sách nghĩa vụ' },
  ...(FEATURES.aiQa ? [{ key: 'hoi-dap-ai', label: 'Hỏi đáp AI' }] : []),
];

export default function HkdPage() {
  const mobile = useBreakpoint() === 'mobile';
  const { params, navigate } = useRoute();
  const { scopes, fixedScope, allowedScopes, defaultScope, scopeLabel } = usePermissions();
  const asked = params.get('unit');
  // Phạm vi trên URL chỉ được nhận khi nằm trong quyền, giống màn Thống kê.
  const scope = fixedScope ?? (asked && allowedScopes.includes(asked) ? asked : defaultScope);
  const tab = TABS.some((t) => t.key === params.get('muc')) ? params.get('muc')! : TABS[0].key;
  const dim = (['ward', 'band', 'industry'] as Dimension[]).find((x) => x === params.get('chieu')) ?? 'ward';
  const set = (patch: Record<string, string>) => navigate('/quan-ly-hkd', { unit: scope === defaultScope ? undefined : scope, muc: tab === TABS[0].key ? undefined : tab, chieu: dim === 'ward' ? undefined : dim, ...patch }, true);

  const content = (key: string) =>
    key === 'danh-sach' ? <ObligationsList /> : key === 'hoi-dap-ai' ? <AiQaTab scope={scope} /> : key === 'chi-tieu' ? <DailyTab scope={scope} />
      : key === 'co-cau' ? <StructureTab scope={scope} dim={dim} setDim={(v) => set({ chieu: v === 'ward' ? '' : v })} />
        : key === 'no-thue' ? <DebtTab scope={scope} scopeName={scopeLabel(scope)} />
          : key === 'nhac-viec' ? <RemindersTab scope={scope} />
            : <SupportTab scope={scope} />;

  const body = (key: string) => content(key);

  const scopeControl = fixedScope ? (
    <span className="scope-text"><span className="scope-text__label">Phạm vi:</span>{scopeLabel(fixedScope)}</span>
  ) : (
    <GroupedSelect aria-label="Phạm vi" prefix="Phạm vi:" value={scope} groups={scopes} onValueChange={(u) => set({ unit: u === defaultScope ? '' : u })} className="choice-select--min200" />
  );

  return (
    <div className="hkd-page">
      <h1 className="sr-only">Quản lý hộ kinh doanh</h1>
      {mobile ? <>
        <div className="hkd-filter">{scopeControl}</div>
        <ChoiceSelect aria-label="Nội dung quản lý HKD" value={tab} options={TABS.map((t) => ({ value: t.key, label: t.label }))} onValueChange={(muc) => set({ muc })} className="choice-select--full hkd-tab-select" />
        {body(tab)}
      </> : <ViewTabs
        value={tab}
        onValueChange={(k) => set({ muc: k === TABS[0].key ? '' : k })}
        // Cả 7 tab đều lọc theo phạm vi nên phạm vi đứng cùng hàng tab, sát phải.
        extra={scopeControl}
        items={TABS.map((t) => ({ key: t.key, label: t.label, children: tab === t.key ? body(t.key) : null }))}
      />}
    </div>
  );
}
