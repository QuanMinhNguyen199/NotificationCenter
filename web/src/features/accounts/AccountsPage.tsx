import { ChoiceSelect, Feedback } from '@/shared/components/Controls';
import { DataTable, type DataColumns } from '@/shared/components/DataTable';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Switch } from '@/shared/ui/switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fetchAccounts, updateAccount, type AccountPatch, type AccountRow } from '@/shared/api/mockApi';
import { BlockEmpty, BlockError, Skel } from '@/shared/components/Blocks';
import { StatusPill } from '@/shared/components/Status';
import { UNITS } from '@/shared/data/mock';
import { TEAMS } from '@/shared/data/org';
import { ROLE_LABEL, teamName, usePermissions, useStaff } from '@/shared/demo/useDemo';
import { num } from '@/shared/lib/format';
import { useBreakpoint } from '@/shared/lib/useMedia';
import { useGuard } from '@/shared/lib/guardContext';
import { useRoute } from '@/shared/lib/router';

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

/** Vai trò được gán ở màn này và việc mỗi vai trò thấy được, nói bằng hệ quả chứ không bằng tên quyền. */
const ROLE_OPTIONS: { value: AccountPatch['role']; desc: string }[] = [
  { value: 'officer', desc: 'Xem thống kê và thông báo của NNT mình phụ trách.' },
  { value: 'team', desc: 'Xem thống kê cả tổ và danh sách tài khoản của tổ. Mỗi tổ một lãnh đạo tổ.' },
];

/**
 * Trang sửa quyền một tài khoản (#/tai-khoan?sua=<id>). Trang riêng thay cho hộp thoại để chạy ổn khi nhúng trong iframe.
 * Bố cục như màn Tạo lần gửi: bên trái ba mục cần chọn, bên phải khối "Thay đổi" so sánh trước/sau, hệ quả và nút lưu.
 */
