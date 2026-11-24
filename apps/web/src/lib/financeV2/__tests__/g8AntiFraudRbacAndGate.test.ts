import { describe, expect, it, vi } from 'vitest';
import {
  calculateHaversineDistanceMeters,
  evaluateAttendanceFraudSignals,
  filterHrdRecordsByRole,
  type AttendanceCheckRecord,
  type AttendanceFraudContext,
  type HrdWorkerPayRecord,
} from '../../../../../../packages/domain/src/hrdGovernance';
import {
  buildDailyProjectLaborAccruals,
  computeKasbonSettlement,
  validateDailyAttendanceSplits,
  type AttendanceProjectSplitInput,
  type CompensationRateRecord,
  type LaborPolicy,
} from '../../../../../../packages/domain/src/hrdPayroll';
import { linesAreBalanced, validateJournalDimensions } from '../../../../../../packages/domain/src/journal';
import type { OrgMember } from '../../../types/onboarding';
import type { AttendanceRecord } from '../../../services/attendanceService';
import type { BonRequest, MemberCompensation } from '../../../services/payrollService';
import {
  analyzeFieldPayroll,
  confirmPayrollDisbursementBatch,
  formatWhatsAppSlip,
  preparePayrollDisbursementBatch,
} from '../../../services/aiHrdPayrollService';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '99999999-9999-4999-8999-999999999999';

const SITE_A_LAT = -6.2088; // Jakarta Pusat
const SITE_A_LNG = 106.8456;
const BANDUNG_LAT = -6.9175;
const BANDUNG_LNG = 107.6191;

