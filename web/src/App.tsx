import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig, motion } from 'motion/react';
import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { DemoProvider } from './demo/DemoContext';
import { GuardProvider } from './shell/guard';
import AppShell from './shell/AppShell';
import { useRoute } from './lib/router';
import { PalettePanel } from './dev/PalettePanel';
import { DUR, tween } from './lib/motion';
// Tách gói theo route: ECharts chỉ tải ở màn Thống kê.
const StatsPage = lazy(() => import('./pages/StatsPage'));
const ConfigPage = lazy(() => import('./pages/SettingsWorkspace'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));
const SendPage = lazy(() => import('./pages/NotificationWorkspace'));
const HkdPage = lazy(() => import('./pages/HkdPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 0, refetchOnWindowFocus: false } },
});

function Routes() {
  const { path } = useRoute();
  // Đổi màn: nội dung hiện dần 160ms (chỉ độ mờ, không trượt) để phản hồi thao tác bấm điều hướng.
  return (
    <Suspense fallback={<div className="page-skel" aria-busy="true" aria-label="Đang tải màn hình" />}>
      <motion.div key={path} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tween(DUR.state)}>
        {path === '/thiet-lap' ? <ConfigPage /> : path === '/tai-khoan' ? <AccountsPage /> : path === '/gui-thong-bao' ? <SendPage /> : path === '/quan-ly-hkd' ? <HkdPage /> : <StatsPage />}
      </motion.div>
    </Suspense>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <DemoProvider>
          <GuardProvider>
            <AppShell>
              <Routes />
            </AppShell>
          </GuardProvider>
        </DemoProvider>
      </QueryClientProvider>
      <PalettePanel />
      <Toaster position="top-center" richColors={false} />
    </MotionConfig>
  );
}
