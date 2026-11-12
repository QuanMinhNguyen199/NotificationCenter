import type { Tone } from '@/shared/lib/status';
import type { CaseStatus } from './routingApi';

export const STATUS_TONE: Record<CaseStatus, Tone> = { NEW: 'info', IN_PROGRESS: 'warning', ANSWERED: 'success', DONE: 'neutral' };
