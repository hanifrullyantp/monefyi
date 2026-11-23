import { describe, expect, it } from 'vitest';
import {
  buildWhatsappShareUrl,
  getAgentBriefingLead,
  matchesDashboardHealthFilter,
} from './dashboardHelpers';

describe('dashboardHelpers (F-11 / F-26 / F-34)', () => {
  describe('matchesDashboardHealthFilter', () => {
    it('matches all statuses when filter is all', () => {
      expect(matchesDashboardHealthFilter('on_track', 'all')).toBe(true);
      expect(matchesDashboardHealthFilter('at_risk', 'all')).toBe(true);
      expect(matchesDashboardHealthFilter('behind', 'all')).toBe(true);
      expect(matchesDashboardHealthFilter('ahead', 'all')).toBe(true);
    });

    it('matches both at_risk and behind when filter is attention (F-11)', () => {
      expect(matchesDashboardHealthFilter('at_risk', 'attention')).toBe(true);
      expect(matchesDashboardHealthFilter('behind', 'attention')).toBe(true);
      expect(matchesDashboardHealthFilter('on_track', 'attention')).toBe(false);
      expect(matchesDashboardHealthFilter('ahead', 'attention')).toBe(false);
      expect(matchesDashboardHealthFilter(undefined, 'attention')).toBe(false);
    });

    it('matches exact status for single-status chips', () => {
      expect(matchesDashboardHealthFilter('on_track', 'on_track')).toBe(true);
      expect(matchesDashboardHealthFilter('behind', 'on_track')).toBe(false);
      expect(matchesDashboardHealthFilter('behind', 'behind')).toBe(true);
      expect(matchesDashboardHealthFilter('at_risk', 'behind')).toBe(false);
    });
  });

  describe('getAgentBriefingLead (F-34)', () => {
    it('returns appropriate briefing lead across all hours 0..23', () => {
      for (let h = 0; h < 24; h++) {
        const lead = getAgentBriefingLead(h);
        if (h < 12) {
          expect(lead).toBe('Laporan pagi:');
        } else if (h < 15) {
          expect(lead).toBe('Laporan siang:');
        } else if (h < 18) {
          expect(lead).toBe('Laporan sore:');
        } else {
          expect(lead).toBe('Laporan malam:');
        }
      }
      expect(getAgentBriefingLead(19)).toBe('Laporan malam:');
    });
  });

  describe('buildWhatsappShareUrl (F-26)', () => {
    it('encodes report text safely into a wa.me link', () => {
      const sample = '*LAPORAN MINGGUAN — Proyek A & B*\n• Est. Laba: -Rp 15.000.000 (100%)';
      const url = buildWhatsappShareUrl(sample);
      expect(url.startsWith('https://wa.me/?text=')).toBe(true);
      expect(url).not.toContain('\n');
      expect(url).not.toContain(' ');
      expect(decodeURIComponent(url.replace('https://wa.me/?text=', ''))).toBe(sample);
    });
  });
});
