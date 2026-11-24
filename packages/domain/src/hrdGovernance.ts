/**
 * Modul Tata Kelola HRD: Anti-Kecurangan Kehadiran & RBAC 4 Peran (G8-3).
 *
 * Prinsip keras:
 * 1. Deteksi kecurangan bersifat deterministik dan TIDAK PERNAH menolak catatan diam-diam:
 *    setiap catatan berflag tetap diterima dengan `verificationStatus: 'flagged_for_review'`,
 *    `silentlyRejected: false`, daftar `flags`, `reasons`, dan `requiresMandorOrOwnerReview: true`.
 * 2. RBAC 4 peran (`worker`, `mandor`, `pm`, `owner` | `finance`) + isolasi ketat lintas `orgId`:
 *    redaksi nominal gaji/tarif/kasbon pada mandor (untuk tim) dan PM bersifat wajib (`null`).
 */

export const ATTENDANCE_FRAUD_FLAGS = [
  'buddy_punch_suspected',
  'impossible_location_jump',
  'abnormal_work_hours',
  'reused_photo_hash',
] as const;

export type AttendanceFraudFlag = (typeof ATTENDANCE_FRAUD_FLAGS)[number];
export type AttendanceVerificationStatus = 'verified' | 'flagged_for_review';

export interface AttendanceCheckRecord {
  id?: string;
  orgId: string;
  workerId: string;
  workerName?: string;
  projectId?: string | null;
  deviceId?: string | null;
  isSharedMandorDevice?: boolean;
  sharedDeviceApproved?: boolean;
  sharedDeviceAuthorizedBy?: string | null;
  checkInAt: string;
  checkOutAt?: string | null;
  reportedWorkHours?: number | null;
  nightShiftApproved?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  photoSha256?: string | null;
}

