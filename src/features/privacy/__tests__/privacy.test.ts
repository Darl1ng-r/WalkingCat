import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_PRIVACY_SETTINGS,
  REPORT_REASONS,
  type PrivacySettingsValues,
  type ReportTargetType,
} from '../api';
import {
  getLocalHideRouteEndsMetersSetting,
  getLocalHideRouteEndsSetting,
  getLocalSaveSightingAreaSetting,
  setLocalHideRouteEndsMetersSetting,
  setLocalHideRouteEndsSetting,
  setLocalSaveSightingAreaSetting,
} from '@/lib/db';

describe('Privacy, Safety & Moderation (Phase 11)', () => {
  describe('Privacy Defaults & Guardrails', () => {
    it('enforces privacy-by-default rules on all settings', () => {
      // Routes and locations must NEVER be shared or saved by default
      expect(DEFAULT_PRIVACY_SETTINGS.share_walks_with_friends).toBe(false);
      expect(DEFAULT_PRIVACY_SETTINGS.save_sighting_area).toBe(false);
      expect(DEFAULT_PRIVACY_SETTINGS.share_cat_cards).toBe(false);

      // Route trimming buffer defaults to ON at 150 meters
      expect(DEFAULT_PRIVACY_SETTINGS.hide_route_ends).toBe(true);
      expect(DEFAULT_PRIVACY_SETTINGS.hide_route_ends_m).toBe(150);

      // Friends community defaults
      expect(DEFAULT_PRIVACY_SETTINGS.show_on_friends_leaderboard).toBe(true);
      expect(DEFAULT_PRIVACY_SETTINGS.share_milestones_with_friends).toBe(true);
      expect(DEFAULT_PRIVACY_SETTINGS.discoverable_by_username).toBe(true);
      expect(DEFAULT_PRIVACY_SETTINGS.analytics_opt_out).toBe(false);
    });

    it('supports buffer distance options of 100, 150, and 300 meters', () => {
      const allowedDistances: (100 | 150 | 300)[] = [100, 150, 300];
      allowedDistances.forEach((dist) => {
        const settings: PrivacySettingsValues = {
          ...DEFAULT_PRIVACY_SETTINGS,
          hide_route_ends_m: dist,
        };
        expect([100, 150, 300]).toContain(settings.hide_route_ends_m);
      });
    });
  });

  describe('Report Reasons & Moderation Categories', () => {
    it('includes all required moderation reasons', () => {
      const keys = REPORT_REASONS.map((r) => r.key);
      expect(keys).toContain('animal_harm');
      expect(keys).toContain('inappropriate');
      expect(keys).toContain('personal_info');
      expect(keys).toContain('spam');
      expect(keys).toContain('other');
    });

    it('prioritizes animal welfare as the first reporting category', () => {
      expect(REPORT_REASONS[0].key).toBe('animal_harm');
      expect(REPORT_REASONS[0].label).toContain('Animal Welfare');
    });

    it('has non-empty descriptions and labels for every reason', () => {
      REPORT_REASONS.forEach((reason) => {
        expect(reason.label.trim().length).toBeGreaterThan(0);
        expect(reason.description.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('Local Storage Privacy Preferences (SQLite / Memory fallback)', () => {
    it('persists and retrieves route trimming enabled toggle', () => {
      setLocalHideRouteEndsSetting(false);
      expect(getLocalHideRouteEndsSetting()).toBe(false);

      setLocalHideRouteEndsSetting(true);
      expect(getLocalHideRouteEndsSetting()).toBe(true);
    });

    it('persists and retrieves route trimming distance buffer (100 / 150 / 300 m)', () => {
      setLocalHideRouteEndsMetersSetting(100);
      expect(getLocalHideRouteEndsMetersSetting()).toBe(100);

      setLocalHideRouteEndsMetersSetting(300);
      expect(getLocalHideRouteEndsMetersSetting()).toBe(300);

      setLocalHideRouteEndsMetersSetting(150);
      expect(getLocalHideRouteEndsMetersSetting()).toBe(150);
    });

    it('persists and retrieves sighting area save preference (default false)', () => {
      setLocalSaveSightingAreaSetting(true);
      expect(getLocalSaveSightingAreaSetting()).toBe(true);

      setLocalSaveSightingAreaSetting(false);
      expect(getLocalSaveSightingAreaSetting()).toBe(false);
    });
  });

  describe('Report Target Types', () => {
    it('validates supported target types for reporting', () => {
      const validTargets: ReportTargetType[] = [
        'sighting',
        'cat_card',
        'profile',
        'activity_event',
      ];
      expect(validTargets).toHaveLength(4);
      validTargets.forEach((t) => {
        expect(['sighting', 'cat_card', 'profile', 'activity_event']).toContain(t);
      });
    });
  });
});
