import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { orgSnapshot, subscribeOrg } from '../api/mockApi';
import { TEAMS, officerOf } from '../data/org';
import type { Role, Staff } from '../data/types';

// Tài khoản xem thử của bản thiết kế, mỗi cấp một tài khoản. Khi nối đăng nhập Keycloak/OIDC, tài khoản lấy từ token.
// Vai trò và tổ đọc trực tiếp từ kho tài khoản, nên đổi quyền ở màn Tài khoản có tác dụng ngay khi chuyển sang tài khoản đó.
export const DEMO_ACCOUNTS = ['an', 'ha', 'binh'] as const;
type DemoId = (typeof DEMO_ACCOUNTS)[number];

interface DemoState {
  userId: DemoId;
  setUserId: (id: DemoId) => void;
}

const KEY = 'qttb-demo-user';

function load(): DemoId {
  try {
    const v = localStorage.getItem(KEY);
    return DEMO_ACCOUNTS.find((d) => d === v) ?? 'an';
  } catch {
    return 'an';
  }
}

const Ctx = createContext<DemoState | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [userId, setState] = useState<DemoId>(load);
  const value = useMemo<DemoState>(
    () => ({
      userId,
      setUserId: (id) => {
        setState(id);
        try {
          localStorage.setItem(KEY, id);
        } catch {
          /* không lưu được thì chỉ giữ trong phiên */
        }
      },
    }),
    [userId],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDemo cần DemoProvider');
  return v;
}

export const ROLE_LABEL: Record<Role, string> = {
  base: 'Lãnh đạo cơ sở',
  team: 'Lãnh đạo tổ',
  officer: 'Cán bộ',
};

export const teamName = (id: string | null) => TEAMS.find((t) => t.id === id)?.name ?? '';
export const initials = (name: string) => name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();

/** Danh sách tài khoản, cập nhật khi màn Tài khoản đổi quyền. */
export function useStaff() {
  return useSyncExternalStore(subscribeOrg, orgSnapshot);
}

export function useCurrentUser(): Staff {
  const { userId } = useDemo();
  return useStaff().find((s) => s.id === userId)!;
}

export interface ScopeGroup {
  label: string | null;
  items: { value: string; label: string }[];
}

/** Quyền giao diện; backend vẫn là nơi kiểm tra cuối cùng. */
export function usePermissions() {
  const user = useCurrentUser();
  const staff = useStaff();
  const role = user.role;

  return useMemo(() => {
    const officers = (team: string) => staff.filter((s) => s.team === team && s.role === 'officer' && s.active);
    const teamGroup = (team: string): ScopeGroup => ({
      label: teamName(team),
      items: [{ value: team, label: `Cả ${teamName(team)}` }, ...officers(team).map((s) => ({ value: s.id, label: s.name }))],
    });
    // Phạm vi xem thống kê: lãnh đạo cơ sở cả cơ sở, lãnh đạo tổ trong tổ mình, cán bộ chỉ NNT mình phụ trách.
    const scopes: ScopeGroup[] =
      role === 'base'
        ? [{ label: null, items: [{ value: 'ALL', label: 'Toàn cơ sở' }] }, ...TEAMS.map((t) => teamGroup(t.id))]
        : role === 'team' && user.team
          ? [teamGroup(user.team)]
          : [{ label: null, items: [{ value: user.id, label: user.name }] }];
    const allowed = scopes.flatMap((g) => g.items.map((i) => i.value));

    const scopeLabel = (v: string) => {
      if (v === 'ALL') return 'Toàn cơ sở';
      if (TEAMS.some((t) => t.id === v)) return teamName(v);
      const s = staff.find((x) => x.id === v);
      if (!s) return v;
      return s.id === user.id ? 'NNT tôi phụ trách' : `${s.name} (${teamName(s.team)})`;
    };

    /** NNT có nằm trong phạm vi của tài khoản không (chặn mở chi tiết bằng cách sửa link). */
    const canSeeTaxpayer = (id: number) => {
      if (role === 'base') return true;
      const owner = staff.find((s) => s.id === officerOf[id]);
      return role === 'team' ? !!owner && owner.team === user.team : owner?.id === user.id;
    };

    return {
      role,
      user,
      canSeeTaxpayer,
      canEditConfig: role === 'base' && user.active,
      // Đợt gửi chung cho cả cơ sở nên chỉ lãnh đạo cơ sở được duyệt, dừng, hủy.
      canOperateRuns: role === 'base' && user.active,
      canViewAccounts: role !== 'officer' && user.active,
      canEditAccounts: role === 'base' && user.active,
      scopes,
      allowedScopes: allowed,
      fixedScope: role === 'officer' ? user.id : null,
      defaultScope: allowed[0],
      scopeLabel,
    };
  }, [role, user, staff]);
}
