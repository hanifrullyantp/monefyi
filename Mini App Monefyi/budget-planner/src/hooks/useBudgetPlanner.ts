"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  MetodeBudget,
  KategoriTipe,
  BudgetPlan,
  ProfilKeuangan,
  BudgetInsight,
  RiwayatItem,
  EnvelopeData,
  ZeroBudgetState,
} from "@/types/budget-planner";
import {
  saveToStorage,
  loadFromStorage,
  STORAGE_KEYS,
  saveBudgetToHistory,
} from "@/lib/localStorage";
import { calculateBudget503020 } from "@/lib/budget/metode-503020";
import { calculateBudget40302010 } from "@/lib/budget/metode-40302010";
import { calculateBudget702010 } from "@/lib/budget/metode-702010";
import {
  initZeroBasedBudget,
  updateZeroBasedAlokasi,
  addKategoriZeroBased,
  removeKategoriZeroBased,
} from "@/lib/budget/metode-zero-based";
import {
  initEnvelopeBudget,
  addTransaksiEnvelope,
  pindahSaldoEnvelope,
} from "@/lib/budget/metode-envelope";
import { generateInsights } from "@/lib/budget/budget-insights";
import { getCurrentMonth } from "@/lib/formatters";

const DEFAULT_PROFIL: ProfilKeuangan = {
  namaPengguna: "",
  penghasilanBulanan: 0,
  penghasilanTambahan: 0,
  bulanAktif: getCurrentMonth(),
  metodeAktif: "503020",
  matauang: "IDR",
};

