import { useCallback, useEffect, useRef } from 'react';
import type { AttendanceSettings } from '../utils/attendanceSettings';
import { probeOfficeNetwork, isLikelyOnWifi } from '../utils/geoUtils';
import { recordAttendance, resolveAttendanceLocation } from '../services/attendanceService';

const POLL_MS = 45000;

interface Options {
  enabled: boolean;
  orgId: string;
  userId: string;
  userName?: string;
  settings: AttendanceSettings;
  checkedIn: boolean;
  projectId?: string;
  projectName?: string;
  onStatusChange: () => void;
  onNotify: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useAttendanceAutomation({
  enabled,
  orgId,
  userId,
  userName,
  settings,
  checkedIn,
  projectId,
  projectName,
  onStatusChange,
  onNotify,
}: Options) {
  const onOfficeRef = useRef<boolean | null>(null);
  const busyRef = useRef(false);

  const tryAutoCheckIn = useCallback(async () => {
    if (busyRef.current || checkedIn) return;
    busyRef.current = true;
    try {
      const loc = await resolveAttendanceLocation(settings);
      if (loc.message && loc.isOffsite && settings.warn_offsite) {
        onNotify(loc.message, 'info');
      }
      await recordAttendance({
        user_id: userId,
        user_name: userName,
        org_id: orgId,
        type: 'check_in',
        project_id: projectId,
        project_name: projectName,
        latitude: loc.position?.latitude,
        longitude: loc.position?.longitude,
        location_accuracy: loc.position?.accuracy,
        is_offsite: loc.isOffsite,
        source: 'wifi_auto',
        note: settings.allowed_wifi[0]?.ssid ? `wifi:${settings.allowed_wifi[0].ssid}` : 'wifi_auto',
      });
      onNotify('Auto check-in (WiFi kantor terdeteksi)', 'success');
      onStatusChange();
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'Auto check-in gagal', 'error');
    } finally {
      busyRef.current = false;
    }
  }, [checkedIn, orgId, onNotify, onStatusChange, projectId, projectName, settings, userId, userName]);

  const tryAutoCheckOut = useCallback(async () => {
    if (busyRef.current || !checkedIn) return;
    busyRef.current = true;
    try {
      await recordAttendance({
        user_id: userId,
        user_name: userName,
        org_id: orgId,
        type: 'check_out',
        project_id: projectId,
        project_name: projectName,
        source: 'wifi_auto',
        note: 'wifi_disconnect',
      });
      onNotify('Auto check-out (WiFi kantor terputus)', 'info');
      onStatusChange();
    } catch (e) {
      onNotify(e instanceof Error ? e.message : 'Auto check-out gagal', 'error');
    } finally {
      busyRef.current = false;
    }
  }, [checkedIn, orgId, onNotify, onStatusChange, projectId, projectName, userId, userName]);

  useEffect(() => {
    if (!enabled || !settings.auto_wifi_checkin || !settings.wifi_ping_url) return;

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      const reachable = await probeOfficeNetwork(settings.wifi_ping_url!);
      const onOffice = reachable || isLikelyOnWifi();

      if (onOfficeRef.current === null) {
        onOfficeRef.current = onOffice;
        if (onOffice && !checkedIn) await tryAutoCheckIn();
        return;
      }

      if (onOffice && !onOfficeRef.current && !checkedIn) {
        await tryAutoCheckIn();
      } else if (!onOffice && onOfficeRef.current && checkedIn) {
        await tryAutoCheckOut();
      }
      onOfficeRef.current = onOffice;
    };

    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [
    checkedIn,
    enabled,
    settings.auto_wifi_checkin,
    settings.wifi_ping_url,
    tryAutoCheckIn,
    tryAutoCheckOut,
  ]);
}
