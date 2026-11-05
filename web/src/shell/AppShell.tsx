import { BarChart3, CalendarClock, FileText, PanelLeftClose, PanelLeftOpen, RadioTower, Send, UserCog } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { buildHash, useRoute, type RoutePath } from '../lib/router';
import { useBreakpoint, useReducedMotion } from '../lib/useMedia';
import { DEMO_ACCOUNTS, ROLE_LABEL, initials, teamName, useDemo, usePermissions, useStaff } from '../demo/DemoContext';
import { useGuard } from './guard';
import { DUR, tween } from '../lib/motion';
import { useOverlayOpen } from './overlay';

const WIDTH = 272;
const PEEK_OPEN_DELAY = 120;
const PEEK_CLOSE_DELAY = 260;

// Icon theo việc của từng màn: Thiết lập chủ yếu là lịch rà soát và khung gửi; Tài khoản là phân quyền.
// short: nhãn ngắn cho thanh điều hướng dưới trên mobile.
const ALL_NAV: { path: RoutePath; label: string; short: string; icon: ReactNode }[] = [
  { path: '/thong-ke', label: 'Thống kê', short: 'Thống kê', icon: <BarChart3 className="size-5" /> },
  { path: '/gui-thong-bao', label: 'Gửi thông báo', short: 'Gửi', icon: <Send className="size-5" /> },
  { path: '/mau-tin', label: 'Mẫu tin', short: 'Mẫu tin', icon: <FileText className="size-5" /> },
  { path: '/kenh-gui', label: 'Kênh gửi', short: 'Kênh', icon: <RadioTower className="size-5" /> },
  { path: '/thiet-lap', label: 'Thiết lập', short: 'Thiết lập', icon: <CalendarClock className="size-5" /> },
  { path: '/tai-khoan', label: 'Tài khoản', short: 'Tài khoản', icon: <UserCog className="size-5" /> },
];

/** Mục điều hướng theo quyền: cán bộ không có Mẫu tin, Kênh gửi, Tài khoản. */
function useNavItems() {
  const { canViewAccounts, canViewTemplates, canViewChannels } = usePermissions();
  const allowed: Partial<Record<RoutePath, boolean>> = { '/tai-khoan': canViewAccounts, '/mau-tin': canViewTemplates, '/kenh-gui': canViewChannels };
  return ALL_NAV.filter((n) => allowed[n.path] ?? true);
}

function readPinned() {
  try {
    return localStorage.getItem('qttb-sidebar') !== 'collapsed';
  } catch {
    return true;
  }
}

// Logo Thuế thành phố Hà Nội (logo/images.jpg, cắt tròn nền trong suốt ở public/).
// Bấm logo về trang Thống kê (qua điều hướng có chặn rời màn khi còn thay đổi chưa lưu).
function Brand({ size = 32, onHome }: { size?: number; onHome: () => void }) {
  return (
    <a
      className="brand"
      href={buildHash('/thong-ke')}
      aria-label="Quản trị thông báo, về trang Thống kê"
      onClick={(e) => {
        e.preventDefault();
        onHome();
      }}
    >
      <img className="mark" src={`${import.meta.env.BASE_URL}logo-thue-ha-noi.png`} width={size} height={size} alt="" />
      <span className="brand__text">
        <span className="brand__name">Quản trị thông báo</span>
        <span className="brand__org">Thuế thành phố Hà Nội</span>
      </span>
    </a>
  );
}

/* ---------- Tài khoản (kèm chọn tài khoản xem thử của bản thiết kế) ---------- */

const roleLine = (role: keyof typeof ROLE_LABEL, team: string | null) => (team ? `${ROLE_LABEL[role]} · ${teamName(team)}` : ROLE_LABEL[role]);