export function useBudgetPlanner() {
  const [profilKeuangan, setProfilKeuangan] =
    useState<ProfilKeuangan>(DEFAULT_PROFIL);
  const [metodeAktif, setMetodeAktif] = useState<MetodeBudget>("503020");
  const [budgetPlan, setBudgetPlan] = useState<BudgetPlan | null>(null);
  const [envelopeData, setEnvelopeData] = useState<EnvelopeData[]>([]);
  const [zeroBudgetState, setZeroBudgetState] =
    useState<ZeroBudgetState | null>(null);
  const [insights, setInsights] = useState<BudgetInsight[]>([]);
  const [isCalculated, setIsCalculated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedProfil = loadFromStorage<ProfilKeuangan>(
        STORAGE_KEYS.PROFIL,
        DEFAULT_PROFIL
      );
      const savedMetode = loadFromStorage<MetodeBudget>(
        STORAGE_KEYS.ACTIVE_METODE,
        "503020"
      );
      const savedPlan = loadFromStorage<BudgetPlan | null>(
        STORAGE_KEYS.CURRENT_PLAN,
        null
      );
      const savedEnvelope = loadFromStorage<EnvelopeData[]>(
        STORAGE_KEYS.ENVELOPE_DATA,
        []
      );
      const savedZero = loadFromStorage<ZeroBudgetState | null>(
        STORAGE_KEYS.ZEROBASED_DATA,
        null
      );

      setProfilKeuangan(savedProfil);
      setMetodeAktif(savedMetode);

      if (savedPlan) {
        setBudgetPlan(savedPlan);
        setInsights(generateInsights(savedPlan));
        setIsCalculated(true);
      }
      if (savedEnvelope.length > 0) {
        setEnvelopeData(savedEnvelope);
      }
      if (savedZero) {
        setZeroBudgetState(savedZero);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setPenghasilan = useCallback(
    (utama: number, tambahan: number) => {
      const updated: ProfilKeuangan = {
        ...profilKeuangan,
        penghasilanBulanan: utama,
        penghasilanTambahan: tambahan,
      };
      setProfilKeuangan(updated);
      saveToStorage(STORAGE_KEYS.PROFIL, updated);
    },
    [profilKeuangan]
  );

  const setProfil = useCallback((partial: Partial<ProfilKeuangan>) => {
    setProfilKeuangan((prev) => {
      const updated = { ...prev, ...partial };
      saveToStorage(STORAGE_KEYS.PROFIL, updated);
      return updated;
    });
  }, []);

  const setMetode = useCallback(
    (metode: MetodeBudget) => {
      setMetodeAktif(metode);
      saveToStorage(STORAGE_KEYS.ACTIVE_METODE, metode);
      const updated: ProfilKeuangan = { ...profilKeuangan, metodeAktif: metode };
      setProfilKeuangan(updated);
      saveToStorage(STORAGE_KEYS.PROFIL, updated);
    },
    [profilKeuangan]
  );

  const calculateBudget = useCallback(() => {
    const { penghasilanBulanan, penghasilanTambahan, bulanAktif } =
      profilKeuangan;
    const total = penghasilanBulanan + penghasilanTambahan;

    let kategori;
    switch (metodeAktif) {
      case "503020":
        kategori = calculateBudget503020(penghasilanBulanan, penghasilanTambahan);
        break;
      case "40302010":
        kategori = calculateBudget40302010(penghasilanBulanan, penghasilanTambahan);
        break;
      case "702010":
        kategori = calculateBudget702010(penghasilanBulanan, penghasilanTambahan);
        break;
      case "zero-based": {
        const zeroState = initZeroBasedBudget(
          penghasilanBulanan,
          penghasilanTambahan
        );
        setZeroBudgetState(zeroState);
        saveToStorage(STORAGE_KEYS.ZEROBASED_DATA, zeroState);
        kategori = zeroState.kategori;
        break;
      }
      case "envelope": {
        const envData = initEnvelopeBudget(penghasilanBulanan, penghasilanTambahan);
        setEnvelopeData(envData);
        saveToStorage(STORAGE_KEYS.ENVELOPE_DATA, envData);
        kategori = envData.map((e) => ({
          id: e.envelopeId,
          nama: e.nama,
          tipe: "kebutuhan" as KategoriTipe,
          persentaseDefault: 0,
          rupiahAlokasi: e.alokasi,
          rupiahTerpakai: e.terpakai,
          isEditable: true,
          isCustom: false,
          icon: e.icon,
          deskripsi: e.nama,
        }));
        break;
      }
      default:
        kategori = calculateBudget503020(penghasilanBulanan, penghasilanTambahan);
    }

    const [bulanStr, tahunStr] = bulanAktif.split("-");
    const tahun = parseInt(tahunStr ?? "0", 10);
    const bulan = bulanStr ?? "";

    const plan: BudgetPlan = {
      id: `plan-${Date.now()}`,
      bulan,
      tahun,
      profilKeuangan,
      metode: metodeAktif,
      totalPenghasilan: total,
      kategori,
      totalAlokasi: kategori.reduce((s, k) => s + k.rupiahAlokasi, 0),
      totalTerpakai: kategori.reduce((s, k) => s + k.rupiahTerpakai, 0),
      sisa: total - kategori.reduce((s, k) => s + k.rupiahAlokasi, 0),
      persentaseTerpakai:
        total > 0
          ? (kategori.reduce((s, k) => s + k.rupiahTerpakai, 0) / total) * 100
          : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setBudgetPlan(plan);
    saveToStorage(STORAGE_KEYS.CURRENT_PLAN, plan);
    setInsights(generateInsights(plan));
    setIsCalculated(true);
  }, [profilKeuangan, metodeAktif]);

  const updateKategoriAlokasi = useCallback(
    (id: string, rupiah: number) => {
      if (!budgetPlan) return;

      const updatedKategori = budgetPlan.kategori.map((k) =>
        k.id === id ? { ...k, rupiahAlokasi: Math.max(0, rupiah) } : k
      );

      const updated: BudgetPlan = {
        ...budgetPlan,
        kategori: updatedKategori,
        totalAlokasi: updatedKategori.reduce((s, k) => s + k.rupiahAlokasi, 0),
        sisa:
          budgetPlan.totalPenghasilan -
          updatedKategori.reduce((s, k) => s + k.rupiahAlokasi, 0),
        updatedAt: new Date().toISOString(),
      };

      setBudgetPlan(updated);
      saveToStorage(STORAGE_KEYS.CURRENT_PLAN, updated);
      setInsights(generateInsights(updated));
    },
    [budgetPlan]
  );

  const updateKategoriTerpakai = useCallback(
    (id: string, rupiah: number) => {
      if (!budgetPlan) return;

      const updatedKategori = budgetPlan.kategori.map((k) =>
        k.id === id ? { ...k, rupiahTerpakai: Math.max(0, rupiah) } : k
      );

      const totalTerpakai = updatedKategori.reduce(
        (s, k) => s + k.rupiahTerpakai,
        0
      );

      const updated: BudgetPlan = {
        ...budgetPlan,
        kategori: updatedKategori,
        totalTerpakai,
        persentaseTerpakai:
          budgetPlan.totalPenghasilan > 0
            ? (totalTerpakai / budgetPlan.totalPenghasilan) * 100
            : 0,
        updatedAt: new Date().toISOString(),
      };

      setBudgetPlan(updated);
      saveToStorage(STORAGE_KEYS.CURRENT_PLAN, updated);
      setInsights(generateInsights(updated));
    },
    [budgetPlan]
  );

  const resetBudget = useCallback(() => {
    setBudgetPlan(null);
    setIsCalculated(false);
    setInsights([]);
    saveToStorage(STORAGE_KEYS.CURRENT_PLAN, null);
  }, []);

  const saveBudget = useCallback(() => {
    if (!budgetPlan) return;
    saveBudgetToHistory(budgetPlan);
  }, [budgetPlan]);

  const loadRiwayat = useCallback((): RiwayatItem[] => {
    return loadFromStorage<RiwayatItem[]>(STORAGE_KEYS.HISTORY, []);
  }, []);

  const addEnvelopeTransaksi = useCallback(
    (
      envelopeId: string,
      transaksi: { deskripsi: string; jumlah: number; tanggal: string }
    ) => {
      const updated = addTransaksiEnvelope(envelopeData, envelopeId, transaksi);
      setEnvelopeData(updated);
      saveToStorage(STORAGE_KEYS.ENVELOPE_DATA, updated);

      // Sync with budgetPlan
      if (budgetPlan) {
        const updatedKategori = budgetPlan.kategori.map((k) => {
          const env = updated.find((e) => e.envelopeId === k.id);
          return env ? { ...k, rupiahTerpakai: env.terpakai } : k;
        });
        const totalTerpakai = updatedKategori.reduce(
          (s, k) => s + k.rupiahTerpakai,
          0
        );
        const updatedPlan: BudgetPlan = {
          ...budgetPlan,
          kategori: updatedKategori,
          totalTerpakai,
          persentaseTerpakai:
            budgetPlan.totalPenghasilan > 0
              ? (totalTerpakai / budgetPlan.totalPenghasilan) * 100
              : 0,
          updatedAt: new Date().toISOString(),
        };
        setBudgetPlan(updatedPlan);
        saveToStorage(STORAGE_KEYS.CURRENT_PLAN, updatedPlan);
      }
    },
    [envelopeData, budgetPlan]
  );

  const pindahSaldoEnvelopeHandler = useCallback(
    (fromId: string, toId: string, jumlah: number) => {
      const updated = pindahSaldoEnvelope(envelopeData, fromId, toId, jumlah);
      setEnvelopeData(updated);
      saveToStorage(STORAGE_KEYS.ENVELOPE_DATA, updated);
    },
    [envelopeData]
  );

  const addZeroBasedKategori = useCallback(
    (nama: string, tipe: KategoriTipe) => {
      if (!zeroBudgetState) return;
      const updated = addKategoriZeroBased(zeroBudgetState, nama, tipe);
      setZeroBudgetState(updated);
      saveToStorage(STORAGE_KEYS.ZEROBASED_DATA, updated);

      if (budgetPlan) {
        const updatedPlan: BudgetPlan = {
          ...budgetPlan,
          kategori: updated.kategori,
          totalAlokasi: updated.totalAlokasi,
          updatedAt: new Date().toISOString(),
        };
        setBudgetPlan(updatedPlan);
        saveToStorage(STORAGE_KEYS.CURRENT_PLAN, updatedPlan);
      }
    },
    [zeroBudgetState, budgetPlan]
  );

  const removeZeroBasedKategori = useCallback(
    (kategoriId: string) => {
      if (!zeroBudgetState) return;
      const updated = removeKategoriZeroBased(zeroBudgetState, kategoriId);
      setZeroBudgetState(updated);
      saveToStorage(STORAGE_KEYS.ZEROBASED_DATA, updated);

      if (budgetPlan) {
        const updatedPlan: BudgetPlan = {
          ...budgetPlan,
          kategori: updated.kategori,
          totalAlokasi: updated.totalAlokasi,
          updatedAt: new Date().toISOString(),
        };
        setBudgetPlan(updatedPlan);
        saveToStorage(STORAGE_KEYS.CURRENT_PLAN, updatedPlan);
      }
    },
    [zeroBudgetState, budgetPlan]
  );

  const updateZeroBasedAlokasiHandler = useCallback(
    (id: string, rupiah: number) => {
      if (!zeroBudgetState) return;
      const updated = updateZeroBasedAlokasi(zeroBudgetState, id, rupiah);
      setZeroBudgetState(updated);
      saveToStorage(STORAGE_KEYS.ZEROBASED_DATA, updated);

      if (budgetPlan) {
        const updatedPlan: BudgetPlan = {
          ...budgetPlan,
          kategori: updated.kategori,
          totalAlokasi: updated.totalAlokasi,
          sisa: updated.sisaAlokasi,
          updatedAt: new Date().toISOString(),
        };
        setBudgetPlan(updatedPlan);
        saveToStorage(STORAGE_KEYS.CURRENT_PLAN, updatedPlan);
        setInsights(generateInsights(updatedPlan));
      }
    },
    [zeroBudgetState, budgetPlan]
  );

  return {
    profilKeuangan,
    metodeAktif,
    budgetPlan,
    envelopeData,
    zeroBudgetState,
    insights,
    isCalculated,
    isLoading,
    setPenghasilan,
    setProfil,
    setMetode,
    calculateBudget,
    updateKategoriAlokasi,
    updateKategoriTerpakai,
    resetBudget,
    saveBudget,
    loadRiwayat,
    addEnvelopeTransaksi,
    pindahSaldoEnvelope: pindahSaldoEnvelopeHandler,
    addZeroBasedKategori,
    removeZeroBasedKategori,
    updateZeroBasedAlokasi: updateZeroBasedAlokasiHandler,
    setEnvelopeData,
  };
}
