import type { StatusAlokasi } from "@/types/budget-planner";

export function formatCurrency(value: number): string {
  if (!isFinite(value)) return "Rp 0";
  return (
    "Rp " +
    Math.round(value)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

export function formatPercent(value: number, decimals = 1): string {
  if (!isFinite(value)) return "0%";
  return value.toFixed(decimals).replace(".", ",") + "%";
}

export function formatMonth(bulan: string): string {
  if (!bulan) return "";
  const [yearStr, monthStr] = bulan.split("-");
  const year = parseInt(yearStr ?? "0", 10);
  const month = parseInt(monthStr ?? "0", 10);
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const monthName = monthNames[month - 1] ?? "";
  return `${monthName} ${year}`;
}

export function parseNumberInput(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d]/g, "");
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function getStatusAlokasi(persentaseTerpakai: number): StatusAlokasi {
  if (persentaseTerpakai > 100) return "overspend";
  if (persentaseTerpakai >= 91) return "batas";
  if (persentaseTerpakai >= 76) return "waspada";
  if (persentaseTerpakai >= 51) return "perhatian";
  return "aman";
}

export function getStatusColor(status: StatusAlokasi): string {
  switch (status) {
    case "aman":
      return "bg-green-500";
    case "perhatian":
      return "bg-amber-500";
    case "waspada":
      return "bg-orange-500";
    case "batas":
      return "bg-red-500";
    case "overspend":
      return "bg-red-600 animate-pulse-red";
    default:
      return "bg-green-500";
  }
}

export function getProgressColor(persentase: number): string {
  if (persentase > 100) return "bg-red-600";
  if (persentase >= 91) return "bg-red-500";
  if (persentase >= 76) return "bg-orange-500";
  if (persentase >= 51) return "bg-amber-500";
  return "bg-green-500";
}

export function getStatusLabel(status: StatusAlokasi): string {
  switch (status) {
    case "aman":
      return "Aman";
    case "perhatian":
      return "Perhatian";
    case "waspada":
      return "Waspada";
    case "batas":
      return "Di Batas";
    case "overspend":
      return "Overspend";
    default:
      return "Aman";
  }
}

export function getBracketPenghasilan(penghasilan: number): string {
  if (penghasilan <= 0) return "";
  if (penghasilan < 3_000_000)
    return "Fokus pada kebutuhan pokok dan dana darurat terlebih dahulu.";
  if (penghasilan < 5_000_000)
    return "Mulai bangun kebiasaan menabung secara konsisten.";
  if (penghasilan < 10_000_000)
    return "Sudah bisa mulai investasi rutin setiap bulan.";
  if (penghasilan < 20_000_000)
    return "Optimalkan investasi dan pertimbangkan asuransi jiwa.";
  return "Pertimbangkan diversifikasi aset dan konsultasi dengan perencana keuangan.";
}

export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
