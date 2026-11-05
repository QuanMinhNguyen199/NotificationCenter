import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig, motion } from 'motion/react';
import { lazy, Suspense } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { DemoProvider } from './demo/DemoContext';
import { GuardProvider } from './shell/guard';
import AppShell from './shell/AppShell';
import { useRoute } from './lib/router';
import { PalettePanel } from './dev/PalettePanel';
// Tách gói theo route: ECharts chỉ tải ở màn Thống kê.
const StatsPage = lazy(() => import('./pages/StatsPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const AccountsPage = lazy(() => import('./pages/AccountsPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 0, refetchOnWindowFocus: false } },
});

function Routes() {
  const { path } = useRoute();
  // Đổi màn: nội dung hiện dần 160ms (chỉ độ mờ, không trượt) để phản hồi thao tác bấm điều hướng.
  return (
    <Suspense fallback={<div className="page-skel" aria-busy="true" aria-label="Đang tải màn hình" />}>
      <motion.div key={path} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16, ease: 'easeOut' }}>
        {path === '/thiet-lap' ? <ConfigPage /> : path === '/tai-khoan' ? <AccountsPage /> : <StatsPage />}
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