export interface ProjectGeofence {
  projectId?: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface AttendanceFraudContext {
  recentRecords?: AttendanceCheckRecord[];
  knownPhotoHashes?: string[] | Set<string>;
  authorizedSharedDeviceIds?: string[] | Set<string>;
  projectGeofence?: ProjectGeofence | null;
  projectGeofencesByProjectId?: Record<string, ProjectGeofence>;
  buddyPunchWindowMinutes?: number;
  maxTravelSpeedKmh?: number;
  maxDailyWorkHours?: number;
  nightShiftStartMinuteOfDay?: number;
  nightShiftEndMinuteOfDay?: number;
  nightShiftApproved?: boolean;
  timezoneOffsetMinutes?: number;
}

export interface AttendanceFraudMetrics {
  buddyPunchPeerWorkerIds: string[];
  maxJumpSpeedKmh: number | null;
  distanceFromGeofenceMeters: number | null;
  workDurationHours: number | null;
  checkInWallClockHm: string | null;
  matchedPhotoHash: string | null;
}

export interface AttendanceFraudEvaluation {
  recordId: string | null;
  orgId: string;
  workerId: string;
  verificationStatus: AttendanceVerificationStatus;
  silentlyRejected: false;
  acceptedForReview: true;
  requiresMandorOrOwnerReview: boolean;
  flags: AttendanceFraudFlag[];
  reasons: string[];
  metrics: AttendanceFraudMetrics;
}

export const HRD_VIEWER_ROLES = ['worker', 'mandor', 'pm', 'owner', 'finance'] as const;
export type HrdViewerRole = (typeof HRD_VIEWER_ROLES)[number];

export const HRD_SENSITIVE_MONEY_FIELDS = [
  'dailyRate',
  'grossSalary',
  'netSalary',
  'kasbonBalance',
] as const;

export type HrdSensitiveMoneyField = (typeof HRD_SENSITIVE_MONEY_FIELDS)[number];

export interface HrdViewerContext {
  userId: string;
  orgId: string;
  role: HrdViewerRole;
  teamWorkerIds?: string[];
  projectIds?: string[];
}

export interface HrdWorkerPayRecord {
  id?: string;
  orgId: string;
  workerId: string;
  workerName?: string;
  projectId: string;
  projectName?: string;
  workDate: string;
  dayFraction: number;
  regularHours?: number | null;
  overtimeHours?: number | null;
  dailyRate: number | null;
  grossSalary: number | null;
  netSalary: number | null;
  kasbonBalance: number | null;
  verificationStatus?: AttendanceVerificationStatus | string;
  flags?: AttendanceFraudFlag[];
}

export interface FilteredHrdRecord extends HrdWorkerPayRecord {
  isRedacted: boolean;
  redactedFields: HrdSensitiveMoneyField[];
}

export interface HrdRoleFilterResult {
  viewerRole: HrdViewerRole;
  viewerUserId: string;
  orgId: string;
  records: FilteredHrdRecord[];
  totalInputCount: number;
  visibleCount: number;
  redactedRecordCount: number;
  crossOrgRejectedCount: number;
  excludedByScopeCount: number;
}

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_BUDDY_PUNCH_WINDOW_MINUTES = 15;
const DEFAULT_MAX_TRAVEL_SPEED_KMH = 120;
const DEFAULT_MAX_DAILY_WORK_HOURS = 16;
const DEFAULT_NIGHT_SHIFT_START_MINUTE = 0; // 00:00
const DEFAULT_NIGHT_SHIFT_END_MINUTE = 4 * 60 + 30; // 04:30
const SAME_TIMESTAMP_TELEPORT_METERS = 50;

function isValidCoordinate(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Menghitung jarak Haversine (meter) antara dua titik koordinat geografis.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toNormalizedSet(values?: string[] | Set<string>, lowercase = false): Set<string> {
  const out = new Set<string>();
  if (!values) return out;
  for (const val of values) {
    const trimmed = String(val ?? '').trim();
    if (trimmed) {
      out.add(lowercase ? trimmed.toLowerCase() : trimmed);
    }
  }
  return out;
}

function extractWallClockMinuteOfDay(
  isoTimestamp: string,
  timezoneOffsetMinutes?: number,
): { minuteOfDay: number; hm: string } | null {
  const parsedMs = Date.parse(isoTimestamp);
  if (!Number.isFinite(parsedMs)) return null;

  if (typeof timezoneOffsetMinutes === 'number' && Number.isFinite(timezoneOffsetMinutes)) {
    const shifted = new Date(parsedMs + timezoneOffsetMinutes * 60_000);
    const hours = shifted.getUTCHours();
    const minutes = shifted.getUTCMinutes();
    return {
      minuteOfDay: hours * 60 + minutes,
      hm: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
    };
  }

  // Ambil jam:menit wall-clock dari string ISO agar deterministik lintas timezone host.
  const isoMatch = String(isoTimestamp).trim().match(/^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})/);
  if (isoMatch) {
    const hours = Number(isoMatch[1]);
    const minutes = Number(isoMatch[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return {
        minuteOfDay: hours * 60 + minutes,
        hm: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      };
    }
  }

  const dt = new Date(parsedMs);
  const hours = dt.getUTCHours();
  const minutes = dt.getUTCMinutes();
  return {
    minuteOfDay: hours * 60 + minutes,
    hm: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  };
}

function isSameRecordIdentity(a: AttendanceCheckRecord, b: AttendanceCheckRecord): boolean {
  if (a === b) return true;
  if (a.id && b.id && a.id === b.id) return true;
  return false;
}

function resolveProjectGeofence(
  record: AttendanceCheckRecord,
  context: AttendanceFraudContext,
): ProjectGeofence | null {
  if (context.projectGeofence) {
    if (!context.projectGeofence.projectId || context.projectGeofence.projectId === record.projectId) {
      return context.projectGeofence;
    }
  }
  if (record.projectId && context.projectGeofencesByProjectId?.[record.projectId]) {
    return context.projectGeofencesByProjectId[record.projectId];
  }
  return null;
}

/**
 * Mengevaluasi 4 sinyal anti-kecurangan kehadiran secara deterministik:
 * 1. `buddy_punch_suspected` — deviceId sama dipakai >= 2 pekerja berbeda dalam <= 15 menit tanpa flag shared mandor device sah.
 * 2. `impossible_location_jump` — kecepatan Haversine antar check-in > 120 km/jam atau di luar radius geofence proyek.
 * 3. `abnormal_work_hours` — check-in 00:00–04:30 tanpa izin shift malam, durasi > 16 jam, atau checkOut <= checkIn.
 * 4. `reused_photo_hash` — `photoSha256` identik sudah pernah dipakai sebelumnya.
 *
 * ATURAN KERAS: catatan berflag TIDAK PERNAH ditolak diam-diam (`silentlyRejected: false`,
 * `verificationStatus: 'flagged_for_review'`, `requiresMandorOrOwnerReview: true`).
 */
export function evaluateAttendanceFraudSignals(
  record: AttendanceCheckRecord,
  context: AttendanceFraudContext = {},
): AttendanceFraudEvaluation {
  const flags: AttendanceFraudFlag[] = [];
  const reasons: string[] = [];
  const recentRecords = (context.recentRecords ?? []).filter(
    (other) => other.orgId === record.orgId && !isSameRecordIdentity(other, record),
  );

  const buddyWindowMinutes = context.buddyPunchWindowMinutes ?? DEFAULT_BUDDY_PUNCH_WINDOW_MINUTES;
  const maxTravelSpeedKmh = context.maxTravelSpeedKmh ?? DEFAULT_MAX_TRAVEL_SPEED_KMH;
  const maxDailyWorkHours = context.maxDailyWorkHours ?? DEFAULT_MAX_DAILY_WORK_HOURS;
  const nightStartMin = context.nightShiftStartMinuteOfDay ?? DEFAULT_NIGHT_SHIFT_START_MINUTE;
  const nightEndMin = context.nightShiftEndMinuteOfDay ?? DEFAULT_NIGHT_SHIFT_END_MINUTE;

  const checkInMs = Date.parse(record.checkInAt);
  const authorizedSharedDevices = toNormalizedSet(context.authorizedSharedDeviceIds);

  // 1. Buddy punch (absen titip)
  const buddyPeerSet = new Set<string>();
  const deviceId = record.deviceId ? String(record.deviceId).trim() : '';
  const sharedDeviceAuthorized =
    (record.isSharedMandorDevice === true && record.sharedDeviceApproved !== false) ||
    (Boolean(deviceId) && authorizedSharedDevices.has(deviceId) && record.sharedDeviceApproved !== false);

  if (deviceId && !sharedDeviceAuthorized && Number.isFinite(checkInMs)) {
    const windowMs = buddyWindowMinutes * 60_000;
    for (const other of recentRecords) {
      if (!other.deviceId || String(other.deviceId).trim() !== deviceId) continue;
      if (other.workerId === record.workerId) continue;
      const otherMs = Date.parse(other.checkInAt);
      if (!Number.isFinite(otherMs)) continue;
      if (Math.abs(checkInMs - otherMs) <= windowMs) {
        buddyPeerSet.add(other.workerId);
      }
    }
    if (buddyPeerSet.size >= 1) {
      flags.push('buddy_punch_suspected');
      reasons.push(
        `Perangkat "${deviceId}" dipakai oleh ${buddyPeerSet.size + 1} pekerja berbeda dalam rentang <= ${buddyWindowMinutes} menit tanpa otorisasi perangkat bersama mandor (rekan: ${[...buddyPeerSet].join(', ')}).`,
      );
    }
  }

  // 2. Impossible location jump (kecepatan Haversine > 120 km/jam atau di luar geofence)
  let maxJumpSpeedKmh: number | null = null;
  let distanceFromGeofenceMeters: number | null = null;

  if (isValidCoordinate(record.latitude, record.longitude)) {
    const lat = record.latitude as number;
    const lng = record.longitude as number;
    const locationReasons: string[] = [];

    if (Number.isFinite(checkInMs)) {
      for (const other of recentRecords) {
        if (other.workerId !== record.workerId) continue;
        if (!isValidCoordinate(other.latitude, other.longitude)) continue;
        const otherMs = Date.parse(other.checkInAt);
        if (!Number.isFinite(otherMs)) continue;

        const distMeters = calculateHaversineDistanceMeters(
          other.latitude as number,
          other.longitude as number,
          lat,
          lng,
        );
        const deltaMs = Math.abs(checkInMs - otherMs);
        if (deltaMs === 0) {
          if (distMeters > SAME_TIMESTAMP_TELEPORT_METERS) {
            maxJumpSpeedKmh = Number.POSITIVE_INFINITY;
            locationReasons.push(
              `Dua titik check-in pekerja ${record.workerId} pada waktu identik berjarak ${Math.round(distMeters)} m.`,
            );
          }
          continue;
        }

        const speedKmh = (distMeters / 1000) / (deltaMs / 3_600_000);
        if (maxJumpSpeedKmh === null || speedKmh > maxJumpSpeedKmh) {
          maxJumpSpeedKmh = Math.round(speedKmh * 100) / 100;
        }
        if (speedKmh > maxTravelSpeedKmh) {
          locationReasons.push(
            `Perpindahan lokasi ${Math.round((distMeters / 1000) * 100) / 100} km dalam ${Math.round((deltaMs / 60_000) * 10) / 10} menit (~${Math.round(speedKmh)} km/jam > batas ${maxTravelSpeedKmh} km/jam).`,
          );
        }
      }
    }

    const geofence = resolveProjectGeofence(record, context);
    if (geofence && isValidCoordinate(geofence.latitude, geofence.longitude)) {
      const distSite = calculateHaversineDistanceMeters(lat, lng, geofence.latitude, geofence.longitude);
      distanceFromGeofenceMeters = Math.round(distSite);
      if (distSite > geofence.radiusMeters) {
        locationReasons.push(
          `Titik absensi berjarak ${Math.round(distSite)} m dari lokasi proyek (melebihi radius geofence ${geofence.radiusMeters} m).`,
        );
      }
    }

    if (locationReasons.length > 0) {
      flags.push('impossible_location_jump');
      reasons.push(...locationReasons);
    }
  }

  // 3. Abnormal work hours (00:00–04:30 tanpa izin shift malam, durasi > 16 jam, atau checkOut <= checkIn)
  const wallClock = extractWallClockMinuteOfDay(record.checkInAt, context.timezoneOffsetMinutes);
  let workDurationHours: number | null = null;
  const hourReasons: string[] = [];

  if (!Number.isFinite(checkInMs)) {
    hourReasons.push(`Timestamp checkInAt tidak valid (${record.checkInAt}).`);
  } else if (wallClock) {
    const nightAllowed = Boolean(record.nightShiftApproved || context.nightShiftApproved);
    if (
      !nightAllowed &&
      wallClock.minuteOfDay >= nightStartMin &&
      wallClock.minuteOfDay <= nightEndMin
    ) {
      hourReasons.push(
        `Check-in pada pukul ${wallClock.hm} (rentang dini hari 00:00–04:30) tanpa izin shift malam.`,
      );
    }
  }

  if (record.checkOutAt != null && String(record.checkOutAt).trim() !== '') {
    const checkOutMs = Date.parse(record.checkOutAt);
    if (!Number.isFinite(checkOutMs)) {
      hourReasons.push(`Timestamp checkOutAt tidak valid (${record.checkOutAt}).`);
    } else if (Number.isFinite(checkInMs)) {
      if (checkOutMs <= checkInMs) {
        workDurationHours = Math.round(((checkOutMs - checkInMs) / 3_600_000) * 100) / 100;
        hourReasons.push(
          `Waktu checkOut (${record.checkOutAt}) lebih awal atau sama dengan checkIn (${record.checkInAt}).`,
        );
      } else {
        const hours = (checkOutMs - checkInMs) / 3_600_000;
        workDurationHours = Math.round(hours * 100) / 100;
        if (hours > maxDailyWorkHours) {
          hourReasons.push(
            `Durasi kerja ${workDurationHours} jam melebihi batas wajar ${maxDailyWorkHours} jam/hari.`,
          );
        }
      }
    }
  }

  if (
    typeof record.reportedWorkHours === 'number' &&
    Number.isFinite(record.reportedWorkHours) &&
    record.reportedWorkHours > maxDailyWorkHours
  ) {
    if (workDurationHours === null) {
      workDurationHours = record.reportedWorkHours;
    }
    hourReasons.push(
      `Jam kerja terlapor ${record.reportedWorkHours} jam melebihi batas wajar ${maxDailyWorkHours} jam/hari.`,
    );
  }

  if (hourReasons.length > 0) {
    flags.push('abnormal_work_hours');
    reasons.push(...hourReasons);
  }

  // 4. Reused photo hash (foto berulang)
  let matchedPhotoHash: string | null = null;
  const photoHash = record.photoSha256 ? String(record.photoSha256).trim().toLowerCase() : '';
  if (photoHash) {
    const knownHashes = toNormalizedSet(context.knownPhotoHashes, true);
    const matchedInRecent = recentRecords.some(
      (other) => other.photoSha256 && String(other.photoSha256).trim().toLowerCase() === photoHash,
    );
    if (knownHashes.has(photoHash) || matchedInRecent) {
      matchedPhotoHash = photoHash;
      flags.push('reused_photo_hash');
      reasons.push(
        `Hash foto kehadiran (${photoHash.slice(0, 12)}...) identik dengan catatan kehadiran sebelumnya.`,
      );
    }
  }

  const flagged = flags.length > 0;
  return {
    recordId: record.id ?? null,
    orgId: record.orgId,
    workerId: record.workerId,
    verificationStatus: flagged ? 'flagged_for_review' : 'verified',
    silentlyRejected: false,
    acceptedForReview: true,
    requiresMandorOrOwnerReview: flagged,
    flags,
    reasons,
    metrics: {
      buddyPunchPeerWorkerIds: [...buddyPeerSet],
      maxJumpSpeedKmh,
      distanceFromGeofenceMeters,
      workDurationHours,
      checkInWallClockHm: wallClock?.hm ?? null,
      matchedPhotoHash,
    },
  };
}

function buildFilteredRecord(
  record: HrdWorkerPayRecord,
  redactMoneyFields: boolean,
): FilteredHrdRecord {
  const base: FilteredHrdRecord = {
    ...record,
    flags: record.flags ? [...record.flags] : undefined,
    isRedacted: redactMoneyFields,
    redactedFields: redactMoneyFields ? [...HRD_SENSITIVE_MONEY_FIELDS] : [],
  };

  if (redactMoneyFields) {
    base.dailyRate = null;
    base.grossSalary = null;
    base.netSalary = null;
    base.kasbonBalance = null;
  }

  return base;
}

/**
 * Menyaring dan meredaksi data HRD/payroll berdasarkan 4 peran eksplisit:
 * 1. `worker`: hanya melihat baris miliknya sendiri (tarif, upah, kasbon sendiri terlihat).
 * 2. `mandor`: melihat dirinya sendiri (lengkap) + timnya (`teamWorkerIds`), namun field nominal
 *    (`dailyRate`, `grossSalary`, `netSalary`, `kasbonBalance`) milik anggota tim WAJIB di-redact (`null`).
 * 3. `pm`: melihat hari kerja (`dayFraction`, `regularHours`, `overtimeHours`, `projectId`) seluruh
 *    pekerja pada proyeknya (`projectIds`), dengan seluruh field tarif & gaji WAJIB di-redact (`null`).
 * 4. `owner` | `finance`: melihat seluruh data & nominal lengkap dalam organisasinya.
 *
 * Isolasi multi-tenant: baris lintas `orgId` selalu ditolak untuk seluruh peran.
 */
export function filterHrdRecordsByRole(
  viewer: HrdViewerContext,
  records: HrdWorkerPayRecord[],
): HrdRoleFilterResult {
  const viewerOrgId = String(viewer.orgId ?? '').trim();
  const viewerUserId = String(viewer.userId ?? '').trim();
  if (!viewerOrgId) {
    throw new Error('viewer.orgId wajib diisi untuk menyaring data HRD.');
  }
  if (!viewerUserId) {
    throw new Error('viewer.userId wajib diisi untuk menyaring data HRD.');
  }
  if (!HRD_VIEWER_ROLES.includes(viewer.role)) {
    throw new Error(`Peran HRD tidak dikenal: ${String(viewer.role)}`);
  }

  const teamSet = toNormalizedSet(viewer.teamWorkerIds);
  const projectSet = toNormalizedSet(viewer.projectIds);

  const visibleRecords: FilteredHrdRecord[] = [];
  let redactedRecordCount = 0;
  let crossOrgRejectedCount = 0;
  let excludedByScopeCount = 0;

  for (const record of records) {
    if (String(record.orgId ?? '').trim() !== viewerOrgId) {
      crossOrgRejectedCount += 1;
      continue;
    }

    if (viewer.role === 'worker') {
      if (record.workerId !== viewerUserId) {
        excludedByScopeCount += 1;
        continue;
      }
      visibleRecords.push(buildFilteredRecord(record, false));
      continue;
    }

    if (viewer.role === 'mandor') {
      const isSelf = record.workerId === viewerUserId;
      const isTeamMember = teamSet.has(record.workerId);
      if (!isSelf && !isTeamMember) {
        excludedByScopeCount += 1;
        continue;
      }
      const redact = !isSelf;
      if (redact) redactedRecordCount += 1;
      visibleRecords.push(buildFilteredRecord(record, redact));
      continue;
    }

    if (viewer.role === 'pm') {
      if (!projectSet.has(record.projectId)) {
        excludedByScopeCount += 1;
        continue;
      }
      redactedRecordCount += 1;
      visibleRecords.push(buildFilteredRecord(record, true));
      continue;
    }

    // 'owner' | 'finance'
    visibleRecords.push(buildFilteredRecord(record, false));
  }

  return {
    viewerRole: viewer.role,
    viewerUserId,
    orgId: viewerOrgId,
    records: visibleRecords,
    totalInputCount: records.length,
    visibleCount: visibleRecords.length,
    redactedRecordCount,
    crossOrgRejectedCount,
    excludedByScopeCount,
  };
}