describe('G8-3: Anti-Kecurangan Kehadiran, RBAC 4 Peran HRD, & Uji Gerbang Penuh G8', () => {
  describe('1. Anti-Kecurangan Kehadiran (4 Sinyal Deterministik & Tanpa Penolakan Diam-Diam)', () => {
    it('menerima catatan normal sebagai verified dengan 0 flag dan silentlyRejected=false', () => {
      const normalRecord: AttendanceCheckRecord = {
        id: 'att-normal-1',
        orgId: ORG_A,
        workerId: 'w-slamet',
        workerName: 'Slamet',
        projectId: 'proj-a',
        deviceId: 'dev-slamet-01',
        checkInAt: '2026-11-24T08:02:00+07:00',
        checkOutAt: '2026-11-24T17:00:00+07:00',
        latitude: -6.209,
        longitude: 106.8458,
        photoSha256: 'hash-slamet-20261124-normal',
      };

      const res = evaluateAttendanceFraudSignals(normalRecord, {
        projectGeofence: {
          projectId: 'proj-a',
          latitude: SITE_A_LAT,
          longitude: SITE_A_LNG,
          radiusMeters: 300,
        },
        knownPhotoHashes: ['hash-kemarin-001'],
        recentRecords: [
          {
            id: 'att-tarjo-1',
            orgId: ORG_A,
            workerId: 'w-tarjo',
            projectId: 'proj-a',
            deviceId: 'dev-tarjo-01',
            checkInAt: '2026-11-24T08:00:00+07:00',
            latitude: SITE_A_LAT,
            longitude: SITE_A_LNG,
            photoSha256: 'hash-tarjo-20261124',
          },
        ],
      });

      expect(res.verificationStatus).toBe('verified');
      expect(res.silentlyRejected).toBe(false);
      expect(res.acceptedForReview).toBe(true);
      expect(res.requiresMandorOrOwnerReview).toBe(false);
      expect(res.flags).toEqual([]);
      expect(res.reasons).toEqual([]);
    });

    it('mendeteksi buddy_punch_suspected bila deviceId sama dipakai >= 2 pekerja dalam <= 15 menit tanpa flag shared mandor device sah', () => {
      const sharedPhoneCtx: AttendanceFraudContext = {
        recentRecords: [
          {
            id: 'att-peer-1',
            orgId: ORG_A,
            workerId: 'w-tarjo',
            projectId: 'proj-a',
            deviceId: 'hp-xiaomi-01',
            checkInAt: '2026-11-24T08:00:00+07:00',
          },
        ],
      };

      const suspected = evaluateAttendanceFraudSignals(
        {
          id: 'att-buddy-2',
          orgId: ORG_A,
          workerId: 'w-slamet',
          projectId: 'proj-a',
          deviceId: 'hp-xiaomi-01',
          checkInAt: '2026-11-24T08:10:00+07:00', // selisih 10 menit
        },
        sharedPhoneCtx,
      );

      expect(suspected.verificationStatus).toBe('flagged_for_review');
      expect(suspected.silentlyRejected).toBe(false);
      expect(suspected.acceptedForReview).toBe(true);
      expect(suspected.requiresMandorOrOwnerReview).toBe(true);
      expect(suspected.flags).toContain('buddy_punch_suspected');
      expect(suspected.metrics.buddyPunchPeerWorkerIds).toContain('w-tarjo');

      // Bila perangkat mandor bersama disahkan -> lolos tanpa buddy_punch_suspected
      const authorizedShared = evaluateAttendanceFraudSignals(
        {
          id: 'att-buddy-3',
          orgId: ORG_A,
          workerId: 'w-slamet',
          projectId: 'proj-a',
          deviceId: 'hp-xiaomi-01',
          isSharedMandorDevice: true,
          sharedDeviceAuthorizedBy: 'mandor-1',
          checkInAt: '2026-11-24T08:10:00+07:00',
        },
        sharedPhoneCtx,
      );
      expect(authorizedShared.verificationStatus).toBe('verified');
      expect(authorizedShared.flags).not.toContain('buddy_punch_suspected');

      // Bila flag isSharedMandorDevice=true namun belum disahkan (sharedDeviceApproved=false) -> tetap ditandai
      const unapprovedShared = evaluateAttendanceFraudSignals(
        {
          id: 'att-buddy-4',
          orgId: ORG_A,
          workerId: 'w-slamet',
          projectId: 'proj-a',
          deviceId: 'hp-xiaomi-01',
          isSharedMandorDevice: true,
          sharedDeviceApproved: false,
          checkInAt: '2026-11-24T08:10:00+07:00',
        },
        sharedPhoneCtx,
      );
      expect(unapprovedShared.verificationStatus).toBe('flagged_for_review');
      expect(unapprovedShared.flags).toContain('buddy_punch_suspected');
    });

    it('mendeteksi impossible_location_jump via kecepatan Haversine > 120 km/jam maupun di luar geofence wajar', () => {
      const distKm = calculateHaversineDistanceMeters(SITE_A_LAT, SITE_A_LNG, BANDUNG_LAT, BANDUNG_LNG) / 1000;
      expect(distKm).toBeGreaterThan(100);

      // 1) Teleportasi Jakarta -> Bandung dalam 15 menit (> 400 km/jam)
      const teleport = evaluateAttendanceFraudSignals(
        {
          id: 'att-jump-2',
          orgId: ORG_A,
          workerId: 'w-budi',
          projectId: 'proj-b',
          checkInAt: '2026-11-24T08:15:00+07:00',
          latitude: BANDUNG_LAT,
          longitude: BANDUNG_LNG,
        },
        {
          recentRecords: [
            {
              id: 'att-jump-1',
              orgId: ORG_A,
              workerId: 'w-budi',
              projectId: 'proj-a',
              checkInAt: '2026-11-24T08:00:00+07:00',
              latitude: SITE_A_LAT,
              longitude: SITE_A_LNG,
            },
          ],
        },
      );

      expect(teleport.verificationStatus).toBe('flagged_for_review');
      expect(teleport.silentlyRejected).toBe(false);
      expect(teleport.requiresMandorOrOwnerReview).toBe(true);
      expect(teleport.flags).toContain('impossible_location_jump');
      expect(teleport.metrics.maxJumpSpeedKmh).toBeGreaterThan(120);

      // 2) Di luar radius geofence proyek (berjarak ~2.2 km dari radius 300 m)
      const outsideGeofence = evaluateAttendanceFraudSignals(
        {
          id: 'att-offsite-1',
          orgId: ORG_A,
          workerId: 'w-budi',
          projectId: 'proj-a',
          checkInAt: '2026-11-24T08:00:00+07:00',
          latitude: -6.2288,
          longitude: 106.8456,
        },
        {
          projectGeofence: {
            projectId: 'proj-a',
            latitude: SITE_A_LAT,
            longitude: SITE_A_LNG,
            radiusMeters: 300,
          },
        },
      );

      expect(outsideGeofence.verificationStatus).toBe('flagged_for_review');
      expect(outsideGeofence.silentlyRejected).toBe(false);
      expect(outsideGeofence.flags).toContain('impossible_location_jump');
      expect(outsideGeofence.metrics.distanceFromGeofenceMeters).toBeGreaterThan(300);
    });

    it('mendeteksi abnormal_work_hours (00:00-04:30 tanpa izin shift malam, durasi > 16 jam, dan checkOut <= checkIn)', () => {
      // 1) Check-in dini hari 02:15 tanpa izin shift malam
      const midnightCheckIn = evaluateAttendanceFraudSignals({
        id: 'att-night-1',
        orgId: ORG_A,
        workerId: 'w-slamet',
        checkInAt: '2026-11-24T02:15:00+07:00',
      });
      expect(midnightCheckIn.verificationStatus).toBe('flagged_for_review');
      expect(midnightCheckIn.silentlyRejected).toBe(false);
      expect(midnightCheckIn.flags).toContain('abnormal_work_hours');

      // Dengan izin shift malam -> tidak flagged
      const approvedNightShift = evaluateAttendanceFraudSignals({
        id: 'att-night-2',
        orgId: ORG_A,
        workerId: 'w-slamet',
        checkInAt: '2026-11-24T02:15:00+07:00',
        checkOutAt: '2026-11-24T09:15:00+07:00',
        nightShiftApproved: true,
      });
      expect(approvedNightShift.verificationStatus).toBe('verified');

      // 2) Durasi kerja > 16 jam (18 jam)
      const over16Hours = evaluateAttendanceFraudSignals({
        id: 'att-long-1',
        orgId: ORG_A,
        workerId: 'w-slamet',
        checkInAt: '2026-11-24T06:00:00+07:00',
        checkOutAt: '2026-11-25T00:00:00+07:00',
      });
      expect(over16Hours.verificationStatus).toBe('flagged_for_review');
      expect(over16Hours.silentlyRejected).toBe(false);
      expect(over16Hours.flags).toContain('abnormal_work_hours');
      expect(over16Hours.metrics.workDurationHours).toBe(18);

      // 3) checkOut <= checkIn
      const invertedTimes = evaluateAttendanceFraudSignals({
        id: 'att-inv-1',
        orgId: ORG_A,
        workerId: 'w-slamet',
        checkInAt: '2026-11-24T17:00:00+07:00',
        checkOutAt: '2026-11-24T08:00:00+07:00',
      });
      expect(invertedTimes.verificationStatus).toBe('flagged_for_review');
      expect(invertedTimes.silentlyRejected).toBe(false);
      expect(invertedTimes.flags).toContain('abnormal_work_hours');
    });

    it('mendeteksi reused_photo_hash bila photoSha256 sudah pernah dipakai sebelumnya & menggabungkan multi-flag tanpa penolakan diam-diam', () => {
      const reused = evaluateAttendanceFraudSignals(
        {
          id: 'att-photo-2',
          orgId: ORG_A,
          workerId: 'w-budi',
          deviceId: 'dev-shared-09',
          checkInAt: '2026-11-24T01:45:00+07:00', // juga dini hari 01:45
          photoSha256: 'AABBCCDD11223344556677889900',
        },
        {
          knownPhotoHashes: ['aabbccdd11223344556677889900'],
          recentRecords: [
            {
              id: 'att-peer-9',
              orgId: ORG_A,
              workerId: 'w-tarjo',
              deviceId: 'dev-shared-09',
              checkInAt: '2026-11-24T01:40:00+07:00',
            },
          ],
        },
      );

      expect(reused.verificationStatus).toBe('flagged_for_review');
      expect(reused.silentlyRejected).toBe(false);
      expect(reused.acceptedForReview).toBe(true);
      expect(reused.requiresMandorOrOwnerReview).toBe(true);
      expect(reused.flags).toEqual(
        expect.arrayContaining([
          'buddy_punch_suspected',
          'abnormal_work_hours',
          'reused_photo_hash',
        ]),
      );
      expect(reused.reasons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('2. RBAC 4 Peran HRD (worker, mandor, pm, owner/finance) & Isolasi Lintas orgId', () => {
    const mixedRecords: HrdWorkerPayRecord[] = [
      {
        id: 'rec-1',
        orgId: ORG_A,
        workerId: 'w-slamet',
        workerName: 'Slamet',
        projectId: 'proj-a',
        projectName: 'Renovasi Ruko',
        workDate: '2026-11-24',
        dayFraction: 1,
        regularHours: 8,
        overtimeHours: 1,
        dailyRate: 200_000,
        grossSalary: 237_500,
        netSalary: 187_500,
        kasbonBalance: 300_000,
        verificationStatus: 'verified',
      },
      {
        id: 'rec-2',
        orgId: ORG_A,
        workerId: 'w-tarjo',
        workerName: 'Tarjo',
        projectId: 'proj-a',
        projectName: 'Renovasi Ruko',
        workDate: '2026-11-24',
        dayFraction: 0.5,
        regularHours: 4,
        overtimeHours: 0,
        dailyRate: 160_000,
        grossSalary: 80_000,
        netSalary: 80_000,
        kasbonBalance: 0,
        verificationStatus: 'verified',
      },
      {
        id: 'rec-3',
        orgId: ORG_A,
        workerId: 'mandor-1',
        workerName: 'Pak Mandor',
        projectId: 'proj-a',
        projectName: 'Renovasi Ruko',
        workDate: '2026-11-24',
        dayFraction: 1,
        regularHours: 8,
        overtimeHours: 0,
        dailyRate: 300_000,
        grossSalary: 300_000,
        netSalary: 300_000,
        kasbonBalance: 0,
        verificationStatus: 'verified',
      },
      {
        id: 'rec-4',
        orgId: ORG_A,
        workerId: 'w-budi',
        workerName: 'Budi (Tim Lain)',
        projectId: 'proj-b',
        projectName: 'Gudang Cikarang',
        workDate: '2026-11-24',
        dayFraction: 1,
        regularHours: 8,
        overtimeHours: 0,
        dailyRate: 180_000,
        grossSalary: 180_000,
        netSalary: 180_000,
        kasbonBalance: 100_000,
        verificationStatus: 'flagged_for_review',
        flags: ['buddy_punch_suspected'],
      },
      {
        id: 'rec-cross-org',
        orgId: ORG_B,
        workerId: 'w-slamet', // ID pekerja kebetulan sama, namun milik org lain
        workerName: 'Slamet Org Lain',
        projectId: 'proj-a',
        projectName: 'Proyek Org B',
        workDate: '2026-11-24',
        dayFraction: 1,
        regularHours: 8,
        overtimeHours: 0,
        dailyRate: 999_000,
        grossSalary: 999_000,
        netSalary: 999_000,
        kasbonBalance: 500_000,
      },
    ];

    it('peran worker: hanya melihat miliknya sendiri (tarif/upah/kasbon terlihat) tanpa kebocoran pekerja atau org lain', () => {
      const res = filterHrdRecordsByRole(
        { userId: 'w-slamet', orgId: ORG_A, role: 'worker' },
        mixedRecords,
      );

      expect(res.crossOrgRejectedCount).toBe(1);
      expect(res.visibleCount).toBe(1);
      expect(res.records).toHaveLength(1);
      expect(res.records[0].workerId).toBe('w-slamet');
      expect(res.records[0].orgId).toBe(ORG_A);
      expect(res.records[0].isRedacted).toBe(false);
      expect(res.records[0].dailyRate).toBe(200_000);
      expect(res.records[0].netSalary).toBe(187_500);
      expect(res.records[0].kasbonBalance).toBe(300_000);
    });

    it('peran mandor: melihat dirinya sendiri (lengkap) + timnya dengan field nominal WAJIB null', () => {
      const res = filterHrdRecordsByRole(
        {
          userId: 'mandor-1',
          orgId: ORG_A,
          role: 'mandor',
          teamWorkerIds: ['w-slamet', 'w-tarjo'],
        },
        mixedRecords,
      );

      expect(res.crossOrgRejectedCount).toBe(1);
      expect(res.visibleCount).toBe(3); // mandor-1 + w-slamet + w-tarjo (w-budi tidak masuk tim)
      expect(res.records.some((r) => r.workerId === 'w-budi')).toBe(false);

      const selfRow = res.records.find((r) => r.workerId === 'mandor-1')!;
      expect(selfRow.isRedacted).toBe(false);
      expect(selfRow.dailyRate).toBe(300_000);
      expect(selfRow.grossSalary).toBe(300_000);
      expect(selfRow.netSalary).toBe(300_000);

      const slametRow = res.records.find((r) => r.workerId === 'w-slamet')!;
      expect(slametRow.isRedacted).toBe(true);
      expect(slametRow.redactedFields).toEqual([
        'dailyRate',
        'grossSalary',
        'netSalary',
        'kasbonBalance',
      ]);
      expect(slametRow.dailyRate).toBeNull();
      expect(slametRow.grossSalary).toBeNull();
      expect(slametRow.netSalary).toBeNull();
      expect(slametRow.kasbonBalance).toBeNull();
      expect(slametRow.dayFraction).toBe(1);
      expect(slametRow.projectId).toBe('proj-a');

      const tarjoRow = res.records.find((r) => r.workerId === 'w-tarjo')!;
      expect(tarjoRow.dailyRate).toBeNull();
      expect(tarjoRow.grossSalary).toBeNull();
      expect(tarjoRow.netSalary).toBeNull();
      expect(tarjoRow.kasbonBalance).toBeNull();
    });

    it('peran pm: melihat hari kerja seluruh pekerja pada proyeknya dengan seluruh field tarif & gaji WAJIB null', () => {
      const res = filterHrdRecordsByRole(
        {
          userId: 'pm-1',
          orgId: ORG_A,
          role: 'pm',
          projectIds: ['proj-a'],
        },
        mixedRecords,
      );

      expect(res.crossOrgRejectedCount).toBe(1);
      expect(res.visibleCount).toBe(3); // seluruh pekerja pada proj-a (Slamet, Tarjo, Mandor)
      expect(res.records.every((r) => r.projectId === 'proj-a')).toBe(true);
      expect(res.records.every((r) => r.isRedacted)).toBe(true);
      for (const row of res.records) {
        expect(row.dayFraction).toBeGreaterThan(0);
        expect(row.regularHours).toBeGreaterThan(0);
        expect(row.dailyRate).toBeNull();
        expect(row.grossSalary).toBeNull();
        expect(row.netSalary).toBeNull();
        expect(row.kasbonBalance).toBeNull();
      }
    });

    it('peran owner & finance: melihat seluruh data & nominal lengkap dalam organisasinya sambil menolak lintas orgId', () => {
      for (const role of ['owner', 'finance'] as const) {
        const res = filterHrdRecordsByRole(
          { userId: `${role}-1`, orgId: ORG_A, role },
          mixedRecords,
        );

        expect(res.crossOrgRejectedCount).toBe(1);
        expect(res.visibleCount).toBe(4);
        expect(res.redactedRecordCount).toBe(0);
        expect(res.records.every((r) => r.orgId === ORG_A)).toBe(true);
        expect(res.records.every((r) => !r.isRedacted)).toBe(true);
        const slamet = res.records.find((r) => r.workerId === 'w-slamet')!;
        expect(slamet.dailyRate).toBe(200_000);
        expect(slamet.netSalary).toBe(187_500);
      }
    });
  });

  describe('3. Uji Integrasi Gerbang Penuh G8 (Merangkai G8-1 + G8-2 + G8-3)', () => {
    it('menjaga paritas total upah proyek === debit hpp_labor, bagi 2 proyek, kasbon bersaldo, missing_rate, anti-fraud, RBAC, & tanpa klaim lunas palsu', async () => {
      const workDate = '2026-11-24';
      const laborPolicy: LaborPolicy = {
        standardWorkDaysPerMonth: 25,
        standardHoursPerDay: 8,
        overtimeMultiplier: 1.5,
        maxKasbonDeductionPct: 30,
      };

      // A. G8-3 Anti-Kecurangan Kehadiran: 2 normal (Slamet, Tarjo) + 1 flagged (Budi) tanpa ditolak diam-diam
      const checkSlamet = evaluateAttendanceFraudSignals({
        id: 'att-g8-slamet',
        orgId: ORG_A,
        workerId: 'w-slamet',
        projectId: 'proj-a',
        deviceId: 'dev-slamet',
        checkInAt: '2026-11-24T08:00:00+07:00',
        checkOutAt: '2026-11-24T17:00:00+07:00',
        latitude: SITE_A_LAT,
        longitude: SITE_A_LNG,
        photoSha256: 'photo-slamet-01',
      });
      const checkTarjo = evaluateAttendanceFraudSignals({
        id: 'att-g8-tarjo',
        orgId: ORG_A,
        workerId: 'w-tarjo',
        projectId: 'proj-a',
        deviceId: 'dev-tarjo',
        checkInAt: '2026-11-24T08:02:00+07:00',
        checkOutAt: '2026-11-24T17:00:00+07:00',
        latitude: SITE_A_LAT,
        longitude: SITE_A_LNG,
        photoSha256: 'photo-tarjo-01',
      });
      const checkBudi = evaluateAttendanceFraudSignals(
        {
          id: 'att-g8-budi',
          orgId: ORG_A,
          workerId: 'w-budi',
          projectId: 'proj-b',
          deviceId: 'dev-tarjo', // device sama dengan Tarjo dalam 5 menit!
          checkInAt: '2026-11-24T08:05:00+07:00',
          photoSha256: 'photo-tarjo-01', // foto identik dengan Tarjo!
        },
        {
          recentRecords: [
            {
              id: 'att-g8-tarjo',
              orgId: ORG_A,
              workerId: 'w-tarjo',
              projectId: 'proj-a',
              deviceId: 'dev-tarjo',
              checkInAt: '2026-11-24T08:02:00+07:00',
              photoSha256: 'photo-tarjo-01',
            },
          ],
        },
      );

      expect(checkSlamet.verificationStatus).toBe('verified');
      expect(checkTarjo.verificationStatus).toBe('verified');
      expect(checkBudi.verificationStatus).toBe('flagged_for_review');
      expect(checkBudi.silentlyRejected).toBe(false);
      expect(checkBudi.requiresMandorOrOwnerReview).toBe(true);
      expect(checkBudi.flags).toEqual(
        expect.arrayContaining(['buddy_punch_suspected', 'reused_photo_hash']),
      );

      // B. G8-2 Pembagian 1 hari kerja Slamet ke 2 proyek (0.5 + 0.5 = 1.0) + Tarjo (1.0) + Budi (missing_rate)
      const splits: AttendanceProjectSplitInput[] = [
        {
          id: 'sp-1',
          workerId: 'w-slamet',
          workerName: 'Slamet',
          partyId: 'party-slamet',
          role: 'Tukang Batu',
          projectId: 'proj-a',
          projectName: 'Renovasi Ruko',
          workDate,
          dayFraction: 0.5,
          regularHours: 4,
          verificationStatus: checkSlamet.verificationStatus,
        },
        {
          id: 'sp-2',
          workerId: 'w-slamet',
          workerName: 'Slamet',
          partyId: 'party-slamet',
          role: 'Tukang Batu',
          projectId: 'proj-b',
          projectName: 'Gudang Cikarang',
          workDate,
          dayFraction: 0.5,
          regularHours: 4,
          verificationStatus: checkSlamet.verificationStatus,
        },
        {
          id: 'sp-3',
          workerId: 'w-tarjo',
          workerName: 'Tarjo',
          partyId: 'party-tarjo',
          role: 'Helper',
          projectId: 'proj-a',
          projectName: 'Renovasi Ruko',
          workDate,
          dayFraction: 1,
          regularHours: 8,
          verificationStatus: checkTarjo.verificationStatus,
        },
        {
          id: 'sp-4',
          workerId: 'w-budi',
          workerName: 'Budi',
          partyId: 'party-budi',
          role: 'Tukang Cat', // belum ada tarif!
          projectId: 'proj-b',
          projectName: 'Gudang Cikarang',
          workDate,
          dayFraction: 1,
          regularHours: 8,
          verificationStatus: checkBudi.verificationStatus,
        },
      ];

      expect(validateDailyAttendanceSplits(splits).ok).toBe(true);

      const rateHistory: CompensationRateRecord[] = [
        {
          id: 'rate-slamet',
          workerId: 'w-slamet',
          rateType: 'daily',
          rateRupiah: 200_000,
          effectiveFrom: '2026-11-01',
        },
        {
          id: 'rate-tarjo',
          workerId: 'w-tarjo',
          rateType: 'daily',
          rateRupiah: 150_000, // resmi untuk Tarjo, bukan fallback
          effectiveFrom: '2026-11-01',
        },
      ];

      const accrual = buildDailyProjectLaborAccruals(splits, rateHistory, laborPolicy);
      expect(accrual.ok).toBe(true);
      expect(accrual.status).toBe('partial_missing_rate');
      expect(accrual.missingRateSplits).toHaveLength(1);
      expect(accrual.missingRateSplits[0].workerId).toBe('w-budi');
      expect(accrual.missingRateQuestions[0]).toContain('w-budi');

      // Cek paritas keras: total upah per proyek dari kehadiran === total debit hpp_labor di buku besar
      // Slamet: 0.5 * 200rb = 100rb (proj-a) + 0.5 * 200rb = 100rb (proj-b)
      // Tarjo: 1.0 * 150rb = 150rb (proj-a)
      // Budi: missing_rate -> 0 (tidak diposting)
      const hppDebitByProject: Record<string, number> = {};
      for (const line of accrual.ledgerLines) {
        if (line.accountType === 'hpp_labor' && line.projectId) {
          hppDebitByProject[line.projectId] = (hppDebitByProject[line.projectId] ?? 0) + line.debit;
        }
      }
      expect(accrual.totalsByProject).toEqual({
        'proj-a': 250_000,
        'proj-b': 100_000,
      });
      expect(hppDebitByProject).toEqual(accrual.totalsByProject);
      expect(linesAreBalanced(accrual.ledgerLines)).toBe(true);
      expect(validateJournalDimensions(accrual.ledgerLines).ok).toBe(true);

      // C. G8-2 Kasbon bersaldo untuk Slamet: kasbon Rp 600.000, upah Rp 200.000, maks potong 30% = Rp 60.000
      const kasbonSlamet = computeKasbonSettlement(
        600_000,
        accrual.totalsByWorker['w-slamet'],
        laborPolicy.maxKasbonDeductionPct,
      );
      expect(kasbonSlamet.deductedAmount).toBe(60_000);
      expect(kasbonSlamet.netCashPayout).toBe(140_000);
      expect(kasbonSlamet.remainingKasbonBalance).toBe(540_000);
      expect(kasbonSlamet.deductedAmount + kasbonSlamet.remainingKasbonBalance).toBe(600_000);
      expect(kasbonSlamet.isBalanced).toBe(true);

      // D. G8-1 Analisis & Persiapan Pembayaran: missing_rate wajib terdeteksi untuk Budi;
      //    batch pembayaran tanpa konfirmasi nyata TIDAK BOLEH berstatus 'paid' / 'LUNAS'
      const members: OrgMember[] = [
        {
          id: 'm-slamet',
          org_id: ORG_A,
          user_id: 'w-slamet',
          role: 'worker',
          status: 'active',
          position: 'Tukang Batu',
          profile: { name: 'Slamet' },
          bank_name: 'BCA',
          bank_account: '1122334455',
          bank_holder: 'Slamet',
        },
        {
          id: 'm-budi',
          org_id: ORG_A,
          user_id: 'w-budi',
          role: 'worker',
          status: 'active',
          position: 'Tukang Cat',
          profile: { name: 'Budi' },
        },
      ];
      const attSvcRecords: AttendanceRecord[] = [
        {
          id: 'att-1',
          user_id: 'w-slamet',
          user_name: 'Slamet',
          org_id: ORG_A,
          type: 'check_in',
          timestamp: '2026-11-24T08:00:00Z',
        },
        {
          id: 'att-2',
          user_id: 'w-budi',
          user_name: 'Budi',
          org_id: ORG_A,
          type: 'check_in',
          timestamp: '2026-11-24T08:05:00Z',
        },
      ];
      const comps: MemberCompensation[] = [
        {
          id: 'c-slamet',
          member_id: 'm-slamet',
          org_id: ORG_A,
          user_id: 'w-slamet',
          salary_type: 'daily',
          daily_rate: 200_000,
          monthly_salary: 0,
          currency: 'IDR',
          updated_at: '2026-11-01T00:00:00Z',
        },
      ];
      const bons: BonRequest[] = [
        {
          id: 'bon-slamet',
          org_id: ORG_A,
          user_id: 'w-slamet',
          amount: 600_000,
          reason: 'Kasbon keluarga',
          status: 'approved',
          created_at: '2026-11-10T00:00:00Z',
        },
      ];

      const analysis = analyzeFieldPayroll({
        budget: {
          budgetAmount: 5_000_000,
          sourceAccount: 'kas_lapangan',
          periodLabel: '24 Nov 2026',
          notes: 'Upah proyek',
          managerName: 'Pak Mandor',
        },
        members,
        attendanceRecords: attSvcRecords,
        compensationList: comps,
        bonRequests: bons,
        laborPolicy: {
          standardWorkDaysPerMonth: 25,
          overtimeThresholdDays: 24,
          overtimeMultiplier: 1.5,
          maxKasbonDeductionPct: 30,
        },
      });

      const budiCalc = analysis.calculations.find((c) => c.userId === 'w-budi')!;
      expect(budiCalc.rateStatus).toBe('missing_rate');
      expect(budiCalc.requiresRateQuestion).toBe(true);
      expect(budiCalc.baseRate).toBe(0); // tidak memakai fallback 150.000
      expect(analysis.summary.isReadyForDisbursement).toBe(false);

      const slametCalc = analysis.calculations.find((c) => c.userId === 'w-slamet')!;
      slametCalc.payrollEntryId = '44444444-4444-4444-8444-444444444444';
      expect(slametCalc.appliedKasbonDeduction).toBe(60_000);
      expect(slametCalc.remainingKasbonBalance).toBe(540_000);
      expect(slametCalc.netSalary).toBe(140_000);

      // Tahap persiapan: tidak ada status 'lunas' / 'paid'
      const prepared = await preparePayrollDisbursementBatch({
        orgId: ORG_A,
        budget: {
          budgetAmount: 5_000_000,
          sourceAccount: 'kas_lapangan',
          periodLabel: '24 Nov 2026',
          notes: 'Upah proyek',
          managerName: 'Pak Mandor',
        },
        items: [slametCalc],
        actorId: 'finance-1',
        preparedBy: 'finance-1',
        skipDbSync: true,
      });

      expect(prepared.status).toBe('awaiting_payment_confirmation');
      expect(prepared.paymentConfirmed).toBe(false);
      const pendingSlip = formatWhatsAppSlip(prepared.items[0], '24 Nov 2026');
      expect(pendingSlip).toContain('MENUNGGU KONFIRMASI PEMBAYARAN');
      expect(pendingSlip.toLowerCase()).not.toContain('lunas');
      expect(pendingSlip.toLowerCase()).not.toContain('berhasil ditransfer');

      // Tahap konfirmasi nyata oleh Owner (SoD: owner-1 !== finance-1) + posting jurnal sukses
      const mockPostPayroll = vi.fn().mockResolvedValue({ journalId: 'jrn-payroll-g8-1' });
      const confirmed = await confirmPayrollDisbursementBatch({
        orgId: ORG_A,
        budget: {
          budgetAmount: 5_000_000,
          sourceAccount: 'kas_lapangan',
          periodLabel: '24 Nov 2026',
          notes: 'Upah proyek',
          managerName: 'Pak Mandor',
        },
        items: prepared.items,
        actorId: 'owner-1',
        preparedBy: 'finance-1',
        batchRef: prepared.batchRef,
        skipDbSync: true,
        paymentConfirmation: {
          kind: 'manual_owner_confirmation',
          confirmedBy: 'owner-1',
          confirmedAt: '2026-11-24T18:00:00+07:00',
          paymentMethod: 'bank_transfer',
          proofNote: 'Mutasi BCA Ref #88912',
        },
        deps: {
          postPayrollDisbursementJournal: mockPostPayroll,
        },
      });

      expect(confirmed.status).toBe('paid');
      expect(confirmed.paymentConfirmed).toBe(true);
      expect(mockPostPayroll).toHaveBeenCalledTimes(1);
      const paidSlip = formatWhatsAppSlip(confirmed.items[0], '24 Nov 2026');
      expect(paidSlip).toContain('LUNAS (TERKONFIRMASI)');

      // E. G8-3 RBAC pada hasil akhir: PM & Mandor tidak pernah melihat tarif/gaji pekerja lain
      const finalPayViewRows: HrdWorkerPayRecord[] = [
        {
          id: 'pay-slamet-a',
          orgId: ORG_A,
          workerId: 'w-slamet',
          workerName: 'Slamet',
          projectId: 'proj-a',
          workDate,
          dayFraction: 0.5,
          regularHours: 4,
          overtimeHours: 0,
          dailyRate: 200_000,
          grossSalary: 100_000,
          netSalary: 70_000,
          kasbonBalance: kasbonSlamet.remainingKasbonBalance,
          verificationStatus: checkSlamet.verificationStatus,
        },
        {
          id: 'pay-budi-b',
          orgId: ORG_A,
          workerId: 'w-budi',
          workerName: 'Budi',
          projectId: 'proj-b',
          workDate,
          dayFraction: 1,
          regularHours: 8,
          overtimeHours: 0,
          dailyRate: null,
          grossSalary: null,
          netSalary: null,
          kasbonBalance: 0,
          verificationStatus: checkBudi.verificationStatus,
          flags: checkBudi.flags,
        },
      ];

      const pmView = filterHrdRecordsByRole(
        { userId: 'pm-1', orgId: ORG_A, role: 'pm', projectIds: ['proj-a'] },
        finalPayViewRows,
      );
      expect(pmView.records).toHaveLength(1);
      expect(pmView.records[0].dayFraction).toBe(0.5);
      expect(pmView.records[0].dailyRate).toBeNull();
      expect(pmView.records[0].grossSalary).toBeNull();
      expect(pmView.records[0].netSalary).toBeNull();
      expect(pmView.records[0].kasbonBalance).toBeNull();

      const ownerView = filterHrdRecordsByRole(
        { userId: 'owner-1', orgId: ORG_A, role: 'owner' },
        finalPayViewRows,
      );
      expect(ownerView.records).toHaveLength(2);
      expect(ownerView.records[0].kasbonBalance).toBe(540_000);
      expect(ownerView.records[1].verificationStatus).toBe('flagged_for_review');
    });
  });
});