function EditAccount({ account, actorId, onBack }: { account: AccountRow; actorId: string; onBack: () => void }) {
  const bp = useBreakpoint();
  const qc = useQueryClient();
  const { setGuard, confirmLeave } = useGuard();
  const initial: AccountPatch = { role: account.role === 'team' ? 'team' : 'officer', team: account.team ?? TEAMS[0].id, active: account.active };
  const [draft, setDraft] = useState<AccountPatch>(initial);
  const lines = impactLines(account, draft);
  const dirty = lines.length > 0;
  // Mỗi tổ một lãnh đạo tổ: báo ngay khi chọn, không đợi tới lúc lưu.
  const lead = useStaff().find((s) => s.id !== account.id && s.active && s.role === 'team' && s.team === draft.team);
  const leadTaken = draft.role === 'team' && draft.active && !!lead;
  const m = useMutation({
    mutationFn: () => updateAccount(account.id, draft, actorId),
    onSuccess: () => {
      // Đổi tổ hoặc vai trò làm đổi phạm vi số liệu, nên tải lại mọi số liệu.
      qc.invalidateQueries();
      toast.success(`Đã cập nhật quyền của ${account.name}.`);
      setGuard(null);
      onBack();
    },
  });

  // Rời trang khi còn thay đổi chưa lưu thì hỏi lại (dùng chung cơ chế với màn Tạo lần gửi).
  useEffect(() => {
    setGuard({ dirty: dirty && !m.isSuccess, discard: () => {} });
    return () => setGuard(null);
  }, [dirty, m.isSuccess, setGuard]);

  const leave = () => confirmLeave(onBack);
  const size = bp === 'mobile' ? 'lg' : undefined;

  // Chỉ liệt kê mục đổi; mục giữ nguyên không cần nhắc lại.
  const diff = [
    draft.role !== initial.role && { k: 'Vai trò', from: ROLE_LABEL[initial.role], to: ROLE_LABEL[draft.role] },
    draft.team !== initial.team && { k: 'Tổ', from: teamName(initial.team), to: teamName(draft.team) },
    draft.active !== initial.active && { k: 'Đăng nhập', from: initial.active ? 'Cho phép' : 'Tạm khóa', to: draft.active ? 'Cho phép' : 'Tạm khóa' },
  ].filter(Boolean) as { k: string; from: string; to: string }[];

  return (
    <div className="acct-edit">
      <header className="sub-head">
        <Button variant="outline" size="icon" onClick={leave} aria-label="Quay lại danh sách tài khoản" title="Quay lại danh sách tài khoản">
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div className="acct-edit__head">
          <h1 className="sub-head__title">{account.name}</h1>
          <p className="page-head__sub page-meta">
            <span>{account.username}</span>
            <span>
              {ROLE_LABEL[account.role]}, {teamName(account.team)}
            </span>
            {account.taxpayers > 0 && <span className="num">{num(account.taxpayers)} NNT phụ trách</span>}
            <Status active={account.active} />
          </p>
        </div>
      </header>

      <form
        className="compose acct-edit__body"
        aria-label={`Sửa quyền của ${account.name}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty && !leadTaken && !m.isPending) m.mutate();
        }}
      >
        <div className="compose__form">
          <section className="set-row__panel" aria-labelledby="acct-role-h">
            <div className="acct-sec__head">
              <h2 className="set-row__title" id="acct-role-h">Vai trò</h2>
              <p className="set-row__desc">Quyết định {account.name} xem được số liệu của ai.</p>
            </div>
            <RadioGroup className="acct-roles" aria-labelledby="acct-role-h" value={draft.role} onValueChange={(v) => setDraft({ ...draft, role: v as AccountPatch['role'] })}>
              {ROLE_OPTIONS.map((o) => (
                <label key={o.value} className="acct-role" htmlFor={`acct-role-${o.value}`}>
                  <RadioGroupItem value={o.value} id={`acct-role-${o.value}`} className="acct-role__radio" />
                  <span className="acct-role__text">
                    <span className="acct-role__title">
                      {ROLE_LABEL[o.value]}
                      {o.value === initial.role && <span className="acct-role__now">Hiện tại</span>}
                    </span>
                    <span className="acct-role__desc">{o.desc}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </section>

          <section className="set-row__panel" aria-labelledby="acct-team-h">
            <div className="acct-sec__head">
              <h2 className="set-row__title" id="acct-team-h">Tổ</h2>
              <p className="set-row__desc">NNT do {account.name} phụ trách đi theo tổ được chọn.</p>
            </div>
            <div className="field acct-team">
              <label className="sr-only" htmlFor="acct-team">Tổ</label>
              <ChoiceSelect id="acct-team" value={draft.team} onValueChange={(team) => setDraft({ ...draft, team })} options={TEAMS.map((t) => ({ value: t.id, label: t.name }))} className="choice-select--full" />
              <p className="field__help">{lead ? `Lãnh đạo tổ: ${lead.name}` : 'Tổ chưa có lãnh đạo tổ.'}</p>
            </div>
            {leadTaken && (
              <Feedback severity="warning" title={`${teamName(draft.team)} đã có lãnh đạo tổ là ${lead!.name}.`} description={`Chuyển ${lead!.name} về Cán bộ trước, hoặc chọn tổ khác.`} />
            )}
          </section>

          <section className="set-row__panel" aria-labelledby="acct-active-h">
            <h2 className="sr-only" id="acct-active-h">Đăng nhập</h2>
            <div className="switch-row">
              <label className="switch-row__label set-row__title" htmlFor="acct-active">Cho phép đăng nhập</label>
              <Switch id="acct-active" checked={draft.active} onCheckedChange={(active) => setDraft({ ...draft, active })} />
              <p className="switch-row__desc">Tắt để tạm khóa tài khoản. Lịch sử thao tác và NNT đang giao được giữ nguyên.</p>
            </div>
          </section>
        </div>

        <aside className="compose__preview acct-summary" aria-labelledby="acct-sum-h">
          <section className="set-row__panel">
            <h2 className="set-row__title" id="acct-sum-h">Thay đổi</h2>
            <div aria-live="polite" className="acct-summary__live">
              {dirty ? (
                <>
                  <dl className="acct-diff">
                    {diff.map((d) => (
                      <div key={d.k} className="acct-diff__row">
                        <dt>{d.k}</dt>
                        <dd>
                          <span className="acct-diff__from">{d.from}</span>
                          <ArrowRight className="acct-diff__arrow" aria-label="thành" />
                          <span className="acct-diff__to">{d.to}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="acct-summary__impact">
                    <h3 className="acct-summary__sub">Sau khi lưu</h3>
                    <ul className="acct-impact">
                      {lines.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <p className="chart-note">Chưa có thay đổi. Chọn vai trò, tổ hoặc trạng thái đăng nhập để xem hệ quả trước khi lưu.</p>
              )}
            </div>
            {m.error && <Feedback severity="warning" title={m.error.message} />}
            <div className="acct-edit__actions">
              <Button type="submit" size={size} disabled={!dirty || leadTaken} loading={m.isPending}>
                Lưu thay đổi
              </Button>
              <Button type="button" variant="outline" size={size} onClick={leave}>
                Hủy
              </Button>
            </div>
            {leadTaken && <p className="field__help">Chưa lưu được: {teamName(draft.team)} đã có lãnh đạo tổ.</p>}
          </section>
        </aside>
      </form>
    </div>
  );
}

/** Link sửa tới tài khoản không có hoặc không được sửa: nói rõ lý do, cho quay lại danh sách. */
function EditUnavailable({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="acct-edit">
      <header className="sub-head">
        <Button variant="outline" size="icon" onClick={onBack} aria-label="Quay lại danh sách tài khoản" title="Quay lại danh sách tài khoản">
          <ArrowLeft aria-hidden="true" />
        </Button>
        <h1 className="sub-head__title">Sửa quyền</h1>
      </header>
      <BlockEmpty
        action={
          <Button variant="outline" onClick={onBack}>
            Về danh sách tài khoản
          </Button>
        }
      >
        {message}
      </BlockEmpty>
    </div>
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
  const { params, navigate } = useRoute();
  const editId = params.get('sua');
  const toList = () => navigate('/tai-khoan');

  if (!canViewAccounts) {
    return <><h1 className="sr-only">Tài khoản</h1><BlockEmpty>Màn Tài khoản chỉ dành cho lãnh đạo cơ sở và lãnh đạo tổ.</BlockEmpty></>;
  }

  // Sửa quyền là một trang riêng có địa chỉ (#/tai-khoan?sua=<id>), không phải hộp thoại.
  if (editId) {
    if (q.isError) return <BlockError message="Không tải được tài khoản." onRetry={() => q.refetch()} />;
    if (!q.data) return <div className="acct-edit"><Skel w="100%" h={320} /></div>;
    const target = q.data.find((a) => a.id === editId);
    const why = !canEditAccounts
      ? 'Tài khoản của bạn chỉ được xem, không sửa quyền.'
      : !target
        ? 'Không tìm thấy tài khoản này trong phạm vi bạn quản lý.'
        : target.id === user.id
          ? 'Không tự đổi quyền của chính mình.'
          : target.role === 'base'
            ? 'Tài khoản lãnh đạo cơ sở do cấp trên cấp, không đổi ở đây.'
            : '';
    if (why || !target) return <EditUnavailable message={why} onBack={toList} />;
    return <EditAccount key={target.id} account={target} actorId={user.id} onBack={toList} />;
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
            <Skel key={i} w="100%" h={44} className="acct-group__skel" />
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
        groups.map((g) => <Group key={g.id} title={g.title} rows={g.rows} canEdit={canEditAccounts} actorId={user.id} onEdit={(a) => navigate('/tai-khoan', { sua: a.id })} />)
      )}

    </div>
  );
}
