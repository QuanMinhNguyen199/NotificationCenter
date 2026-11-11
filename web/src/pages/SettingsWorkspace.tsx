import { ViewTabs } from '@/components/Controls';
import { usePermissions } from '../demo/DemoContext';
import { useRoute } from '../lib/router';
import { useGuard } from '../shell/guard';
import ConfigPage from './ConfigPage';
import ChannelsPage from './ChannelsPage';

export default function SettingsWorkspace() {
  const { params, navigate } = useRoute();
  const { canViewChannels } = usePermissions();
  const { confirmLeave } = useGuard();
  const current = params.get('nhom') === 'kenh' && canViewChannels ? 'kenh' : 'tu-dong';
  if (!canViewChannels) return <ConfigPage />;
  return <ViewTabs value={current} onValueChange={(nhom) => confirmLeave(() => navigate('/thiet-lap', { nhom }))} items={[
    { key: 'tu-dong', label: 'Quy tắc nhắc tự động', children: current === 'tu-dong' ? <ConfigPage /> : null },
    { key: 'kenh', label: 'Kênh gửi', children: current === 'kenh' ? <ChannelsPage /> : null },
  ]} />;
}
