import { describe, expect, it, vi } from 'vitest';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('framer-motion', () => ({ motion: { div: 'div' } }));
vi.mock('../services/notificationService', () => ({
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));
vi.mock('../store/appStore', () => ({ useAppStore: vi.fn() }));

import {
  getNotificationPriorityBadgeClass,
  getNotificationTypeConfig,
} from './NotificationPanel';

describe('NotificationPanel safe lookups (F-01)', () => {
  it('falls back to system config for unknown or null notification types', () => {
    const unknownCfg = getNotificationTypeConfig('unexpected_backend_type');
    const nullCfg = getNotificationTypeConfig(null);
    const systemCfg = getNotificationTypeConfig('system');

    expect(unknownCfg).toEqual(systemCfg);
    expect(nullCfg).toEqual(systemCfg);
  });

  it('returns empty badge class for unknown or null priority without throwing', () => {
    expect(getNotificationPriorityBadgeClass('unknown_priority')).toBe('');
    expect(getNotificationPriorityBadgeClass(undefined)).toBe('');
    expect(getNotificationPriorityBadgeClass('critical')).toContain('rose');
  });
});

