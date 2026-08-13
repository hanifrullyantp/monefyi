"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  AhliWarisInput,
  HartaWarisan,
  HasilPembagianWaris,
  RiwayatWarisItem,
  JenisAhliWaris,
} from "@/types/hitung-waris";
import { hitungWarisan } from "@/lib/waris/faraid-engine";
import {
  getItem,
  setItem,
  clearWarisData,
  LOCAL_STORAGE_KEYS,
} from "@/lib/localStorage";

const DEFAULT_HARTA: HartaWarisan = {
  totalHarta: 0,
  hutangAlmarhum: 0,
  biayaJenazah: 0,
  nilaiWasiat: 0,
  hartaBersih: 0,
};

const DEFAULT_AHLI_WARIS: AhliWarisInput[] = [
  { jenis: "suami", jumlah: 1, isAda: false },
  { jenis: "istri", jumlah: 1, isAda: false },
  { jenis: "anak_laki", jumlah: 1, isAda: false },
  { jenis: "anak_perempuan", jumlah: 1, isAda: false },
  { jenis: "ayah", jumlah: 1, isAda: false },
  { jenis: "ibu", jumlah: 1, isAda: false },
  { jenis: "kakek", jumlah: 1, isAda: false },
  { jenis: "nenek_dari_ibu", jumlah: 1, isAda: false },
  { jenis: "nenek_dari_ayah", jumlah: 1, isAda: false },
  { jenis: "cucu_laki_dari_anak_laki", jumlah: 1, isAda: false },
  { jenis: "cucu_perempuan_dari_anak_laki", jumlah: 1, isAda: false },
  { jenis: "saudara_kandung_laki", jumlah: 1, isAda: false },
  { jenis: "saudara_kandung_perempuan", jumlah: 1, isAda: false },
  { jenis: "saudara_sebapak_laki", jumlah: 1, isAda: false },
  { jenis: "saudara_sebapak_perempuan", jumlah: 1, isAda: false },
  { jenis: "saudara_seibu_laki", jumlah: 1, isAda: false },
  { jenis: "saudara_seibu_perempuan", jumlah: 1, isAda: false },
];

