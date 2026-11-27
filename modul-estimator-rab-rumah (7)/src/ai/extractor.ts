import type { BuildingModel, Finishing, RoofType } from "../data/types";
import { extractSlots } from "./router";

export interface ExtractedAnswer {
  slots: Partial<Pick<BuildingModel, "area" | "floors" | "bedrooms" | "bathrooms" | "landArea" | "electricalPoints" | "waterPoints" | "location">> & {
    roof?: RoofType;
    finishing?: Finishing;
    carport?: boolean;
    openFoundation?: boolean;
  };
  summary: string[];
  confidence: number;
}

/** Ekstraksi aturan deterministik untuk jawaban bebas multi-slot. */
export function extractAnswer(raw: string): ExtractedAnswer {
  const text = raw.toLowerCase();
  const parsed = extractSlots(raw);
  const slots: ExtractedAnswer["slots"] = {};
  const summary: string[] = [];
  if (parsed.luas) {
    slots.area = parsed.luas;
    summary.push(`luas ${parsed.luas} m²`);
  }
  if (parsed.lantai) {
    slots.floors = parsed.lantai;
    summary.push(`${parsed.lantai} lantai`);
  }
  if (parsed.kamar_tidur) {
    slots.bedrooms = parsed.kamar_tidur;
    summary.push(`${parsed.kamar_tidur} kamar tidur`);
  }
  if (parsed.kamar_mandi) {
    slots.bathrooms = parsed.kamar_mandi;
    summary.push(`${parsed.kamar_mandi} kamar mandi`);
  }
  if (parsed.atap) {
    slots.roof = parsed.atap;
    summary.push(`atap ${parsed.atap}`);
  }
  if (parsed.finishing) {
    slots.finishing = parsed.finishing;
    summary.push(`finishing ${parsed.finishing}`);
  }
  if (parsed.lokasi) {
    slots.location = parsed.lokasi;
    summary.push(`lokasi ${parsed.lokasi}`);
  }
  const land = text.match(/(?:tanah|lahan)\s*(?:seluas\s*)?(\d{2,4})\s*(?:m2|m²)/);
  if (land) {
    slots.landArea = Number(land[1]);
    summary.push(`tanah ${land[1]} m²`);
  }
  if (/carport|kanopi mobil/.test(text)) {
    slots.carport = true;
    summary.push("carport");
  }
  if (/batu kali/.test(text)) {
    slots.openFoundation = true;
    summary.push("pondasi batu kali");
  }
  const electric = text.match(/(\d{1,2})\s*titik\s*(?:listrik|lampu)?/);
  if (electric) {
    slots.electricalPoints = Number(electric[1]);
    summary.push(`${electric[1]} titik listrik`);
  }
  const water = text.match(/(\d{1,2})\s*titik\s*air/);
  if (water) {
    slots.waterPoints = Number(water[1]);
    summary.push(`${water[1]} titik air`);
  }
  return { slots, summary, confidence: summary.length ? Math.min(0.95, 0.55 + summary.length * 0.1) : 0 };
}

export function answerToHuman(summary: string[]): string {
  if (!summary.length) return "Belum ada slot yang bisa saya baca — saya gunakan default dan tandai perlu dicek.";
  return `Saya catat: ${summary.join(", ")}.`;
}
