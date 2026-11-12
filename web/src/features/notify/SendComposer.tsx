import { ChoiceSelect, DialogFrame, Feedback, OptionGroup, TextareaField } from '@/shared/components/Controls';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Search, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AUTO_VARS, varLabel, channelName, createSend, fetchChannels, fetchTemplates, GROUPS,
  noIhanoi, publishedOf, reasonText, resolveAudience, scopeTaxpayers, varsOf,
  type AudienceKind, type ChannelId,
} from './notifyApi';
import { BlockEmpty, Skel } from '@/shared/components/Blocks';
import { taxpayers } from '@/shared/data/mock';
import { TEAMS } from '@/shared/data/org';
import { teamName, usePermissions } from '@/shared/demo/useDemo';
import { num } from '@/shared/lib/format';
import { useRoute } from '@/shared/lib/router';
import { useBreakpoint } from '@/shared/lib/useMedia';
import { useGuard } from '@/shared/lib/guardContext';
import { PushPreview } from '@/features/records/PushPreview';
import { CHANNEL_STATUS } from '@/features/settings/channelStatus';
import { BODY_MAX, TITLE_MAX } from './templateText';
import { BATCH, fill } from './sendShared';

/* ---------- Soạn lần gửi ---------- */

export function Composer({ onDone, onBack }: { onDone: (id: string) => void; onBack: () => void }) {
  const { user, sendTeam, canFreeText } = usePermissions();
  const { params } = useRoute();
  const bp = useBreakpoint();
  const qc = useQueryClient();
  const chq = useQuery({ queryKey: ['channels'], queryFn: fetchChannels });
  const tq = useQuery({ queryKey: ['templates'], queryFn: fetchTemplates });
  const [kind, setKind] = useState<AudienceKind>('group');
  const [group, setGroup] = useState(GROUPS[0].id);
  const [team, setTeam] = useState(sendTeam ?? TEAMS[0].id);
  const [picked, setPicked] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [chans, setChans] = useState<ChannelId[]>(['IN_APP', 'IHANOI']);
  const [mode, setMode] = useState<'template' | 'free'>('template');
  const [tplId, setTplId] = useState(params.get('modele') ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  const [free, setFree] = useState({ title: '', body: '' });
  const [confirm, setConfirm] = useState(false);
  const [shown, setShown] = useState(false);
  const [key] = useState(() => `${user.id}-${Date.now()}`);
  // Đã nhập dở thì hỏi trước khi rời (nút quay lại, đổi màn trên sidebar, đóng tab).
  const { setGuard, confirmLeave } = useGuard();
  const dirty = picked.length > 0 || Object.values(values).some((v) => v.trim()) || !!free.title.trim() || !!free.body.trim();
  useEffect(() => {
    setGuard({ dirty, discard: () => {} });
    return () => setGuard(null);
  }, [dirty, setGuard]);
  const leave = () => confirmLeave(onBack);

  const scope = useMemo(() => scopeTaxpayers(sendTeam), [sendTeam]);
  const ids = useMemo(() => resolveAudience(kind, kind === 'pick' ? picked.map(String) : kind === 'team' ? team : group, sendTeam), [kind, picked, team, group, sendTeam]);
  const published = (tq.data ?? []).filter((t) => publishedOf(t));
  const tpl = published.find((t) => t.id === tplId) ?? published[0];
  const tv = tpl && publishedOf(tpl);
  const title = mode === 'template' ? tv?.title ?? '' : free.title;
  const body = mode === 'template' ? tv?.body ?? '' : free.body;
  const manualVars = varsOf(`${title} ${body}`).filter((v) => !(v in AUTO_VARS));
  const results = search.trim().length >= 2
    ? scope.filter((id) => !picked.includes(id) && (taxpayers[id].name.toLowerCase().includes(search.trim().toLowerCase()) || taxpayers[id].mst.includes(search.trim()))).slice(0, 8)
    : [];
  const usable = (chq.data ?? []).filter((c) => c.status === 'ACTIVE' || c.status === 'PAUSED');
  const selected = chans.filter((c) => usable.some((u) => u.id === c));

  const errors = [
    !ids.length && 'Chưa có người nhận trong phạm vi được phép.',
    !selected.length && 'Chọn ít nhất một kênh.',
    !title.trim() && 'Nội dung chưa có tiêu đề.',
    !body.trim() && 'Nội dung chưa có phần thân.',
    mode === 'free' && (free.title.length > TITLE_MAX || free.body.length > BODY_MAX) && 'Nội dung vượt độ dài cho phép.',
    manualVars.some((v) => !values[v]?.trim()) && `Điền giá trị cho ${manualVars.filter((v) => !values[v]?.trim()).map(varLabel).join(', ')}.`,
  ].filter(Boolean) as string[];

  const audienceLabel = kind === 'pick' ? `${picked.length} NNT được chọn` : kind === 'team' ? `Cả ${teamName(team)}` : `Nhóm: ${GROUPS.find((g) => g.id === group)!.name}${sendTeam ? ` · ${teamName(sendTeam)}` : ''}`;
  const skipped = selected.includes('IHANOI') ? ids.filter(noIhanoi).length : 0;
  // Nội dung lưu cho lần gửi: điền biến người gửi nhập, giữ {ten_nnt}/{mst} để điền theo từng NNT lúc gửi.
  const fillManual = (text: string) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in AUTO_VARS ? m : values[k] || m));

  const m = useMutation({
    mutationFn: () => createSend({
      ids, team: sendTeam, audienceLabel, channels: selected,
      contentLabel: mode === 'template' ? `${tpl!.name} · v${tv!.version}` : 'Tự soạn',
      freeText: mode === 'free', title: fillManual(title), body: fillManual(body), idempotencyKey: key,
    }, user.name),
    onSuccess: (s) => (qc.invalidateQueries({ queryKey: ['sends'] }), toast.success(`Đã tạo lần gửi ${s.id} cho ${num(s.total)} NNT.`), onDone(s.id)),
  });

  const toggle = (c: ChannelId) => setChans(chans.includes(c) ? chans.filter((x) => x !== c) : [...chans, c]);
  const size = bp === 'mobile' ? 'lg' : undefined;

  return (
    <div className="acct-page">
      <header className="sub-head">
        <Button variant="outline" size="icon" onClick={leave} aria-label="Quay lại danh sách lần gửi" title="Quay lại danh sách lần gửi">
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div>
          
          <h1 className="sub-head__title">Tạo lần gửi</h1>
        </div>
      </header>
      <div className="compose">
        <div className="compose__form">
          <section className="set-row__panel">
            <h2 className="set-row__title">1. Người nhận</h2>
            <OptionGroup aria-label="Cách chọn người nhận" value={kind} onValueChange={(v) => setKind(v as AudienceKind)} block={bp === 'mobile'}
              options={[{ value: 'group', label: 'Theo nhóm' }, { value: 'team', label: 'Cả tổ' }, { value: 'pick', label: 'Chọn từng NNT' }]} />
            {kind === 'group' && (
              <div className="field">
                <label className="field__label" htmlFor="aud-group">Nhóm NNT{sendTeam ? ` trong ${teamName(sendTeam)}` : ''}</label>
                <ChoiceSelect id="aud-group" value={group} onValueChange={setGroup} options={GROUPS.map((g) => ({ value: g.id, label: g.name }))} className="choice-select--full" />
              </div>
            )}
            {kind === 'team' && (
              <div className="field">
                <label className="field__label" htmlFor="aud-team">Tổ</label>
                <ChoiceSelect id="aud-team" value={team} onValueChange={setTeam} options={TEAMS.filter((t) => !sendTeam || t.id === sendTeam).map((t) => ({ value: t.id, label: t.name }))} className="choice-select--full" />
              </div>
            )}
            {kind === 'pick' && (
              <div className="field">
                <label className="field__label" htmlFor="aud-search">Tìm theo tên hoặc MST</label>
                <label className="acct-search acct-search--full">
                  <Search className="size-4" aria-hidden="true" />
                  <Input id="aud-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nhập ít nhất 2 ký tự" />
                </label>
                {results.length > 0 && (
                  <ul className="pick-results">
                    {results.map((id) => (
                      <li key={id}><button type="button" onClick={() => (setPicked([...picked, id]), setSearch(''))}><Plus className="size-4" aria-hidden="true" />{taxpayers[id].name}<span className="num"> · {taxpayers[id].mst}</span></button></li>
                    ))}
                  </ul>
                )}
                {picked.length > 0 && (
                  <div className="chips">
                    {picked.map((id) => (
                      <span key={id} className="chip">{taxpayers[id].name}<button type="button" aria-label={`Bỏ ${taxpayers[id].name}`} onClick={() => setPicked(picked.filter((x) => x !== id))}><X /></button></span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="compose__count"><b className="num">{num(ids.length)}</b> NNT nhận{ids.length > BATCH ? `, gửi theo ${Math.ceil(ids.length / BATCH)} lô ${BATCH} NNT` : ''}</p>
          </section>

          <section className="set-row__panel">
            <h2 className="set-row__title">2. Kênh</h2>
            {!chq.data ? <Skel w="100%" h={80} /> : (
              <div className="ch-pick">
                {chq.data.map((c) => {
                  const off = c.status === 'NOT_CONNECTED' || c.status === 'DISABLED_EMERGENCY';
                  return (
                    <label key={c.id} className={`ch-pick__item${off ? ' ch-pick__item--off' : ''}`}>
                      <input type="checkbox" checked={!off && chans.includes(c.id)} disabled={off} onChange={() => toggle(c.id)} />
                      <span>
                        <b>{c.name}</b>
                        {(off || c.status === 'PAUSED') && <small>{off ? CHANNEL_STATUS[c.status].label : 'Đang tạm dừng: tin chờ tới khi mở lại'}</small>}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          <section className="set-row__panel">
            <h2 className="set-row__title">3. Nội dung</h2>
            {canFreeText && (
              <OptionGroup aria-label="Nguồn nội dung" value={mode} onValueChange={(v) => setMode(v as 'template' | 'free')} options={[{ value: 'template', label: 'Theo mẫu tin' }, { value: 'free', label: 'Tự soạn' }]} />
            )}
            {mode === 'template' ? (
              !tq.data ? <Skel w="100%" h={60} /> : published.length === 0 ? <BlockEmpty>Chưa có mẫu tin đã xuất bản.</BlockEmpty> : (
                <div className="field">
                  <label className="field__label" htmlFor="tpl-pick">Mẫu tin</label>
                  <ChoiceSelect id="tpl-pick" value={tpl!.id} onValueChange={setTplId} options={published.map((t) => ({ value: t.id, label: `${t.name} (v${publishedOf(t)!.version})` }))} className="choice-select--full" />
                </div>
              )
            ) : (
              <>
                <div className="field">
                  <label className="field__label" htmlFor="free-title">Tiêu đề <span className="field__count">{free.title.length}/{TITLE_MAX}</span></label>
                  <Input id="free-title" value={free.title} maxLength={TITLE_MAX + 20} onChange={(e) => setFree({ ...free, title: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="free-body">Nội dung <span className="field__count">{free.body.length}/{BODY_MAX}</span></label>
                  <TextareaField id="free-body" rows={4} value={free.body} onChange={(e) => setFree({ ...free, body: e.target.value })} />
                  <div className="tpl-vars">
                    {Object.entries(AUTO_VARS).map(([k, l]) => (
                      <button key={k} type="button" className="tab-action" onClick={() => setFree({ ...free, body: `${free.body}{${k}}` })}>Chèn {l.charAt(0).toLowerCase() + l.slice(1)}</button>
                    ))}
                  </div>
                  
                </div>
              </>
            )}
            {manualVars.map((v) => (
              <div className="field" key={v}>
                <label className="field__label" htmlFor={`var-${v}`}>{varLabel(v)}</label>
                <Input id={`var-${v}`} value={values[v] ?? ''} onChange={(e) => setValues({ ...values, [v]: e.target.value })} />
              </div>
            ))}
          </section>
        </div>

        <aside className="compose__preview">
          <p className="field__label">Xem trước với {ids[0] !== undefined ? taxpayers[ids[0]].name : 'NNT đầu danh sách'}</p>
          <PushPreview title={fill(title, ids[0], values) || 'Tiêu đề'} body={fill(body, ids[0], values) || 'Nội dung thông báo'} />
        </aside>
      </div>

      {shown && errors.length > 0 && <Feedback className="cfg-alert" severity="error" title={errors[0]} />}
      <div className="action-bar" role="region" aria-label="Gửi thông báo">
        <span className="action-bar__state"><b className="num">{num(ids.length)}</b>&nbsp;NNT · {selected.length} kênh</span>
        <Button variant="outline" size={size} onClick={leave}>Hủy</Button>
        <Button size={size} onClick={() => (setShown(true), !errors.length && setConfirm(true))}>Xem trước và gửi</Button>
      </div>

      {confirm && (
        <DialogFrame open width={600} onClose={() => setConfirm(false)} title={`Gửi tới ${num(ids.length)} NNT?`} footer={
          <div className="sheet__footer">
            <Button variant="outline" size={size} onClick={() => setConfirm(false)}>Quay lại sửa</Button>
            <Button size={size} loading={m.isPending} onClick={() => m.mutate()}>Gửi {num(ids.length)} thông báo</Button>
          </div>
        }>
          <div className="acct-form">
            <dl className="kv">
              <dt>Người nhận</dt><dd>{audienceLabel}</dd>
              {selected.map((c) => (
                <Fragment key={c}><dt>{channelName(c)}</dt><dd>
                  Sẽ gửi <b className="num">{num(ids.length - (c === 'IHANOI' ? skipped : 0))}</b>
                  {c === 'IHANOI' && skipped > 0 && <>, bỏ qua <b className="num">{num(skipped)}</b> ({reasonText('NO_ENDPOINT')})</>}
                  {chq.data?.find((x) => x.id === c)?.status === 'PAUSED' && ' · kênh đang tạm dừng, tin chờ tới khi mở lại'}
                </dd></Fragment>
              ))}
              {ids.length > BATCH && (<><dt>Chia lô</dt><dd>{Math.ceil(ids.length / BATCH)} lô, mỗi lô tối đa {BATCH} NNT</dd></>)}
            </dl>
            <PushPreview title={fill(title, ids[0], values)} body={fill(body, ids[0], values)} />
            <Feedback severity="info" title="Sau khi gửi, tin đã vào hộp thư hoặc iHanoi đã tiếp nhận không thu hồi được. Có thể hủy phần chưa gửi ở màn theo dõi." />
            {m.error && <Feedback severity="warning" title={m.error.message} />}
          </div>
        </DialogFrame>
      )}
    </div>
  );
}
