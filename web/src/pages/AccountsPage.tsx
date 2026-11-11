import { ChoiceSelect, DialogFrame, Feedback, OptionGroup } from '@/components/Controls';
import { DataTable, type DataColumns } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { fetchAccounts, updateAccount, type AccountPatch, type AccountRow } from '../api/mockApi';
import { BlockEmpty, BlockError, Skel } from '../components/Blocks';
import { StatusPill } from '../components/Status';
import { UNITS } from '../data/mock';
import { TEAMS } from '../data/org';
import { ROLE_LABEL, teamName, usePermissions, useStaff } from '../demo/DemoContext';
import { num } from '../lib/format';
import { useBreakpoint } from '../lib/useMedia';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const Status = ({ active }: { active: boolean }) => <StatusPill tone={active ? 'success' : 'neutral'}>{active ? 'Hoạt động' : 'Tạm khóa'}</StatusPill>;

/* ---------- Đổi quyền một tài khoản ---------- */

/** Hệ quả thực tế của thay đổi, nói trước khi lưu. */
function impactLines(a: AccountRow, next: AccountPatch) {
  const lines: string[] = [];
  if (next.team !== a.team) {
    lines.push(
      a.taxpayers
        ? `${num(a.taxpayers)} NNT do ${a.name} phụ trách chuyển từ phạm vi ${teamName(a.team)} sang ${teamName(next.team)}.`
        : `${a.name} chuyển từ ${teamName(a.team)} sang ${teamName(next.team)}.`,
    );
  }
  if (next.role !== a.role) {
    lines.push(
      next.role === 'team'
        ? `Xem thống kê cả ${teamName(next.team)} và danh sách tài khoản của tổ.`
        : `Chỉ còn xem thống kê của NNT mình phụ trách; không còn màn Tài khoản.`,
    );
  }
  if (next.active !== a.active) {
    lines.push(
      next.active
        ? 'Đăng nhập lại được ngay.'
        : `Không đăng nhập được nữa.${a.taxpayers ? ` ${num(a.taxpayers)} NNT vẫn gán cho tài khoản này cho tới khi được giao lại.` : ''}`,
    );
  }
  return lines;
}

