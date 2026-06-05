export interface EvmMetricDef {
  label: string;
  title: string;
  description: string;
  formula: string;
  source: string;
}

export const EVM_METRICS: Record<string, EvmMetricDef> = {
  CPI: {
    label: 'CPI',
    title: 'Cost Performance Index',
    description: 'Seberapa efisien biaya proyek. Di atas 1 = lebih hemat dari rencana; di bawah 1 = over budget.',
    formula: 'CPI = EV ÷ AC',
    source: 'EV dari progress × budget RAP; AC = total biaya tercatat (realisasi).',
  },
  SPI: {
    label: 'SPI',
    title: 'Schedule Performance Index',
    description: 'Seberapa cepat progress vs rencana waktu. Di atas 1 = ahead; di bawah 1 = behind.',
    formula: 'SPI = EV ÷ PV',
    source: 'PV dari progress rencana jadwal; EV dari progress aktual × budget.',
  },
  CV: {
    label: 'CV',
    title: 'Cost Variance',
    description: 'Selisih nilai kerja selesai vs biaya aktual. Positif = under budget (hemat).',
    formula: 'CV = EV − AC',
    source: 'Dihitung dari RAP, realisasi biaya, dan progress proyek.',
  },
  SV: {
    label: 'SV',
    title: 'Schedule Variance',
    description: 'Selisih nilai kerja selesai vs yang seharusnya sudah selesai menurut jadwal.',
    formula: 'SV = EV − PV',
    source: 'Berdasarkan progress aktual vs progress rencana (work items / kurva S).',
  },
  BAC: {
    label: 'BAC',
    title: 'Budget at Completion',
    description: 'Total anggaran kontrak / RAP proyek — target biaya penuh saat selesai.',
    formula: 'BAC = Σ item RAP',
    source: 'Jumlah total_budget_planned / total nilai RAP di tab Planning.',
  },
  AC: {
    label: 'AC',
    title: 'Actual Cost',
    description: 'Total biaya yang sudah tercatat (realisasi) sampai saat ini.',
    formula: 'AC = Σ realisasi biaya',
    source: 'Agregasi dari tab Realisasi → Biaya dan Monefyi Button.',
  },
  OPI: {
    label: 'OPI',
    title: 'Overall Performance Index',
    description: 'Rata-rata kinerja biaya dan jadwal. ≥1 = sehat secara keseluruhan.',
    formula: 'OPI = (CPI + SPI) ÷ 2',
    source: 'Gabungan CPI dan SPI dari analisis proyek.',
  },
};
