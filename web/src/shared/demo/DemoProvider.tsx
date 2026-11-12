import { useMemo, useState, type ReactNode } from 'react';
import { DEMO_USER_KEY, DemoCtx, loadDemoUser, type DemoId, type DemoState } from './demoContext';

export function DemoProvider({ children }: { children: ReactNode }) {
  const [userId, setState] = useState<DemoId>(loadDemoUser);
  const value = useMemo<DemoState>(
    () => ({
      userId,
      setUserId: (id) => {
        setState(id);
        try {
          localStorage.setItem(DEMO_USER_KEY, id);
        } catch {
          /* không lưu được thì chỉ giữ trong phiên */
        }
      },
    }),
    [userId],
  );
  return <DemoCtx.Provider value={value}>{children}</DemoCtx.Provider>;
}
