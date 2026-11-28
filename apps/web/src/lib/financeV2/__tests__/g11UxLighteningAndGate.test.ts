import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ACCOUNTING_JARGON_TERMS,
  assertNoAccountingJargon,
  buildMandorTeamTodayView,
  buildMorningDecisionsView,
  buildWorkerTodayView,
  createOfflineActionQueue,
  enqueueOfflineAction,
  evaluateG11UxChecklist,
  flushOfflineActionQueue,
  measureUxBurdenReduction,
  selectInitialWorkerProjectId,
  type MorningFeedItemInput,
} from '@domain/uxLightening';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKER_DASHBOARD_PATH = resolve(__dirname, '../../../pages/WorkerDashboard.tsx');
const WORKER_TIMER_PATH = resolve(__dirname, '../../../components/worker/WorkerWorkTimer.tsx');

describe('G11: UX yang Meringankan, Bahasa Sehari-hari, Antrean Offline, & Gerbang Penutup', () => {
  it('assertNoAccountingJargon menolak istilah akuntansi teknis (termasuk "debit" & "HPP") dan meloloskan bahasa lapangan', () => {
    const clean = assertNoAccountingJargon(
      'Masuk kerja di Proyek Ruko Melati. 5 hari × Rp 180.000 − potongan kasbon Rp 150.000 = terima bersih Rp 750.000.',
    );
    expect(clean.ok).toBe(true);
    expect(clean.forbiddenTermsFound).toEqual([]);

    const withDebit = assertNoAccountingJargon('Catat debit kas proyek hari ini');
    expect(withDebit.ok).toBe(false);
    expect(withDebit.forbiddenTermsFound).toContain('debit');

    const withHpp = assertNoAccountingJargon('Biaya HPP tenaga kerja naik');
    expect(withHpp.ok).toBe(false);
    expect(withHpp.forbiddenTermsFound).toContain('hpp');

    const withAll = assertNoAccountingJargon(
      'Cek debit, kredit, jurnal, HPP, liabilitas, ekuitas, akrual, aktiva, pasiva, neraca, buku besar, posting, COA, dan rekonsiliasi.',
    );
    expect(withAll.ok).toBe(false);
    expect(withAll.forbiddenTermsFound).toEqual([...ACCOUNTING_JARGON_TERMS]);
  });

  it('buildWorkerTodayView mengisi proyek otomatis dari jadwal PM (bukan proyek aktif pertama), <= 2 ketuk, tanpa ketik angka, dan transparan upah', () => {
    const projects = [
      { id: 'proj-gudang', name: 'Gudang Utama (Aktif #1)' },
      { id: 'proj-ruko', name: 'Ruko Melati' },
    ];
    const schedule = [
      {
        workerId: 'w-slamet',
        projectId: 'proj-ruko',
        projectName: 'Ruko Melati',
        workDate: '2026-11-24',
        sourceWorkItemId: 'wi-sloof',
      },
    ];

    const scheduledView = buildWorkerTodayView({
      workerId: 'w-slamet',
      workerName: 'Slamet',
      workDate: '2026-11-24',
      dailyAssignments: schedule,
      projects,
      checkedIn: false,
      workedHoursToday: 0,
      workedDaysInPeriod: 5,
      dailyRateRupiah: 180_000,
      openingKasbonRupiah: 400_000,
      maxKasbonDeductionPct: 50,
    });

    // Harus memilih Ruko Melati dari jadwal PM, bukan Gudang Utama (proyek aktif pertama)
    expect(scheduledView.projectId).toBe('proj-ruko');
    expect(scheduledView.projectName).toBe('Ruko Melati');
    expect(scheduledView.projectAutoFilledFromPlan).toBe(true);
    expect(scheduledView.requiresExplicitProjectChoice).toBe(false);
    expect(scheduledView.tapsToCheckIn).toBeLessThanOrEqual(2);
    expect(scheduledView.tapsToCheckIn).toBe(1);
    expect(scheduledView.requiresNumericTyping).toBe(false);
    expect(scheduledView.minTouchTargetPx).toBeGreaterThanOrEqual(44);

    // Transparansi upah integer rupiah: 5 * 180.000 = 900.000; potongan kasbon 400.000 (<= 50% = 450.000) -> bersih 500.000, sisa kasbon 0
    expect(scheduledView.todayWageBreakdown.grossWageRupiah).toBe(900_000);
    expect(scheduledView.todayWageBreakdown.kasbonDeductionRupiah).toBe(400_000);
    expect(scheduledView.todayWageBreakdown.netTakeHomeRupiah).toBe(500_000);
    expect(scheduledView.todayWageBreakdown.remainingKasbonRupiah).toBe(0);
    expect(scheduledView.todayWageBreakdown.formulaLabel).toContain('5 hari × Rp 180.000');
    expect(scheduledView.todayWageBreakdown.formulaLabel).toContain('potongan kasbon Rp 400.000');
    expect(scheduledView.todayWageBreakdown.formulaLabel).toContain('terima bersih Rp 500.000');
    expect(scheduledView.todayWageBreakdown.remainingKasbonLabel).toContain('Sisa kasbon: Rp 0');

    expect(assertNoAccountingJargon(JSON.stringify(scheduledView)).ok).toBe(true);

    // Tukang tanpa jadwal tidak boleh ditebak ke proyek aktif pertama
    const unassignedView = buildWorkerTodayView({
      workerId: 'w-baru',
      workerName: 'Tarjo',
      workDate: '2026-11-24',
      dailyAssignments: schedule,
      projects,
      workedDaysInPeriod: 1,
      dailyRateRupiah: 150_000,
      openingKasbonRupiah: 200_000,
      maxKasbonDeductionPct: 50,
    });
    expect(unassignedView.projectId).toBeNull();
    expect(unassignedView.projectName).toBeNull();
    expect(unassignedView.projectAutoFilledFromPlan).toBe(false);
    expect(unassignedView.requiresExplicitProjectChoice).toBe(true);
    expect(unassignedView.tapsToCheckIn).toBe(2);
    expect(unassignedView.availableProjectChoices).toHaveLength(2);
  });

  it('OfflineActionQueue menyimpan aksi saat sinyal putus, menyinkronkan kronologis saat pulih, dan menolak duplikat idempoten', async () => {
    let queue = createOfflineActionQueue();

    // Sengaja masukkan aksi lebih akhir lebih dulu untuk menguji pengurutan kronologis
    const r2 = enqueueOfflineAction(queue, {
      idempotencyKey: 'off-foto-1',
      orgId: 'org-1',
      actorId: 'w-slamet',
      actionType: 'progress_photo',
      payload: { workItemId: 'wi-1', progressPct: 100, photoHash: 'sha256-abc' },
      createdAt: '2026-11-24T09:15:00.000Z',
    });
    expect(r2.enqueued).toBe(true);
    queue = r2.queue;

    const r1 = enqueueOfflineAction(queue, {
      idempotencyKey: 'off-checkin-1',
      orgId: 'org-1',
      actorId: 'w-slamet',
      actionType: 'check_in',
      payload: { projectId: 'proj-ruko' },
      createdAt: '2026-11-24T08:00:00.000Z',
    });
    expect(r1.enqueued).toBe(true);
    queue = r1.queue;

    const r3 = enqueueOfflineAction(queue, {
      idempotencyKey: 'off-checkout-1',
      orgId: 'org-1',
      actorId: 'w-slamet',
      actionType: 'check_out',
      payload: { projectId: 'proj-ruko' },
      createdAt: '2026-11-24T17:00:00.000Z',
    });
    expect(r3.enqueued).toBe(true);
    queue = r3.queue;

    // Duplikat idempotencyKey diabaikan saat enqueue
    const dupEnqueue = enqueueOfflineAction(queue, {
      idempotencyKey: 'off-checkin-1',
      orgId: 'org-1',
      actorId: 'w-slamet',
      actionType: 'check_in',
      payload: { projectId: 'proj-ruko' },
      createdAt: '2026-11-24T08:00:05.000Z',
    });
    expect(dupEnqueue.enqueued).toBe(false);
    expect(dupEnqueue.duplicate).toBe(true);
    queue = dupEnqueue.queue;
    expect(queue.items).toHaveLength(3);

    // Saat offline, seluruh item tetap 'queued' dan sender tidak pernah dipanggil
    const delivered: string[] = [];
    const offlineFlush = await flushOfflineActionQueue(queue, {
      isOnline: false,
      sender: (action) => {
        delivered.push(action.idempotencyKey);
        return { ok: true };
      },
    });
    expect(offlineFlush.online).toBe(false);
    expect(offlineFlush.sentCount).toBe(0);
    expect(offlineFlush.remainingQueuedCount).toBe(3);
    expect(delivered).toEqual([]);
    expect(offlineFlush.queue.items.every((i) => i.status === 'queued')).toBe(true);

    // Saat sinyal kembali, terkirim urut kronologis dan menjadi 'synced'
    const onlineFlush = await flushOfflineActionQueue(offlineFlush.queue, {
      isOnline: true,
      nowIso: '2026-11-24T17:05:00.000Z',
      sender: (action) => {
        delivered.push(action.idempotencyKey);
        return { ok: true };
      },
    });
    expect(onlineFlush.online).toBe(true);
    expect(onlineFlush.sentCount).toBe(3);
    expect(onlineFlush.remainingQueuedCount).toBe(0);
    expect(onlineFlush.dispatchedOrder).toEqual(['off-checkin-1', 'off-foto-1', 'off-checkout-1']);
    expect(delivered).toEqual(['off-checkin-1', 'off-foto-1', 'off-checkout-1']);
    expect(onlineFlush.queue.items.every((i) => i.status === 'synced')).toBe(true);

    // Flush kedua kali & enqueue ulang key yang sudah synced tidak mengirim ganda
    const secondFlush = await flushOfflineActionQueue(onlineFlush.queue, {
      isOnline: true,
      sender: (action) => {
        delivered.push(action.idempotencyKey);
        return { ok: true };
      },
    });
    expect(secondFlush.sentCount).toBe(0);
    expect(secondFlush.skippedDuplicateCount).toBe(3);
    expect(delivered).toHaveLength(3);
  });

  it('buildMandorTeamTodayView menampilkan hadir/belum hadir & aksi terpadu tanpa membocorkan gaji pekerja lain maupun jargon', () => {
    const mandorView = buildMandorTeamTodayView({
      orgId: 'org-nusantara',
      mandorId: 'm-budi',
      mandorName: 'Pak Budi',
      projectId: 'proj-ruko',
      projectName: 'Ruko Melati',
      workDate: '2026-11-24',
      members: [
        {
          workerId: 'w-slamet',
          workerName: 'Slamet',
          projectId: 'proj-ruko',
          attendanceStatus: 'present',
          checkInTimeLabel: '07:55',
          dayFraction: 1,
          needsDayApproval: true,
          approvalReason: 'Pulang 30 menit lebih awal karena hujan deras',
          dailyRate: 185_000,
          grossSalary: 925_000,
          netSalary: 775_000,
          kasbonBalance: 450_000,
        },
        {
          workerId: 'w-joko',
          workerName: 'Joko',
          projectId: 'proj-ruko',
          attendanceStatus: 'absent',
          dayFraction: 0,
          needsDayApproval: false,
          dailyRate: 165_000,
          grossSalary: 495_000,
          netSalary: 495_000,
          kasbonBalance: 0,
        },
      ],
    });

    expect(mandorView.presentCount).toBe(1);
    expect(mandorView.absentCount).toBe(1);
    expect(mandorView.presentWorkers[0].workerName).toBe('Slamet');
    expect(mandorView.absentWorkers[0].workerName).toBe('Joko');
    expect(mandorView.pendingDayApprovals).toHaveLength(1);
    expect(mandorView.pendingDayApprovals[0].actions).toEqual(['Setujui Hari Kerja', 'Tolak']);
    expect(mandorView.addWorkerToProjectAction.enabled).toBe(true);
    expect(mandorView.reportProgressWithPhotoAction.requiresPhoto).toBe(true);
    expect(mandorView.reportProgressWithPhotoAction.singleButton).toBe(true);
    expect(mandorView.wageHiddenForTeam).toBe(true);

    // Pastikan nominal gaji/tarif/kasbon pekerja lain 100% tidak bocor (RBAC G8)
    for (const member of mandorView.members) {
      expect(member.dailyRate).toBeNull();
      expect(member.grossSalary).toBeNull();
      expect(member.netSalary).toBeNull();
      expect(member.kasbonBalance).toBeNull();
    }
    const serialized = JSON.stringify(mandorView);
    expect(serialized).not.toContain('185000');
    expect(serialized).not.toContain('925000');
    expect(serialized).not.toContain('450000');
    expect(serialized).not.toContain('165000');
    expect(assertNoAccountingJargon(serialized).ok).toBe(true);
  });

  it('buildMorningDecisionsView membatasi 12 item menjadi maksimal 5 keputusan penting + ringkasan item agen tanpa jargon', () => {
    const items: MorningFeedItemInput[] = [
      ...Array.from({ length: 8 }, (_, idx) => ({
        id: `human-${idx + 1}`,
        orgId: 'org-nusantara',
        title: `Persetujuan #${idx + 1}`,
        summaryReason: `Nominal belanja lapangan butuh persetujuan Anda`,
        category: 'belanja' as const,
        requiresHumanDecision: true,
        handledByAgent: false,
        priority: idx === 0 ? ('critical' as const) : idx < 4 ? ('high' as const) : ('medium' as const),
        amountRupiah: (idx + 1) * 1_500_000,
        projectName: 'Ruko Melati',
        createdAt: `2026-11-24T06:0${idx}:00.000Z`,
      })),
      ...Array.from({ length: 4 }, (_, idx) => ({
        id: `agent-${idx + 1}`,
        orgId: 'org-nusantara',
        title: `Rutin #${idx + 1}`,
        summaryReason: 'Sudah dicatat otomatis oleh asisten',
        category: 'absensi' as const,
        requiresHumanDecision: false,
        handledByAgent: true,
        priority: 'low' as const,
        createdAt: `2026-11-24T06:3${idx}:00.000Z`,
      })),
      // Item tenant lain harus tersaring
      {
        id: 'other-org-item',
        orgId: 'org-lain',
        title: 'Rahasia Tenant Lain',
        summaryReason: 'Tidak boleh muncul',
        category: 'kas',
        requiresHumanDecision: true,
        priority: 'critical',
        amountRupiah: 99_000_000,
      },
    ];

    const morningView = buildMorningDecisionsView({
      orgId: 'org-nusantara',
      asOfDate: '2026-11-24',
      items,
    });

    expect(morningView.decisions.length).toBeLessThanOrEqual(5);
    expect(morningView.decisions).toHaveLength(5);
    expect(morningView.decisions[0].id).toBe('human-1'); // critical paling atas
    expect(morningView.decisions[0].actions).toEqual(['Setujui', 'Tolak']);
    expect(morningView.decisions[0].oneTapActions).toBe(true);
    expect(morningView.totalNeedingHumanCount).toBe(8);
    expect(morningView.overflowCount).toBe(3);
    expect(morningView.handledByAgentCount).toBe(4);
    expect(JSON.stringify(morningView)).not.toContain('Rahasia Tenant Lain');
    expect(assertNoAccountingJargon(JSON.stringify(morningView)).ok).toBe(true);
  });

  it('measureUxBurdenReduction & evaluateG11UxChecklist memverifikasi seluruh standar G11 dan gagal bila ada jargon', () => {
    const burden = measureUxBurdenReduction();
    expect(burden.tasks).toHaveLength(4);
    expect(burden.allReduced).toBe(true);
    expect(burden.overallTapsSavedPct).toBeGreaterThan(70);
    expect(burden.estimatedMinutesSavedPerDay).toBeGreaterThan(20);

    const projects = [
      { id: 'proj-gudang', name: 'Gudang Utama' },
      { id: 'proj-ruko', name: 'Ruko Melati' },
    ];
    const workerView = buildWorkerTodayView({
      workerId: 'w-slamet',
      workerName: 'Slamet',
      workDate: '2026-11-24',
      dailyAssignments: [
        { workerId: 'w-slamet', projectId: 'proj-ruko', projectName: 'Ruko Melati', workDate: '2026-11-24' },
      ],
      projects,
      workedDaysInPeriod: 3,
      dailyRateRupiah: 180_000,
      openingKasbonRupiah: 200_000,
      maxKasbonDeductionPct: 50,
    });
    const workerUnassignedView = buildWorkerTodayView({
      workerId: 'w-baru',
      workerName: 'Tarjo',
      workDate: '2026-11-24',
      dailyAssignments: [],
      projects,
      workedDaysInPeriod: 1,
      dailyRateRupiah: 150_000,
      openingKasbonRupiah: 0,
    });
    const mandorView = buildMandorTeamTodayView({
      orgId: 'org-1',
      mandorId: 'm-1',
      mandorName: 'Pak Budi',
      projectId: 'proj-ruko',
      projectName: 'Ruko Melati',
      workDate: '2026-11-24',
      members: [
        {
          workerId: 'w-slamet',
          workerName: 'Slamet',
          projectId: 'proj-ruko',
          attendanceStatus: 'present',
          dayFraction: 1,
          dailyRate: 180_000,
        },
      ],
    });
    const morningView = buildMorningDecisionsView({
      orgId: 'org-1',
      asOfDate: '2026-11-24',
      items: [
        {
          id: 'd-1',
          orgId: 'org-1',
          title: 'Setujui beli semen 20 sak',
          summaryReason: 'Stok semen di Ruko Melati tinggal 3 sak',
          category: 'belanja',
          requiresHumanDecision: true,
          priority: 'high',
          amountRupiah: 1_400_000,
        },
        {
          id: 'd-2',
          orgId: 'org-1',
          title: 'Absensi harian terisi',
          summaryReason: 'Sudah dicatat otomatis',
          category: 'absensi',
          requiresHumanDecision: false,
          handledByAgent: true,
        },
      ],
    });

    const checklist = evaluateG11UxChecklist({
      workerView,
      workerUnassignedView,
      mandorView,
      morningView,
      offlineQueueCheck: {
        queuedWhileOffline: true,
        syncedWhenOnline: true,
        idempotentNoDuplicate: true,
        chronologicalOrderPreserved: true,
      },
      burdenReport: burden,
    });
    expect(checklist.ok).toBe(true);
    expect(checklist.passedCount).toBe(checklist.totalCount);
    expect(checklist.jargonViolations).toEqual([]);

    // Buktikan checklist langsung gagal jika layar pagi diselipi jargon "HPP" / "debit"
    const pollutedMorning = {
      ...morningView,
      decisions: [
        {
          ...morningView.decisions[0],
          summaryReason: 'Cek debit HPP material sebelum posting buku besar',
        },
      ],
    };
    const failedChecklist = evaluateG11UxChecklist({
      workerView,
      workerUnassignedView,
      mandorView,
      morningView: pollutedMorning,
      offlineQueueCheck: {
        queuedWhileOffline: true,
        syncedWhenOnline: true,
        idempotentNoDuplicate: true,
        chronologicalOrderPreserved: true,
      },
      burdenReport: burden,
    });
    expect(failedChecklist.ok).toBe(false);
    expect(failedChecklist.jargonViolations).toEqual(
      expect.arrayContaining(['debit', 'hpp', 'buku besar', 'posting']),
    );
  });

  it('selectInitialWorkerProjectId memilih proyek sesuai jadwal/tugas pekerja dan WorkerDashboard.tsx terhubung tanpa menebak proyek pertama', () => {
    const projects = [
      { id: 'proj-1', name: 'Proyek Aktif Pertama', status: 'active' },
      { id: 'proj-2', name: 'Proyek Ruko Melati', status: 'active' },
    ];
    const workItems = [
      {
        id: 'wi-1',
        project_id: 'proj-2',
        assigned_member_id: 'member-slamet',
        planned_start: '2026-11-20',
        planned_end: '2026-11-30',
        progress_pct: 40,
        status: 'in_progress',
      },
    ];

    // Pekerja yang ditugaskan di proj-2 harus langsung pre-fill proj-2 (bukan proj-1)
    const assigned = selectInitialWorkerProjectId({
      workerId: 'user-slamet',
      memberIds: ['member-slamet'],
      workDate: '2026-11-24',
      projects,
      workItems,
    });
    expect(assigned.projectId).toBe('proj-2');
    expect(assigned.projectName).toBe('Proyek Ruko Melati');
    expect(assigned.autoFilledFromPlan).toBe(true);
    expect(assigned.needsExplicitChoice).toBe(false);

    // Pekerja tanpa tugas/jadwal tidak boleh dipaksa ke Proyek Aktif Pertama (proj-1)
    const unassigned = selectInitialWorkerProjectId({
      workerId: 'user-baru',
      memberIds: ['member-baru'],
      workDate: '2026-11-24',
      projects,
      workItems,
    });
    expect(unassigned.projectId).toBeNull();
    expect(unassigned.autoFilledFromPlan).toBe(false);
    expect(unassigned.needsExplicitChoice).toBe(true);

    // Verifikasi statis WorkerDashboard.tsx & WorkerWorkTimer.tsx
    const dashboardSrc = readFileSync(WORKER_DASHBOARD_PATH, 'utf8');
    const timerSrc = readFileSync(WORKER_TIMER_PATH, 'utf8');
    expect(dashboardSrc).toContain('selectInitialWorkerProjectId');
    expect(dashboardSrc).not.toContain("projects.find(p => p.status === 'active') ||\n    projects[0]");
    expect(dashboardSrc).not.toContain("projects.find(p => p.status === 'active') || projects[0]");
    expect(dashboardSrc).toContain('min-h-11');
    expect(timerSrc).toContain('min-h-11');
  });
});