export function useWarisCalculator() {
  const [harta, setHartaState] = useState<HartaWarisan>(DEFAULT_HARTA);
  const [ahliWaris, setAhliWarisState] =
    useState<AhliWarisInput[]>(DEFAULT_AHLI_WARIS);
  const [hasil, setHasil] = useState<HasilPembagianWaris | null>(null);
  const [riwayat, setRiwayat] = useState<RiwayatWarisItem[]>([]);
  const [isHitung, setIsHitung] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load dari localStorage saat mount
  useEffect(() => {
    const savedHarta = getItem<HartaWarisan>(LOCAL_STORAGE_KEYS.HARTA);
    const savedAhliWaris = getItem<AhliWarisInput[]>(
      LOCAL_STORAGE_KEYS.AHLI_WARIS
    );
    const savedHasil = getItem<HasilPembagianWaris>(LOCAL_STORAGE_KEYS.HASIL);
    const savedRiwayat = getItem<RiwayatWarisItem[]>(
      LOCAL_STORAGE_KEYS.HISTORY
    );

    if (savedHarta) setHartaState(savedHarta);
    if (savedAhliWaris) {
      // Merge dengan default agar semua jenis ada
      const merged = DEFAULT_AHLI_WARIS.map((def) => {
        const saved = savedAhliWaris.find((s) => s.jenis === def.jenis);
        return saved ?? def;
      });
      setAhliWarisState(merged);
    }
    if (savedHasil) {
      setHasil(savedHasil);
      setIsHitung(true);
    }
    if (savedRiwayat) setRiwayat(savedRiwayat);
  }, []);

  // Debounce save ke localStorage
  const saveHarta = useCallback((newHarta: HartaWarisan) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setItem(LOCAL_STORAGE_KEYS.HARTA, newHarta);
    }, 500);
  }, []);

  const saveAhliWaris = useCallback((newAhliWaris: AhliWarisInput[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setItem(LOCAL_STORAGE_KEYS.AHLI_WARIS, newAhliWaris);
    }, 500);
  }, []);

  const setHarta = useCallback(
    (newHarta: HartaWarisan) => {
      const hartaBersih = Math.max(
        0,
        newHarta.totalHarta -
          newHarta.hutangAlmarhum -
          newHarta.biayaJenazah
      );
      const hartaFinal = { ...newHarta, hartaBersih };
      setHartaState(hartaFinal);
      saveHarta(hartaFinal);
    },
    [saveHarta]
  );

  const setAhliWaris = useCallback(
    (newAhliWaris: AhliWarisInput[]) => {
      setAhliWarisState(newAhliWaris);
      saveAhliWaris(newAhliWaris);
    },
    [saveAhliWaris]
  );

  const toggleAhliWaris = useCallback(
    (jenis: JenisAhliWaris, isAda: boolean) => {
      setAhliWarisState((prev) => {
        const updated = prev.map((aw) =>
          aw.jenis === jenis ? { ...aw, isAda } : aw
        );
        saveAhliWaris(updated);
        return updated;
      });
    },
    [saveAhliWaris]
  );

  const updateJumlahAhliWaris = useCallback(
    (jenis: JenisAhliWaris, jumlah: number) => {
      setAhliWarisState((prev) => {
        const updated = prev.map((aw) =>
          aw.jenis === jenis ? { ...aw, jumlah } : aw
        );
        saveAhliWaris(updated);
        return updated;
      });
    },
    [saveAhliWaris]
  );

  const hitung = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      try {
        const hasilHitung = hitungWarisan(harta, ahliWaris);
        setHasil(hasilHitung);
        setIsHitung(true);
        setItem(LOCAL_STORAGE_KEYS.HASIL, hasilHitung);

        // Simpan ke riwayat
        const jumlahAhliWarisAktif = ahliWaris.filter((a) => a.isAda).length;
        const riwayatItem: RiwayatWarisItem = {
          id: Date.now().toString(),
          tanggal: new Date().toISOString(),
          totalHarta: harta.totalHarta,
          jumlahAhliWaris: jumlahAhliWarisAktif,
          metode: hasilHitung.metode,
          ringkasan: `${jumlahAhliWarisAktif} ahli waris, harta Rp ${harta.totalHarta.toLocaleString("id-ID")}`,
        };

        setRiwayat((prev) => {
          const newRiwayat = [riwayatItem, ...prev].slice(0, 10);
          setItem(LOCAL_STORAGE_KEYS.HISTORY, newRiwayat);
          return newRiwayat;
        });
      } catch (err) {
        console.error("Error menghitung waris:", err);
      } finally {
        setIsLoading(false);
      }
    }, 500);
  }, [harta, ahliWaris]);

  const reset = useCallback(() => {
    setHartaState(DEFAULT_HARTA);
    setAhliWarisState(DEFAULT_AHLI_WARIS);
    setHasil(null);
    setIsHitung(false);
    clearWarisData();
  }, []);

  const hapusRiwayat = useCallback((id: string) => {
    setRiwayat((prev) => {
      const newRiwayat = prev.filter((r) => r.id !== id);
      setItem(LOCAL_STORAGE_KEYS.HISTORY, newRiwayat);
      return newRiwayat;
    });
  }, []);

  const muatRiwayat = useCallback(
    (id: string) => {
      const item = riwayat.find((r) => r.id === id);
      if (!item) return;
      // Muat ulang hasil terakhir (riwayat hanya menyimpan metadata)
      const savedHasil = getItem<HasilPembagianWaris>(LOCAL_STORAGE_KEYS.HASIL);
      if (savedHasil) {
        setHasil(savedHasil);
        setIsHitung(true);
      }
    },
    [riwayat]
  );

  return {
    harta,
    ahliWaris,
    hasil,
    riwayat,
    isHitung,
    isLoading,
    setHarta,
    setAhliWaris,
    toggleAhliWaris,
    updateJumlahAhliWaris,
    hitung,
    reset,
    hapusRiwayat,
    muatRiwayat,
  };
}
