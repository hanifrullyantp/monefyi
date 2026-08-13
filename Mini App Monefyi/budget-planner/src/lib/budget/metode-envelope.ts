import type { EnvelopeData, EnvelopeTransaksi } from "@/types/budget-planner";

export function initEnvelopeBudget(
  penghasilan: number,
  penghasilanTambahan: number
): EnvelopeData[] {
  const total = penghasilan + penghasilanTambahan;

  const envelopes: Omit<EnvelopeData, "terpakai" | "sisa" | "transaksi">[] = [
    {
      envelopeId: "env-kebutuhan",
      nama: "Kebutuhan Pokok",
      alokasi: Math.round(total * 0.35),
      warna: "#3b82f6",
      icon: "Home",
    },
    {
      envelopeId: "env-transportasi",
      nama: "Transportasi",
      alokasi: Math.round(total * 0.1),
      warna: "#60a5fa",
      icon: "Car",
    },
    {
      envelopeId: "env-makan",
      nama: "Makan & Kuliner",
      alokasi: Math.round(total * 0.15),
      warna: "#8b5cf6",
      icon: "UtensilsCrossed",
    },
    {
      envelopeId: "env-tagihan",
      nama: "Tagihan",
      alokasi: Math.round(total * 0.1),
      warna: "#a78bfa",
      icon: "Zap",
    },
    {
      envelopeId: "env-tabungan",
      nama: "Tabungan",
      alokasi: Math.round(total * 0.15),
      warna: "#10b981",
      icon: "PiggyBank",
    },
    {
      envelopeId: "env-hiburan",
      nama: "Hiburan & Gaya Hidup",
      alokasi: Math.round(total * 0.1),
      warna: "#f59e0b",
      icon: "Smile",
    },
    {
      envelopeId: "env-lainnya",
      nama: "Lain-lain",
      alokasi: Math.round(total * 0.05),
      warna: "#94a3b8",
      icon: "MoreHorizontal",
    },
  ];

  return envelopes.map((e) => ({
    ...e,
    terpakai: 0,
    sisa: e.alokasi,
    transaksi: [],
  }));
}

export function addTransaksiEnvelope(
  envelopes: EnvelopeData[],
  envelopeId: string,
  transaksi: Omit<EnvelopeTransaksi, "id">
): EnvelopeData[] {
  return envelopes.map((env) => {
    if (env.envelopeId !== envelopeId) return env;

    const newTransaksi: EnvelopeTransaksi = {
      ...transaksi,
      id: `txn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };

    const updatedTransaksi = [...env.transaksi, newTransaksi];
    const terpakai = updatedTransaksi.reduce((sum, t) => sum + t.jumlah, 0);

    return {
      ...env,
      transaksi: updatedTransaksi,
      terpakai,
      sisa: env.alokasi - terpakai,
    };
  });
}

export function pindahSaldoEnvelope(
  envelopes: EnvelopeData[],
  fromId: string,
  toId: string,
  jumlah: number
): EnvelopeData[] {
  return envelopes.map((env) => {
    if (env.envelopeId === fromId) {
      const newAlokasi = env.alokasi - jumlah;
      return {
        ...env,
        alokasi: newAlokasi,
        sisa: newAlokasi - env.terpakai,
      };
    }
    if (env.envelopeId === toId) {
      const newAlokasi = env.alokasi + jumlah;
      return {
        ...env,
        alokasi: newAlokasi,
        sisa: newAlokasi - env.terpakai,
      };
    }
    return env;
  });
}

export function removeTransaksiEnvelope(
  envelopes: EnvelopeData[],
  envelopeId: string,
  transaksiId: string
): EnvelopeData[] {
  return envelopes.map((env) => {
    if (env.envelopeId !== envelopeId) return env;

    const updatedTransaksi = env.transaksi.filter((t) => t.id !== transaksiId);
    const terpakai = updatedTransaksi.reduce((sum, t) => sum + t.jumlah, 0);

    return {
      ...env,
      transaksi: updatedTransaksi,
      terpakai,
      sisa: env.alokasi - terpakai,
    };
  });
}