function EditAccount({ account, actorId, onClose }: { account: AccountRow; actorId: string; onClose: () => void }) {
  const bp = useBreakpoint();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<AccountPatch>({ role: account.role === 'team' ? 'team' : 'officer', team: account.team ?? TEAMS[0].id, active: account.active });
  const lines = impactLines(account, draft);
  // Mỗi tổ một lãnh đạo tổ: báo ngay khi chọn, không đợi tới lúc lưu.
  const lead = useStaff().find((s) => s.id !== account.id && s.active && s.role === 'team' && s.team === draft.team);
  const leadTaken = draft.role === 'team' && draft.active && !!lead;
  const m = useMutation({
    mutationFn: () => updateAccount(account.id, draft, actorId),
    onSuccess: () => {
      // Đổi tổ hoặc vai trò làm đổi phạm vi số liệu, nên tải lại mọi số liệu.
      qc.invalidateQueries();
      toast.success(`Đã cập nhật quyền của ${account.name}.`);
      onClose();
    },
  });

  const footer = (
    <div className="sheet__footer">
      <Button variant="outline" size={bp === 'mobile' ? 'lg' : undefined} onClick={onClose}>
        Quay lại
      </Button>
      <Button size={bp === 'mobile' ? 'lg' : undefined} disabled={!lines.length || leadTaken} loading={m.isPending} onClick={() => m.mutate()}>
        Lưu thay đổi
      </Button>
    </div>
  );

  return (
    <DialogFrame open title={`Quyền của ${account.name}`} onClose={onClose} footer={footer} width={560}>
      <div className="acct-form">
        <div className="field">
          <span className="field__label" aria-hidden="true">Vai trò</span>
          <OptionGroup
            aria-label="Vai trò"
            value={draft.role}
            block={bp === 'mobile'}
            onValueChange={(role) => setDraft({ ...draft, role })}
            options={[
              { value: 'officer', label: ROLE_LABEL.officer },
              { value: 'team', label: ROLE_LABEL.team },
            ]}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="acct-team">Tổ</label>
          <ChoiceSelect id="acct-team" value={draft.team} onValueChange={(team) => setDraft({ ...draft, team })} options={TEAMS.map((t) => ({ value: t.id, label: t.name }))} style={{ width: '100%' }} />
        </div>
        <div className="switch-row">
          <label className="switch-row__label" htmlFor="acct-active">Cho phép đăng nhập</label>
          <Switch id="acct-active" checked={draft.active} onCheckedChange={(active) => setDraft({ ...draft, active })} />
          <p className="switch-row__desc">Tắt để tạm khóa tài khoản; lịch sử thao tác được giữ nguyên.</p>
        </div>
        {leadTaken ? (
          <Feedback severity="warning" title={`${teamName(draft.team)} đã có lãnh đạo tổ là ${lead!.name}.`} description={`Chuyển ${lead!.name} về Cán bộ trước, hoặc chọn tổ khác.`} />
        ) : lines.length > 0 ? (
          <Feedback
            severity={draft.active ? 'info' : 'warning'}
            title="Sau khi lưu"
            description={
              <ul className="acct-impact">
                {lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            }
          />
        ) : (
          <p className="chart-note">Chưa có thay đổi.</p>
        )}
        {m.error && <Feedback severity="warning" title={m.error.message} />}
      </div>
    </DialogFrame>
  );
}

/* ---------- Danh sách theo tổ ---------- */

function Group({ title, rows, canEdit, actorId, onEdit }: { title: string; rows: AccountRow[]; canEdit: boolean; actorId: string; onEdit: (a: AccountRow) => void }) {
  const bp = useBreakpoint();
  const total = rows.reduce((s, r) => s + r.taxpayers, 0);
  const editable = (a: AccountRow) => canEdit && a.role !== 'base' && a.id !== actorId;
  const edit = (a: AccountRow) =>
    editable(a) ? (
      <Button variant="outline" size="sm" onClick={() => onEdit(a)} aria-label={`Sửa quyền của ${a.name}`}>
        Sửa quyền
      </Button>
    ) : null;

  const cols: DataColumns<AccountRow> = [
    {
      title: 'Cán bộ',
      key: 'n',
      render: (_, a) => (
        <span className="cell-tp">
          <span className="cell-tp__name">
            {a.name}
            {a.id === actorId && <span className="acct-me"> (bạn)</span>}
          </span>
          <span className="cell-tp__mst">{a.username}</span>
        </span>
      ),
    },
    { title: 'Vai trò', key: 'r', width: 170, render: (_, a) => ROLE_LABEL[a.role] },
    { title: 'NNT phụ trách', key: 't', width: 140, align: 'right', render: (_, a) => <span className="num">{a.taxpayers ? num(a.taxpayers) : '—'}</span> },
    { title: 'Trạng thái', key: 's', width: 140, render: (_, a) => <Status active={a.active} /> },
    ...(canEdit ? [{ title: <span className="sr-only">Thao tác</span>, key: 'a', width: 130, align: 'right' as const, render: (_: unknown, a: AccountRow) => edit(a) }] : []),
  ];

  return (
    <section className="acct-group" aria-label={title}>
      <header className="acct-group__head">
        <h2 className="acct-group__title">{title}</h2>
        <span className="acct-group__meta num">
          {rows.length} tài khoản{total ? ` · ${num(total)} NNT` : ''}
        </span>
      </header>
      {bp === 'mobile' ? (
        <div className="m-list">
          {rows.map((a) => (
            <article key={a.id} className={editable(a) ? 'm-card m-card--link' : 'm-card'}>
              <div className="m-card__top">
                <span className="cell-tp">
                  {editable(a) ? (
                    <button type="button" className="m-card__link cell-tp__name" aria-label={`Sửa quyền ${a.name}`} onClick={() => onEdit(a)}>
                      {a.name}
                    </button>
                  ) : (
                    <span className="cell-tp__name">
                      {a.name}
                      {a.id === actorId && <span className="acct-me"> (bạn)</span>}
                    </span>
                  )}
                  <span className="cell-tp__mst">
                    {ROLE_LABEL[a.role]}
                    {a.taxpayers ? ` · ${num(a.taxpayers)} NNT` : ''}
                  </span>
                </span>
                <Status active={a.active} />
                {editable(a) && <ChevronRight className="m-card__chev" aria-hidden="true" />}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <DataTable<AccountRow> rowKey="id" columns={cols} dataSource={rows} />
      )}
    </section>
  );
}

export default function AccountsPage() {
  const { role, user, canViewAccounts, canEditAccounts } = usePermissions();
  const team = role === 'team' ? user.team : null;
  const q = useQuery({ queryKey: ['accounts', team], queryFn: () => fetchAccounts(team), enabled: canViewAccounts });
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<AccountRow | null>(null);

  if (!canViewAccounts) {
    return <BlockEmpty>Màn Tài khoản chỉ dành cho lãnh đạo cơ sở và lãnh đạo tổ.</BlockEmpty>;
  }

  const rows = (q.data ?? []).filter((a) => !query || norm(a.name).includes(norm(query)) || a.username.includes(norm(query)));
  // Nhóm theo tổ: lãnh đạo cơ sở trước, sau đó từng tổ; trong tổ, lãnh đạo tổ đứng đầu.
  const groups = [
    ...(role === 'base' ? [{ id: 'base', title: 'Lãnh đạo cơ sở', rows: rows.filter((a) => a.role === 'base') }] : []),
    ...TEAMS.filter((t) => role === 'base' || t.id === team).map((t) => ({
      id: t.id,
      title: t.name,
      rows: rows.filter((a) => a.team === t.id && a.role !== 'base').sort((a, b) => Number(b.role === 'team') - Number(a.role === 'team') || Number(b.active) - Number(a.active)),
    })),
  ].filter((g) => g.rows.length);

  return (
    <div className="acct-page">
      <header className="page-head">
        <div>
          <h1 className="sr-only">Tài khoản</h1>
          <p className="page-head__sub page-head__meta page-meta">
            <span>{role === 'base' ? UNITS[0].name : `${teamName(team)}, ${UNITS[0].name}`}</span>
            {q.data ? <span className="num">{q.data.length} tài khoản</span> : <Skel w={90} h={14} />}
            {!canEditAccounts && <StatusPill tone="neutral">Chỉ xem</StatusPill>}
          </p>
        </div>
        <label className="acct-search">
          <Search className="size-4" aria-hidden="true" />
          <Input type="search" aria-label="Tìm theo tên hoặc tên đăng nhập" placeholder="Tìm theo tên hoặc tên đăng nhập" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </header>

      {q.isError ? (
        <BlockError message="Không tải được danh sách tài khoản." onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <div className="acct-group">
          {[0, 1, 2].map((i) => (
            <Skel key={i} w="100%" h={44} style={{ marginTop: 8 }} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <BlockEmpty
          action={
            <Button variant="outline" onClick={() => setQuery('')}>
              Xóa tìm kiếm
            </Button>
          }
        >
          Không có tài khoản khớp “{query}”.
        </BlockEmpty>
      ) : (
        groups.map((g) => <Group key={g.id} title={g.title} rows={g.rows} canEdit={canEditAccounts} actorId={user.id} onEdit={setEditing} />)
      )}

      {editing && <EditAccount account={editing} actorId={user.id} onClose={() => setEditing(null)} />}
    </div>
  );
}