function Account({ compact }: { compact?: boolean }) {
  const { userId, setUserId } = useDemo();
  const staff = useStaff();
  const { user } = usePermissions();
  const panel = (
    <div className="account-panel">
      <p className="account-panel__name">{user.name}</p>
      <p className="account-panel__title">Tài khoản xem thử</p>
      <RadioGroup value={userId} onValueChange={(v) => setUserId(v as (typeof DEMO_ACCOUNTS)[number])} className="account-panel__roles" aria-label="Tài khoản xem thử">
        {DEMO_ACCOUNTS.map((id) => {
          const s = staff.find((x) => x.id === id)!;
          return (
            <div key={id} className="flex min-h-11 items-center gap-2">
              <RadioGroupItem value={id} id={`demo-${id}`} />
              <Label htmlFor={`demo-${id}`} className="account-panel__option font-normal">
                <span>{s.name}</span>
                <small>{roleLine(s.role, s.team)}</small>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
      <button type="button" className="account" aria-label={`Tài khoản ${user.name}, ${roleLine(user.role, user.team)}`}>
        <Avatar className="size-8">
          <AvatarFallback className="account__avatar">{initials(user.name)}</AvatarFallback>
        </Avatar>
        {!compact && (
          <span className="account__text">
            <span className="account__name">{user.name}</span>
            <span className="account__role">{roleLine(user.role, user.team)}</span>
          </span>
        )}
      </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        {panel}
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Sidebar: mở cố định, hoặc ẩn hẳn và trượt ra khi rê chuột (hover-peek) ---------- */

function useNav() {
  const { path, navigate } = useRoute();
  const { confirmLeave } = useGuard();
  return { path, go: (to: RoutePath, after?: () => void) => (to === path ? after?.() : confirmLeave(() => (navigate(to), after?.()))) };
}

export default function AppShell({ children }: { children: ReactNode }) {
  const bp = useBreakpoint();
  const overlayOpen = useOverlayOpen();
  const reduced = useReducedMotion();
  const { path, go } = useNav();
  const nav = useNavItems();
  const { user } = usePermissions();
  // Tài khoản bị tạm khóa: không hiện dữ liệu.
  const content = user.active ? children : <p className="locked-note" role="status">Tài khoản {user.name} đang tạm khóa. Liên hệ lãnh đạo cơ sở để mở lại.</p>;
  const canPin = bp === 'desktop';
  useEffect(() => {
    document.documentElement.dataset.bp = bp;
  }, [bp]);
  const [pinnedPref, setPinnedPref] = useState(readPinned);
  const pinned = canPin && pinnedPref;
  const [peek, setPeek] = useState(false);
  const [byClick, setByClick] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const asideRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const visible = pinned || peek;
  const floating = !pinned && peek;
  // Logo dẫn về Thống kê; thanh bên đang mở dạng phủ thì đóng lại sau khi chuyển.
  const home = () => go('/thong-ke', floating ? () => (setPeek(false), setByClick(false)) : undefined);

  const schedule = useCallback((next: boolean, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPeek(next), delay);
  }, []);
  const close = useCallback(() => {
    window.clearTimeout(timer.current);
    setPeek(false);
    setByClick(false);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!floating) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      close();
      openerRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [floating, close]);

  const setPinned = (v: boolean) => {
    setPinnedPref(v);
    close();
    try {
      localStorage.setItem('qttb-sidebar', v ? 'pinned' : 'collapsed');
    } catch {
      /* chỉ giữ trong phiên */
    }
  };

  const hoverOpen = (e: React.PointerEvent) => e.pointerType === 'mouse' && !pinned && schedule(true, PEEK_OPEN_DELAY);
  const hoverClose = (e: React.PointerEvent) => e.pointerType === 'mouse' && !pinned && !byClick && schedule(false, PEEK_CLOSE_DELAY);
  // Desktop: bấm nút mở = ghim. Tablet không đủ chỗ để ghim nên bấm = mở dạng phủ, chạm ra ngoài để đóng.
  const onOpener = () => (canPin ? setPinned(true) : (setByClick(true), setPeek(true), requestAnimationFrame(() => asideRef.current?.querySelector('a')?.focus())));

  if (bp === 'mobile') {
    return (
      <div className={`shell shell--mobile${overlayOpen ? ' shell--overlay' : ''}`}>
        <header className="m-header">
          <Brand onHome={home} />
          <Account compact />
        </header>
        <main className="canvas" id="main">
          {content}
        </main>
        {!overlayOpen && (
          <nav className="bottom-nav" aria-label="Điều hướng chính">
            {nav.map((item) => (
              <a
                key={item.path}
                href={buildHash(item.path)}
                className={`bottom-nav__item${item.path === path ? ' bottom-nav__item--active' : ''}`}
                aria-current={item.path === path ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  go(item.path);
                }}
              >
                <span className="bottom-nav__icon" aria-hidden="true">{item.icon}</span>
                <span>{item.short}</span>
              </a>
            ))}
          </nav>
        )}
      </div>
    );
  }

  const transition = reduced ? { duration: 0 } : tween(DUR.overlay);

  return (
    <div className={`shell${pinned ? ' shell--pinned' : ''}`} style={{ ['--rail' as string]: pinned ? `${WIDTH}px` : '0px' }}>
      <a className="skip-link" href="#main">
        Bỏ qua điều hướng
      </a>

      {/* Mép trái: rê chuột sát cạnh màn hình cũng mở thanh bên */}
      {!pinned && <div className="peek-edge" onPointerEnter={hoverOpen} onPointerLeave={hoverClose} aria-hidden="true" />}

      <AnimatePresence>
        {floating && byClick && (
          <motion.div className="sidebar-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={transition} onClick={close} aria-hidden="true" />
        )}
      </AnimatePresence>

      <motion.aside
        ref={asideRef}
        className={`sidebar${floating ? ' sidebar--floating' : ''}`}
        initial={false}
        animate={{ x: visible ? 0 : -WIDTH - 2 }}
        transition={transition}
        onPointerEnter={hoverOpen}
        onPointerLeave={hoverClose}
        onBlur={(e) => floating && !asideRef.current?.contains(e.relatedTarget as Node) && close()}
        inert={!visible}
        aria-label="Điều hướng chính"
      >
        <div className="sidebar__brand">
          <Brand size={40} onHome={home} />
          {canPin && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => setPinned(!pinned)}
              aria-label={pinned ? 'Thu gọn thanh bên' : 'Giữ thanh bên luôn mở'}
              title={pinned ? 'Thu gọn' : 'Giữ luôn mở'}
            >
              {pinned ? <PanelLeftClose className="size-[18px]" /> : <PanelLeftOpen className="size-[18px]" />}
            </button>
          )}
        </div>
        <nav className="sidebar__nav">
          {nav.map((item) => {
            const active = item.path === path;
            return (
              <motion.a
                key={item.path}
                href={buildHash(item.path)}
                className={`nav-item${active ? ' nav-item--active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  go(item.path, floating ? close : undefined);
                }}
                whileHover={reduced || active ? undefined : { y: -2 }}
                whileTap={reduced ? undefined : { y: 0 }}
                transition={tween(DUR.fast)}
              >
                {/* Ô trắng của mục đang chọn là một phần tử dùng chung, trượt sang mục mới khi chuyển màn. */}
                {active && <motion.span layoutId="nav-pill" className="nav-pill" transition={tween(DUR.state)} aria-hidden="true" />}
                <span aria-hidden="true" className="nav-item__icon">{item.icon}</span>
                <span className="nav-item__label">{item.label}</span>
              </motion.a>
            );
          })}
        </nav>
      </motion.aside>

      <div className="shell__main">
        <header className="topbar">
          <div className="topbar__left">
            {!pinned && (
              <>
                <button
                  ref={openerRef}
                  type="button"
                  className="icon-btn"
                  onClick={onOpener}
                  onPointerEnter={hoverOpen}
                  onPointerLeave={hoverClose}
                  aria-label={canPin ? 'Mở thanh bên' : 'Mở điều hướng'}
                  aria-expanded={peek}
                  title="Mở thanh bên"
                >
                  <PanelLeftOpen className="size-[18px]" />
                </button>
                <Brand onHome={home} />
              </>
            )}
          </div>
          <Account />
        </header>
        <main className="canvas" id="main">
          {content}
        </main>
      </div>
    </div>
  );
}
