import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildDailyProjectReport,
  closeTodoWithProof,
  createTodoFromIssue,
  deriveDailyPlanFromSchedule,
  evaluateDelayAndTerminImpact,
  evaluateLaborProductivityAndEac,
  evaluateMaterialAndPurchaseDrafts,
  evaluateProgressUpdateRequest,
  type PmWorkItemScheduleInput,
} from '@domain/projectManagerAgent';
import {
  buildDailyProjectLaborAccruals,
  resolveAttendanceProjectFromSchedule,
  type AttendanceProjectSplitInput,
  type CompensationRateRecord,
  type LaborPolicy,
} from '@domain/hrdPayroll';
import {
  linesAreBalanced,
  validateJournalDimensions,
} from '@domain/journal';
import { computeRecognizableRevenue } from '@domain/revenueRecognition';
import {
  runAdvisorWhatIf,
  type ForecastCashFlowInput,
} from '@domain/financialAdvisor';
import { validateWorkerProgressUpdate } from '../../workerProgressGuard';

const DAY_MS = 86_400_000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKER_DASHBOARD_PATH = resolve(__dirname, '../../../pages/WorkerDashboard.tsx');

function ymdForDayIndex(day1Based: number): string {
  const baseMs = Date.UTC(2026, 10, 1); // 2026-11-01
  const dt = new Date(baseMs + (day1Based - 1) * DAY_MS);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

describe('G9: Agen Project Manager & Simulasi Proyek 30 Hari End-to-End', () => {
  it('menolak pekerja menandai 100% tanpa foto/persetujuan di domain maupun guard UI WorkerDashboard', () => {
    const domainReject = evaluateProgressUpdateRequest({
      workItemId: 'wi-pondasi',
      workItemName: 'Pondasi & Sloof',
      currentProgressPct: 75,
      requestedProgressPct: 100,
      actorId: 'tukang-1',
      actorRole: 'worker',
      asOfDate: '2026-11-10',
    });
    expect(domainReject.ok).toBe(false);
    expect(domainReject.status).toBe('rejected_requires_proof');
    expect(domainReject.reason).toBe('photo_or_supervisor_approval_required');
    expect(domainReject.canMarkCompleted).toBe(false);
    expect(domainReject.effectiveProgressPct).toBe(75);

    // Worker mencoba self-approve (pelanggaran SoD) harus tetap ditolak
    const selfApproveReject = evaluateProgressUpdateRequest({
      workItemId: 'wi-pondasi',
      currentProgressPct: 75,
      requestedProgressPct: 100,
      actorId: 'tukang-1',
      actorRole: 'worker',
      approvedBy: 'tukang-1',
      approvedByRole: 'mandor',
    });
    expect(selfApproveReject.ok).toBe(false);
    expect(selfApproveReject.status).toBe('rejected_requires_proof');
    expect(selfApproveReject.sodViolation).toBe(true);

    // Guard UI WorkerDashboard menegakkan aturan yang sama
    const uiDecision = validateWorkerProgressUpdate({
      workItem: {
        id: 'wi-pondasi',
        name: 'Pondasi & Sloof',
        progress_pct: 75,
        status: 'in_progress',
      },
      requestedProgressPct: 100,
      actorId: 'tukang-1',
      actorRole: 'worker',
    });
    expect(uiDecision.allowedToPersist).toBe(false);
    expect(uiDecision.requiresPhotoModal).toBe(true);
    expect(uiDecision.nextStatus).toBe('in_progress');
    expect(uiDecision.nextProgressPct).toBe(75);

    // Worker unggah foto tanpa approval mandor -> pending_supervisor_verification (bukan 100% completed)
    const uiWithPhoto = validateWorkerProgressUpdate({
      workItem: {
        id: 'wi-pondasi',
        name: 'Pondasi & Sloof',
        progress_pct: 75,
        status: 'in_progress',
      },
      requestedProgressPct: 100,
      actorId: 'tukang-1',
      actorRole: 'worker',
      photoAttachmentHash: 'sha256-foto-pondasi-01',
      photoFileName: 'pondasi-selesai.jpg',
    });
    expect(uiWithPhoto.allowedToPersist).toBe(true);
    expect(uiWithPhoto.evaluation.status).toBe('pending_supervisor_verification');
    expect(uiWithPhoto.nextStatus).toBe('in_progress');
    expect(uiWithPhoto.nextProgressPct).toBeLessThan(100);
    expect(uiWithPhoto.nextAttachments?.length).toBe(1);
    expect(uiWithPhoto.nextNotes?.[0]?.text).toContain('MENUNGGU VERIFIKASI MANDOR/PM');

    // Mandor menyetujui dengan foto -> approved 100% completed
    const approved = evaluateProgressUpdateRequest({
      workItemId: 'wi-pondasi',
      currentProgressPct: 75,
      requestedProgressPct: 100,
      actorId: 'tukang-1',
      actorRole: 'worker',
      photoAttachmentHash: 'sha256-foto-pondasi-01',
      approvedBy: 'mandor-1',
      approvedByRole: 'mandor',
    });
    expect(approved.ok).toBe(true);
    expect(approved.status).toBe('approved');
    expect(approved.effectiveProgressPct).toBe(100);
    expect(approved.canMarkCompleted).toBe(true);
  });

  it('menghitung produktivitas & EAC upah serta memicu labor_overrun dan progress_stalled', () => {
    const res = evaluateLaborProductivityAndEac({
      projectId: 'proj-1',
      asOfDate: '2026-11-18',
      actualManDays: 36,
      actualLaborCostRupiah: 9_000_000,
      actualProgressPct: 30,
      rapLaborBudgetRupiah: 20_000_000,
      daysWithoutProgress: 4,
      activeWorkersPresent: true,
    });

    // EAC = 9.000.000 / 0.30 = 30.000.000 > 20.000.000 * 1.1 (22.000.000)
    expect(res.eacAvailable).toBe(true);
    expect(res.eacLaborCostRupiah).toBe(30_000_000);
    expect(res.laborVarianceAtCompletionRupiah).toBe(-10_000_000);
    expect(res.warnings).toContain('labor_overrun');
    expect(res.warnings).toContain('progress_stalled');
  });

  it('menjalankan simulasi penuh 30 hari proyek terpadu PM + HRD (G8) + Keuangan (G0/G3)', () => {
    const projectId = 'proj-villa-merpati';
    const projectName = 'Pembangunan Villa Merpati';
    const clientPartyId = 'party-client-merpati';

    const laborPolicy: LaborPolicy = {
      standardWorkDaysPerMonth: 25,
      standardHoursPerDay: 8,
      overtimeMultiplier: 1.5,
      maxKasbonDeductionPct: 30,
    };

    const rateHistory: CompensationRateRecord[] = [
      { id: 'rate-t1', workerId: 'tukang-1', rateType: 'daily', rateRupiah: 200_000, effectiveFrom: '2026-10-01' },
      { id: 'rate-t2', workerId: 'tukang-2', rateType: 'daily', rateRupiah: 180_000, effectiveFrom: '2026-10-01' },
      { id: 'rate-t3', workerId: 'tukang-3', rateType: 'daily', rateRupiah: 170_000, effectiveFrom: '2026-10-01' },
    ];

    const workersMeta = {
      'tukang-1': { name: 'Pak Joko', partyId: 'party-tukang-1', role: 'tukang_utama', rate: 200_000 },
      'tukang-2': { name: 'Pak Budi', partyId: 'party-tukang-2', role: 'tukang_batu', rate: 180_000 },
      'tukang-3': { name: 'Kang Dedi', partyId: 'party-tukang-3', role: 'kenek', rate: 170_000 },
    } as const;

    // 3 Tahap Gantt selama 30 hari penuh (2026-11-01 s.d. 2026-11-30)
    const workItems: PmWorkItemScheduleInput[] = [
      {
        id: 'wi-1',
        projectId,
        projectName,
        name: 'Tahap 1: Pondasi & Sloof',
        startDate: '2026-11-01',
        endDate: '2026-11-10',
        weight: 30,
        assignedWorkerIds: ['tukang-1', 'tukang-2'],
        progressPct: 0,
      },
      {
        id: 'wi-2',
        projectId,
        projectName,
        name: 'Tahap 2: Struktur & Dinding',
        startDate: '2026-11-11',
        endDate: '2026-11-22',
        weight: 40,
        assignedWorkerIds: ['tukang-1', 'tukang-2', 'tukang-3'],
        progressPct: 0,
      },
      {
        id: 'wi-3',
        projectId,
        projectName,
        name: 'Tahap 3: Atap & Finishing',
        startDate: '2026-11-23',
        endDate: '2026-11-30',
        weight: 30,
        assignedWorkerIds: ['tukang-2', 'tukang-3'],
        progressPct: 0,
      },
    ];

    const allAttendanceSplits: AttendanceProjectSplitInput[] = [];
    const dailyLaborLedgerTotals: number[] = [];
    const dailyPlansByDate = new Map<string, ReturnType<typeof deriveDailyPlanFromSchedule>>();

    // Pelacakan kondisi simulasi selama 30 hari
    let day10RejectedWithoutPhoto = false;
    let day10PendingPhotoVerification = false;
    let day17StallCheck: ReturnType<typeof evaluateLaborProductivityAndEac> | null = null;
    let day18StockCheck: ReturnType<typeof evaluateMaterialAndPurchaseDrafts> | null = null;
    let day18TodoRejectedWithoutProof = false;
    let day18TodoClosedWithProof = false;
    let day20DelayImpact: ReturnType<typeof evaluateDelayAndTerminImpact> | null = null;
    let day20WhatIfCashImpact: ReturnType<typeof runAdvisorWhatIf> | null = null;
    let day25OwnerReport: ReturnType<typeof buildDailyProjectReport> | null = null;
    let day25ClientReport: ReturnType<typeof buildDailyProjectReport> | null = null;

    let lastProjectProgressPct = 0;
    let daysWithoutProgress = 0;
    const rapLaborBudgetRupiah = 20_000_000;

    // Jalankan simulasi Hari 1 s.d. Hari 30
    for (let day = 1; day <= 30; day += 1) {
      const workDate = ymdForDayIndex(day);

      // 1. PM menurunkan penugasan harian dari jadwal Gantt
      const dailyPlan = deriveDailyPlanFromSchedule({
        projectId,
        projectName,
        workItems,
        workDate,
      });
      dailyPlansByDate.set(workDate, dailyPlan);

      // 2. HRD (G8) mencatat absensi berdasarkan tebakan jadwal PM dan membuat akrual harian
      const todaySplits: AttendanceProjectSplitInput[] = [];
      for (const assignment of dailyPlan.dailyAssignments) {
        const resolution = resolveAttendanceProjectFromSchedule(
          assignment.workerId,
          workDate,
          dailyPlan.dailyAssignments,
        );
        expect(resolution.source).toBe('pm_schedule');
        expect(resolution.needsConfirmation).toBe(false);
        expect(resolution.resolvedProjectId).toBe(projectId);

        const meta = workersMeta[assignment.workerId as keyof typeof workersMeta];
        todaySplits.push({
          id: `att-${workDate}-${assignment.workerId}`,
          workerId: assignment.workerId,
          workerName: meta.name,
          partyId: meta.partyId,
          role: meta.role,
          projectId: resolution.resolvedProjectId!,
          projectName,
          workDate,
          dayFraction: 1,
          regularHours: 8,
          overtimeHours: 0,
        });
      }

      const accrual = buildDailyProjectLaborAccruals(todaySplits, rateHistory, laborPolicy);
      expect(accrual.ok).toBe(true);
      expect(accrual.status).toBe('ready');
      for (const entry of accrual.entries) {
        expect(linesAreBalanced(entry.journalLines)).toBe(true);
        expect(validateJournalDimensions(entry.journalLines).ok).toBe(true);
      }
      dailyLaborLedgerTotals.push(accrual.grandTotalAccrued);
      allAttendanceSplits.push(...todaySplits);

      // 3. Simulasi kemajuan pekerjaan & gerbang foto/kendala
      if (day >= 1 && day <= 9) {
        workItems[0].progressPct = day * 10; // Hari 9 = 90%
      } else if (day === 10) {
        // Pekerja klik Selesai 100% tanpa foto -> DITOLAK
        const attempt1 = evaluateProgressUpdateRequest({
          workItemId: workItems[0].id,
          workItemName: workItems[0].name,
          currentProgressPct: workItems[0].progressPct ?? 90,
          requestedProgressPct: 100,
          actorId: 'tukang-1',
          actorRole: 'worker',
          asOfDate: workDate,
        });
        day10RejectedWithoutPhoto = !attempt1.ok && attempt1.status === 'rejected_requires_proof';

        // Pekerja unggah foto saja -> pending_supervisor_verification
        const attempt2 = evaluateProgressUpdateRequest({
          workItemId: workItems[0].id,
          workItemName: workItems[0].name,
          currentProgressPct: workItems[0].progressPct ?? 90,
          requestedProgressPct: 100,
          actorId: 'tukang-1',
          actorRole: 'worker',
          photoAttachmentHash: 'sha256-pondasi-day10',
          asOfDate: workDate,
        });
        day10PendingPhotoVerification = attempt2.status === 'pending_supervisor_verification';

        // Mandor verifikasi foto -> tahap 1 selesai 100%
        const attempt3 = evaluateProgressUpdateRequest({
          workItemId: workItems[0].id,
          workItemName: workItems[0].name,
          currentProgressPct: workItems[0].progressPct ?? 90,
          requestedProgressPct: 100,
          actorId: 'tukang-1',
          actorRole: 'worker',
          photoAttachmentHash: 'sha256-pondasi-day10',
          approvedBy: 'mandor-1',
          approvedByRole: 'mandor',
          asOfDate: workDate,
        });
        expect(attempt3.status).toBe('approved');
        workItems[0].progressPct = attempt3.effectiveProgressPct;
      } else if (day >= 11 && day <= 14) {
        workItems[1].progressPct = (day - 10) * 10; // Hari 14 = 40%
      } else if (day >= 15 && day <= 17) {
        // Macet 3 hari tanpa kenaikan progres meski tukang hadir (kendala stok besi/semen)
        workItems[1].progressPct = 40;
      } else if (day === 18) {
        // Evaluasi material & draf PO
        day18StockCheck = evaluateMaterialAndPurchaseDrafts({
          projectId,
          projectName,
          asOfDate: workDate,
          materials: [
            {
              materialId: 'mat-semen',
              materialName: 'Semen Gresik 50kg',
              unit: 'sak',
              currentStockQty: 8,
              neededQty: 30,
              minStockThreshold: 15,
              unitPriceRupiah: 65_000,
              preferredSupplierPartyId: 'party-tb-makmur',
              workItemId: 'wi-2',
              stageName: workItems[1].name,
            },
          ],
        });
        expect(day18StockCheck.hasStockLowWarning).toBe(true);
        expect(day18StockCheck.warnings[0].code).toBe('stock_low');
        expect(day18StockCheck.purchaseRequestDrafts).toHaveLength(1);
        expect(day18StockCheck.purchaseRequestDrafts[0].status).toBe('pending_human_approval');
        expect(day18StockCheck.purchaseRequestDrafts[0].autoOrderAllowed).toBe(false);
        expect(day18StockCheck.purchaseRequestDrafts[0].recommendedOrderQty).toBe(22);
        expect(day18StockCheck.purchaseRequestDrafts[0].estimatedCostRupiah).toBe(22 * 65_000);

        // Buat todo otomatis dari kendala stok -> tugaskan ke PIC tahap (tukang-2)
        const todo = createTodoFromIssue({
          projectId,
          workItemId: 'wi-2',
          issueType: 'stock_low',
          title: 'Restock Semen Gresik 22 sak untuk pengecoran kolom',
          stagePicWorkerId: 'tukang-2',
          dueDate: workDate,
        });
        expect(todo.assigneeWorkerId).toBe('tukang-2');

        // Tolak tutup tanpa bukti
        const closeFail = closeTodoWithProof({
          todo,
          closedBy: 'tukang-2',
          closedByRole: 'worker',
          closedAt: workDate,
        });
        day18TodoRejectedWithoutProof = !closeFail.ok && closeFail.reason === 'closure_proof_required';

        // Tutup dengan bukti foto penerimaan material
        const closeOk = closeTodoWithProof({
          todo,
          closedBy: 'tukang-2',
          closedByRole: 'worker',
          proofAttachmentHash: 'sha256-surat-jalan-semen-day18',
          confirmedBy: 'mandor-1',
          confirmedByRole: 'mandor',
          closedAt: workDate,
          resolutionNote: '22 sak semen tiba di lokasi proyek.',
        });
        day18TodoClosedWithProof = closeOk.ok && closeOk.todo.status === 'done';
        workItems[1].progressPct = 40; // tetap 40% di hari pengiriman material
      } else if (day >= 19 && day <= 21) {
        workItems[1].progressPct = day === 19 ? 40 : day === 20 ? 40 : 75;
      } else if (day === 22) {
        const approveWi2 = evaluateProgressUpdateRequest({
          workItemId: 'wi-2',
          workItemName: workItems[1].name,
          currentProgressPct: 75,
          requestedProgressPct: 100,
          actorId: 'pm-1',
          actorRole: 'pm',
          photoAttachmentHash: 'sha256-struktur-day22',
          asOfDate: workDate,
        });
        expect(approveWi2.status).toBe('approved');
        workItems[1].progressPct = 100;
      } else if (day >= 23 && day <= 29) {
        workItems[2].progressPct = (day - 22) * 12; // Hari 29 = 84%
      } else if (day === 30) {
        const approveWi3 = evaluateProgressUpdateRequest({
          workItemId: 'wi-3',
          workItemName: workItems[2].name,
          currentProgressPct: 84,
          requestedProgressPct: 100,
          actorId: 'tukang-3',
          actorRole: 'worker',
          photoUrl: 'https://storage.example/villa-merpati/finishing-day30.jpg',
          approvedBy: 'mandor-1',
          approvedByRole: 'mandor',
          asOfDate: workDate,
        });
        expect(approveWi3.status).toBe('approved');
        workItems[2].progressPct = 100;
      }

      // Hitung progres proyek aktual setelah update hari ini
      const postUpdatePlan = deriveDailyPlanFromSchedule({
        projectId,
        projectName,
        workItems,
        workDate,
        includeCompleted: true,
      });

      if (postUpdatePlan.actualProgressPct <= lastProjectProgressPct && day > 1) {
        daysWithoutProgress += 1;
      } else {
        daysWithoutProgress = 0;
      }
      lastProjectProgressPct = postUpdatePlan.actualProgressPct;

      // Hari 17: Evaluasi produktivitas & progress_stalled (3 hari tanpa progres: Hari 15, 16, 17)
      if (day === 17) {
        const ledgerSoFar = dailyLaborLedgerTotals.reduce((a, b) => a + b, 0);
        day17StallCheck = evaluateLaborProductivityAndEac({
          projectId,
          asOfDate: workDate,
          actualManDays: allAttendanceSplits.reduce((s, a) => s + a.dayFraction, 0),
          actualLaborCostRupiah: ledgerSoFar,
          actualProgressPct: postUpdatePlan.actualProgressPct,
          rapLaborBudgetRupiah,
          daysWithoutProgress,
          activeWorkersPresent: todaySplits.length > 0,
        });
      }

      // Hari 20: Evaluasi risiko keterlambatan terhadap Termin 2 (jatuh tempo 2026-11-20, syarat >= 60%)
      if (day === 20) {
        day20DelayImpact = evaluateDelayAndTerminImpact({
          projectId,
          projectName,
          partyId: clientPartyId,
          partyName: 'PT Merpati Properti',
          asOfDate: workDate,
          projectStartDate: '2026-11-01',
          projectEndDate: '2026-11-30',
          plannedProgressPct: postUpdatePlan.plannedProgressPct,
          actualProgressPct: postUpdatePlan.actualProgressPct, // 30% + 16% = 46% < 60%
          termins: [
            {
              id: 'termin-1',
              label: 'Termin 1 (Pondasi)',
              dueDate: '2026-11-10',
              amountRupiah: 80_000_000,
              requiredProgressPct: 30,
              status: 'paid',
            },
            {
              id: 'termin-2',
              label: 'Termin 2 (Struktur)',
              dueDate: '2026-11-20',
              amountRupiah: 100_000_000,
              requiredProgressPct: 60,
              status: 'pending',
            },
          ],
        });

        expect(day20DelayImpact.advisorWhatIfScenario).not.toBeNull();
        const baseForecastInput: ForecastCashFlowInput = {
          asOfDate: '2026-11-20',
          openingCash: 25_000_000,
          receivables: [],
          payables: [
            {
              id: 'pay-material-1',
              partyName: 'TB Makmur',
              projectId,
              dueDate: '2026-11-24',
              outstandingAmount: 60_000_000,
              isActiveCriticalProject: true,
            },
          ],
          monthlyOpexPlan: 10_000_000,
          scheduledProjectTermins: [
            {
              id: 'termin-2',
              projectId,
              projectName,
              partyId: clientPartyId,
              partyName: 'PT Merpati Properti',
              dueDate: '2026-11-20',
              amount: 100_000_000,
            },
          ],
        };
        day20WhatIfCashImpact = runAdvisorWhatIf(
          baseForecastInput,
          day20DelayImpact.advisorWhatIfScenario!,
        );
      }

      // Hari 25: Susun laporan harian mode 'owner' dan 'client'
      if (day === 25) {
        const ledgerSoFar = dailyLaborLedgerTotals.reduce((a, b) => a + b, 0);
        const prod25 = evaluateLaborProductivityAndEac({
          projectId,
          asOfDate: workDate,
          actualManDays: allAttendanceSplits.reduce((s, a) => s + a.dayFraction, 0),
          actualLaborCostRupiah: ledgerSoFar,
          actualProgressPct: postUpdatePlan.actualProgressPct,
          rapLaborBudgetRupiah,
        });

        const attendanceEntries = todaySplits.map((s) => {
          const meta = workersMeta[s.workerId as keyof typeof workersMeta];
          return {
            workerId: s.workerId,
            workerName: meta.name,
            role: meta.role,
            dayFraction: s.dayFraction,
            workItemName: workItems[2].name,
            dailyRateRupiah: meta.rate,
            laborCostRupiah: meta.rate,
            kasbonBalanceRupiah: s.workerId === 'tukang-2' ? 350_000 : 0,
          };
        });

        const commonReportInput = {
          projectId,
          projectName,
          reportDate: workDate,
          attendance: attendanceEntries,
          stages: workItems.map((wi) => ({
            workItemId: wi.id,
            name: wi.name,
            plannedPct: 100,
            actualPct: wi.progressPct ?? 0,
            status: ((wi.progressPct ?? 0) >= 100 ? 'completed' : 'in_progress') as
              | 'completed'
              | 'in_progress',
          })),
          issues: [
            {
              id: 'iss-1',
              title: 'Pengiriman semen selesai; pengecoran berlanjut normal',
              severity: 'low' as const,
              status: 'done' as const,
              workItemId: 'wi-2',
            },
          ],
          photos: [
            {
              id: 'ph-25',
              workItemId: 'wi-3',
              stageName: workItems[2].name,
              photoAttachmentHash: 'sha256-rangka-atap-day25',
              caption: 'Pemasangan rangka baja ringan berjalan rapi',
              capturedAt: `${workDate}T16:30:00Z`,
            },
          ],
          scheduleSummary: {
            plannedProgressPct: postUpdatePlan.plannedProgressPct,
            actualProgressPct: postUpdatePlan.actualProgressPct,
            scheduleSlipDays: 0,
            projectedCompletionDate: '2026-11-30',
          },
          internalFinancials: {
            actualLaborCostRupiah: ledgerSoFar,
            rapLaborBudgetRupiah,
            eacLaborCostRupiah: prod25.eacLaborCostRupiah,
            laborVarianceAtCompletionRupiah: prod25.laborVarianceAtCompletionRupiah,
            projectedMarginRupiah: 85_000_000,
            totalKasbonOutstandingRupiah: 350_000,
          },
        };

        day25OwnerReport = buildDailyProjectReport({
          ...commonReportInput,
          audience: 'owner',
        });
        day25ClientReport = buildDailyProjectReport({
          ...commonReportInput,
          audience: 'client',
          clientReportEnabled: true,
        });

        // Juga uji saat clientReportEnabled=false -> ditolak
        const disabledClient = buildDailyProjectReport({
          ...commonReportInput,
          audience: 'client',
          clientReportEnabled: false,
        });
        expect(disabledClient.ok).toBe(false);
        expect(disabledClient.status).toBe('client_report_disabled');
      }
    }

    // --- VERIFIKASI SELURUH GERBANG 30 HARI ---

    // A. PM Penugasan & Guard Progres Foto 100%
    expect(dailyPlansByDate.size).toBe(30);
    expect(day10RejectedWithoutPhoto).toBe(true);
    expect(day10PendingPhotoVerification).toBe(true);
    expect(workItems.every((w) => w.progressPct === 100)).toBe(true);

    // B. Produktivitas & Stalled Detection
    expect(day17StallCheck).not.toBeNull();
    expect(day17StallCheck!.warnings).toContain('progress_stalled');

    // C. Material Stock Low & Todo Closure Guard
    expect(day18StockCheck).not.toBeNull();
    expect(day18TodoRejectedWithoutProof).toBe(true);
    expect(day18TodoClosedWithProof).toBe(true);

    // D. Risiko Keterlambatan -> Termin Blocked -> Advisor What-If
    expect(day20DelayImpact).not.toBeNull();
    expect(day20DelayImpact!.status).toBe('termin_blocked_by_progress_delay');
    expect(day20DelayImpact!.blockedTerminAmountRupiah).toBe(100_000_000);
    expect(day20DelayImpact!.estimatedCashInDelayDays).toBeGreaterThan(0);
    expect(day20DelayImpact!.scheduleSlipDays).toBeGreaterThan(0);
    expect(day20WhatIfCashImpact).not.toBeNull();
    expect(day20WhatIfCashImpact!.profitImpact).toBe(0); // cash timing shift only

    // E. Laporan Harian Owner vs Client (0 kebocoran internal di laporan klien)
    expect(day25OwnerReport?.ok).toBe(true);
    if (day25OwnerReport?.ok && day25OwnerReport.audience === 'owner') {
      expect(day25OwnerReport.report.internalMetrics.projectedMarginRupiah).toBe(85_000_000);
      expect(day25OwnerReport.report.internalMetrics.totalKasbonOutstandingRupiah).toBe(350_000);
    }

    expect(day25ClientReport?.ok).toBe(true);
    if (day25ClientReport?.ok && day25ClientReport.audience === 'client') {
      const serialized = JSON.stringify(day25ClientReport);
      expect(serialized).not.toMatch(/laborCost|dailyRate|margin|eac|kasbon/i);
      expect(serialized).not.toContain('85000000');
      expect(serialized).not.toContain('350000');
      expect(serialized).not.toContain('200000');
      expect(serialized).not.toContain('180000');
      expect(serialized).not.toContain('170000');
      expect(day25ClientReport.report.photos.length).toBe(1);
    }

    // F. PARITAS 3-ARAH HRD (G8) === BUKU BESAR (G0) === PM EAC (G9) selama 30 hari penuh
    // Hari 1..10: 2 tukang (200k + 180k = 380k/hari * 10 = 3.800.000)
    // Hari 11..22: 3 tukang (200k + 180k + 170k = 550k/hari * 12 = 6.600.000)
    // Hari 23..30: 2 tukang (180k + 170k = 350k/hari * 8 = 2.800.000)
    // Total ekspektasi upah 30 hari = 3.800.000 + 6.600.000 + 2.800.000 = 13.200.000
    const fullAccrual30d = buildDailyProjectLaborAccruals(
      allAttendanceSplits,
      rateHistory,
      laborPolicy,
    );
    expect(fullAccrual30d.ok).toBe(true);
    expect(fullAccrual30d.entries.length).toBe(10 * 2 + 12 * 3 + 8 * 2); // 72 man-days

    const hrdTotalWages30d = fullAccrual30d.grandTotalAccrued;
    const ledgerHppLaborDebit30d = fullAccrual30d.ledgerLines
      .filter((l) => l.role === 'hpp_labor' && l.projectId === projectId)
      .reduce((sum, l) => sum + l.debit, 0);
    const ledgerHutangGajiCredit30d = fullAccrual30d.ledgerLines
      .filter((l) => l.role === 'hutang_gaji')
      .reduce((sum, l) => sum + l.credit, 0);

    const finalPmProductivity = evaluateLaborProductivityAndEac({
      projectId,
      asOfDate: '2026-11-30',
      actualManDays: allAttendanceSplits.reduce((s, a) => s + a.dayFraction, 0),
      actualLaborCostRupiah: ledgerHppLaborDebit30d,
      actualProgressPct: 100,
      rapLaborBudgetRupiah,
    });

    expect(hrdTotalWages30d).toBe(13_200_000);
    expect(ledgerHppLaborDebit30d).toBe(hrdTotalWages30d);
    expect(ledgerHutangGajiCredit30d).toBe(hrdTotalWages30d);
    expect(finalPmProductivity.actualLaborCostRupiah).toBe(hrdTotalWages30d);
    expect(finalPmProductivity.eacLaborCostRupiah).toBe(13_200_000);
    expect(finalPmProductivity.laborVarianceAtCompletionRupiah).toBe(6_800_000); // hemat Rp 6.8jt vs RAP 20jt
    expect(finalPmProductivity.warnings).toEqual([]);

    // G. Pengakuan Pendapatan DP (G0-5) seiring progres 30% -> 46% -> 100%
    const dpTotal = 90_000_000;
    const recDay10 = computeRecognizableRevenue({
      method: 'progress_pct',
      contractValue: 300_000_000,
      dpReceivedTotal: dpTotal,
      dpAlreadyRecognized: 0,
      progressPct: 30,
    });
    expect(recDay10.recognizableAmount).toBe(27_000_000);
    expect(linesAreBalanced(recDay10.journalLines)).toBe(true);

    const recDay20 = computeRecognizableRevenue({
      method: 'progress_pct',
      contractValue: 300_000_000,
      dpReceivedTotal: dpTotal,
      dpAlreadyRecognized: recDay10.targetCumulative,
      progressPct: 46,
    });
    expect(recDay20.recognizableAmount).toBe(14_400_000);

    const recDay30 = computeRecognizableRevenue({
      method: 'progress_pct',
      contractValue: 300_000_000,
      dpReceivedTotal: dpTotal,
      dpAlreadyRecognized: recDay20.targetCumulative,
      progressPct: 100,
    });
    expect(recDay30.recognizableAmount).toBe(48_600_000);
    expect(recDay30.remainingDpLiability).toBe(0);
    expect(
      recDay10.recognizableAmount + recDay20.recognizableAmount + recDay30.recognizableAmount,
    ).toBe(dpTotal);
  });

  it('memverifikasi edge-case material threshold, laporan klien tersanitasi, termin on-track, & guard WorkerDashboard.tsx', () => {
    // 1. Stok menyentuh ambang minimum (= minStockThreshold) memicu stock_low & draf PO pending_human_approval
    const matBoundary = evaluateMaterialAndPurchaseDrafts({
      projectId: 'proj-edge',
      asOfDate: '2026-11-15',
      materials: [
        {
          materialId: 'm-besi',
          materialName: 'Besi Beton 10mm',
          unit: 'btg',
          currentStockQty: 10,
          neededQty: 8,
          minStockThreshold: 10,
          unitPriceRupiah: 85_000,
        },
        {
          materialId: 'm-pasir',
          materialName: 'Pasir Pasang',
          unit: 'm3',
          currentStockQty: 25,
          neededQty: 10,
          minStockThreshold: 5,
          unitPriceRupiah: 320_000,
        },
      ],
    });
    expect(matBoundary.hasStockLowWarning).toBe(true);
    expect(matBoundary.purchaseRequestDrafts).toHaveLength(1);
    expect(matBoundary.purchaseRequestDrafts[0].materialId).toBe('m-besi');
    expect(matBoundary.purchaseRequestDrafts[0].status).toBe('pending_human_approval');
    expect(matBoundary.autoOrderAllowed).toBe(false);

    // 2. Proyek on-track & termin sudah dibayar tidak dianggap blocked
    const onTrackDelay = evaluateDelayAndTerminImpact({
      projectId: 'proj-edge',
      asOfDate: '2026-11-15',
      projectStartDate: '2026-11-01',
      projectEndDate: '2026-11-30',
      plannedProgressPct: 50,
      actualProgressPct: 55,
      termins: [
        {
          id: 't-paid',
          dueDate: '2026-11-10',
          amountRupiah: 50_000_000,
          requiredProgressPct: 60,
          status: 'paid',
        },
        {
          id: 't-future',
          dueDate: '2026-11-28',
          amountRupiah: 50_000_000,
          requiredProgressPct: 80,
          status: 'pending',
        },
      ],
    });
    expect(onTrackDelay.status).toBe('on_track');
    expect(onTrackDelay.scheduleSlipDays).toBe(0);
    expect(onTrackDelay.blockedTerminAmountRupiah).toBe(0);
    expect(onTrackDelay.advisorWhatIfScenario).toBeNull();

    // 3. Laporan klien menyaring teks kendala yang tak sengaja memuat kata sensitif
    const clientRes = buildDailyProjectReport({
      projectId: 'proj-edge',
      projectName: 'Ruko Sudirman',
      reportDate: '2026-11-15',
      audience: 'client',
      clientReportEnabled: true,
      attendance: [
        {
          workerId: 'w-1',
          workerName: 'Andi',
          role: 'tukang',
          dayFraction: 1,
          dailyRateRupiah: 185_000,
          laborCostRupiah: 185_000,
          kasbonBalanceRupiah: 400_000,
        },
      ],
      stages: [
        {
          workItemId: 'wi-a',
          name: 'Plesteran',
          plannedPct: 50,
          actualPct: 55,
          status: 'in_progress',
        },
      ],
      issues: [
        {
          id: 'i-1',
          title: 'Kendala minor; catatan kasbon Rp 400.000 tidak perlu ke klien',
          severity: 'low',
          status: 'open',
        },
      ],
      photos: [],
      scheduleSummary: {
        plannedProgressPct: 50,
        actualProgressPct: 55,
        scheduleSlipDays: 0,
        projectedCompletionDate: '2026-11-30',
      },
      internalFinancials: {
        actualLaborCostRupiah: 7_400_000,
        rapLaborBudgetRupiah: 12_000_000,
        eacLaborCostRupiah: 13_454_545,
        laborVarianceAtCompletionRupiah: -1_454_545,
        projectedMarginRupiah: 45_000_000,
        totalKasbonOutstandingRupiah: 400_000,
      },
    });
    expect(clientRes.ok).toBe(true);
    const clientJson = JSON.stringify(clientRes);
    expect(clientJson).not.toMatch(/laborCost|dailyRate|margin|eac|kasbon/i);
    expect(clientJson).not.toContain('185000');
    expect(clientJson).not.toContain('45000000');
    expect(clientJson).not.toContain('13454545');

    // 4. Guard WorkerDashboard.tsx terhubung ke validateWorkerProgressUpdate & UI +25% mencapai 100% ditolak tanpa foto
    const dashboardSrc = readFileSync(WORKER_DASHBOARD_PATH, 'utf8');
    expect(dashboardSrc).toContain('validateWorkerProgressUpdate');
    expect(dashboardSrc).toContain('Bukti Foto Wajib');

    const plus25Hit100 = validateWorkerProgressUpdate({
      workItem: {
        id: 'wi-a',
        name: 'Plesteran',
        progress_pct: 75,
        status: 'in_progress',
      },
      requestedProgressPct: Math.min(100, 75 + 25),
      actorId: 'w-1',
      actorRole: 'worker',
    });
    expect(plus25Hit100.allowedToPersist).toBe(false);
    expect(plus25Hit100.requiresPhotoModal).toBe(true);

    // Supervisor (manager/pm) dengan foto disetujui 100%
    const pmWithPhoto = validateWorkerProgressUpdate({
      workItem: {
        id: 'wi-a',
        name: 'Plesteran',
        progress_pct: 75,
        status: 'in_progress',
      },
      requestedProgressPct: 100,
      actorId: 'pm-1',
      actorRole: 'manager',
      photoUrl: 'https://storage.example/plesteran-100.jpg',
    });
    expect(pmWithPhoto.allowedToPersist).toBe(true);
    expect(pmWithPhoto.nextStatus).toBe('completed');
    expect(pmWithPhoto.nextProgressPct).toBe(100);
  });
});
