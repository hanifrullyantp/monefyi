import { useEffect, useState } from 'react';
import { Loader2, MapPin, Save, Wifi, Plus, Trash2 } from 'lucide-react';
import { loadOrgDetails, mergeOrgSettingsJson } from '../../services/orgService';
import {
  parseAttendanceSettings,
  attendanceSettingsToJson,
  DEFAULT_ATTENDANCE_SETTINGS,
  type AttendanceSettings,
  type AllowedWifi,
} from '../../utils/attendanceSettings';
import { showToast, useUiStore } from '../../store/uiStore';

interface Props {
  orgId: string;
  canEdit: boolean;
  actorId?: string;
}

export default function AttendanceSettingsPanel({ orgId, canEdit, actorId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AttendanceSettings>({ ...DEFAULT_ATTENDANCE_SETTINGS });
  const [newSsid, setNewSsid] = useState('');
  const [newSsidLabel, setNewSsidLabel] = useState('');

  useEffect(() => {
    loadOrgDetails(orgId)
      .then(org => setSettings(parseAttendanceSettings(org.settings as Record<string, unknown>)))
      .catch(e => showToast(e instanceof Error ? e.message : 'Gagal memuat pengaturan', 'error'))
      .finally(() => setLoading(false));
  }, [orgId]);

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const org = await loadOrgDetails(orgId);
      const beforeAttendance = parseAttendanceSettings(org.settings as Record<string, unknown>);
      await mergeOrgSettingsJson(orgId, attendanceSettingsToJson(settings));
      if (actorId) {
        const { recordReversibleAction } = await import('../../services/undoService');
        const action = await recordReversibleAction({
          orgId,
          actorId,
          actionType: 'attendance_settings',
          entityType: 'planner_organizations',
          entityId: orgId,
          beforeState: attendanceSettingsToJson(beforeAttendance),
          afterState: attendanceSettingsToJson(settings),
        });
        useUiStore.getState().showUndoToast('Pengaturan absensi disimpan', action.id);
      }
      showToast('Pengaturan absensi disimpan', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addWifi = () => {
    const ssid = newSsid.trim();
    if (!ssid) return;
    if (settings.allowed_wifi.some(w => w.ssid === ssid)) {
      showToast('SSID sudah ada', 'error');
      return;
    }
    setSettings(s => ({
      ...s,
      allowed_wifi: [...s.allowed_wifi, { ssid, label: newSsidLabel.trim() || undefined }],
    }));
    setNewSsid('');
    setNewSsidLabel('');
  };

  const removeWifi = (ssid: string) => {
    setSettings(s => ({ ...s, allowed_wifi: s.allowed_wifi.filter(w => w.ssid !== ssid) }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-50">
        <h3 className="font-bold text-slate-800">Pengaturan Absensi & Payroll</h3>
        <p className="text-xs text-slate-500 mt-1">
          Jam kerja per hari dipakai untuk deteksi hari tidak genap. WiFi kantor dipakai untuk auto check-in/out (via URL internal jaringan kantor).
        </p>
      </div>

      <div className="p-4 space-y-4 text-sm">
        <div>
          <label className="text-xs font-semibold text-slate-500">Jam kerja = 1 hari absensi</label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="number"
              min={1}
              max={24}
              step={0.5}
              disabled={!canEdit}
              value={settings.hours_per_day}
              onChange={e => setSettings(s => ({ ...s, hours_per_day: Number(e.target.value) || 8 }))}
              className="w-24 px-3 py-2 rounded-xl border border-slate-200"
            />
            <span className="text-slate-500">jam (contoh: 8)</span>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 font-semibold text-slate-800 mb-2">
            <MapPin className="w-4 h-4 text-indigo-600" /> Lokasi kerja (geofence)
          </div>
          <label className="flex items-center gap-2 text-xs mb-2">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={settings.geofence_enabled}
              onChange={e => setSettings(s => ({ ...s, geofence_enabled: e.target.checked }))}
            />
            Aktifkan deteksi lokasi saat absensi
          </label>
          <label className="flex items-center gap-2 text-xs mb-3">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={settings.warn_offsite}
              onChange={e => setSettings(s => ({ ...s, warn_offsite: e.target.checked }))}
            />
            Peringatkan jika absensi di luar lokasi kerja
          </label>
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              placeholder="Nama lokasi (Kantor Pusat)"
              disabled={!canEdit}
              value={settings.work_site?.name || ''}
              onChange={e => setSettings(s => ({
                ...s,
                work_site: {
                  lat: s.work_site?.lat ?? -6.2,
                  lng: s.work_site?.lng ?? 106.8,
                  radius_m: s.work_site?.radius_m ?? 200,
                  name: e.target.value,
                },
              }))}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <input
              type="number"
              placeholder="Radius (meter)"
              disabled={!canEdit}
              value={settings.work_site?.radius_m ?? 200}
              onChange={e => setSettings(s => ({
                ...s,
                work_site: {
                  lat: s.work_site?.lat ?? -6.2,
                  lng: s.work_site?.lng ?? 106.8,
                  radius_m: Number(e.target.value) || 200,
                  name: s.work_site?.name,
                },
              }))}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              disabled={!canEdit}
              value={settings.work_site?.lat ?? ''}
              onChange={e => setSettings(s => ({
                ...s,
                work_site: {
                  lat: Number(e.target.value),
                  lng: s.work_site?.lng ?? 106.8,
                  radius_m: s.work_site?.radius_m ?? 200,
                  name: s.work_site?.name,
                },
              }))}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              disabled={!canEdit}
              value={settings.work_site?.lng ?? ''}
              onChange={e => setSettings(s => ({
                ...s,
                work_site: {
                  lat: s.work_site?.lat ?? -6.2,
                  lng: Number(e.target.value),
                  radius_m: s.work_site?.radius_m ?? 200,
                  name: s.work_site?.name,
                },
              }))}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 font-semibold text-slate-800 mb-2">
            <Wifi className="w-4 h-4 text-indigo-600" /> WiFi kantor & auto absensi
          </div>
          <p className="text-xs text-slate-500 mb-2">
            Browser tidak bisa membaca nama WiFi langsung. Tag SSID sebagai referensi; auto check-in memakai URL internal yang hanya bisa diakses dari jaringan kantor.
          </p>
          <label className="flex items-center gap-2 text-xs mb-3">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={settings.auto_wifi_checkin}
              onChange={e => setSettings(s => ({ ...s, auto_wifi_checkin: e.target.checked }))}
            />
            Auto check-in saat terhubung WiFi kantor, check-out saat terputus
          </label>
          <input
            placeholder="URL ping internal (http://192.168.1.1 atau portal kantor)"
            disabled={!canEdit}
            value={settings.wifi_ping_url || ''}
            onChange={e => setSettings(s => ({ ...s, wifi_ping_url: e.target.value || null }))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm mb-3"
          />

          <div className="space-y-2">
            {(settings.allowed_wifi as AllowedWifi[]).map(w => (
              <div key={w.ssid} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2">
                <div>
                  <div className="font-semibold text-slate-800">{w.ssid}</div>
                  {w.label && <div className="text-xs text-slate-500">{w.label}</div>}
                </div>
                {canEdit && (
                  <button type="button" onClick={() => removeWifi(w.ssid)} className="text-rose-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {canEdit && (
            <div className="flex flex-wrap gap-2 mt-2">
              <input
                placeholder="Nama SSID WiFi"
                value={newSsid}
                onChange={e => setNewSsid(e.target.value)}
                className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <input
                placeholder="Label (opsional)"
                value={newSsidLabel}
                onChange={e => setNewSsidLabel(e.target.value)}
                className="flex-1 min-w-[120px] px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <button type="button" onClick={addWifi} className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Tag WiFi
              </button>
            </div>
          )}
        </div>

        {canEdit && (
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Pengaturan
          </button>
        )}
      </div>
    </div>
  );
}
