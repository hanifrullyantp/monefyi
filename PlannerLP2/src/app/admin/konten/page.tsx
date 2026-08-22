"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useContentStore } from "@/lib/store/contentStore";
import type { SiteContent } from "@/lib/types/content";
import {
  LANDING_SECTIONS,
  resolveSectionOrder,
  type LandingSectionKey,
} from "@/lib/landingSections";
import { Save, RefreshCw, Eye, Edit3, ChevronRight, GripVertical } from "lucide-react";

type SectionMeta = (typeof LANDING_SECTIONS)[number];

function SortableSectionRow({
  section,
  isActive,
  isVisible,
  onOpen,
  onToggleVisibility,
}: {
  section: SectionMeta;
  isActive: boolean;
  isVisible: boolean;
  onOpen: () => void;
  onToggleVisibility: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border p-4 transition-all ${
        isDragging
          ? "border-emerald-400 shadow-lg z-10 opacity-95"
          : isActive
            ? "border-emerald-500 bg-emerald-50"
            : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-grab active:cursor-grabbing touch-none shrink-0"
          aria-label={`Urutkan ${section.label}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="flex-1 min-w-0 text-left"
        >
          <p className="font-semibold text-slate-900 text-sm">{section.label}</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{section.desc}</p>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleVisibility}
            className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${
              isVisible
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {isVisible ? "Aktif" : "Sembunyikan"}
          </button>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
}

export default function KontenPage() {
  const {
    content,
    updateSection,
    publishContent,
    isDirty,
    isSaving,
    dbSynced,
    remoteUpdatedAt,
    publishError,
    loadError,
  } = useContentStore();
  const [activeSection, setActiveSection] = useState<LandingSectionKey | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const orderedSections = useMemo(() => {
    const order = resolveSectionOrder(content.sectionOrder);
    const metaMap = new Map(LANDING_SECTIONS.map((s) => [s.key, s]));
    return order.map((key) => metaMap.get(key)).filter(Boolean) as SectionMeta[];
  }, [content.sectionOrder]);

  const openSection = (key: LandingSectionKey) => {
    setActiveSection(key);
    setEditData(
      JSON.parse(
        JSON.stringify((content as unknown as Record<string, unknown>)[key] ?? {}),
      ),
    );
  };

  const persistToDatabase = async (applyChange: () => void) => {
    applyChange();
    const ok = await publishContent();
    if (ok) {
      setSyncMessage("Tersimpan ke database Supabase");
      setTimeout(() => setSyncMessage(null), 2500);
    }
    return ok;
  };

  const saveSection = async () => {
    if (!activeSection) return;
    if (activeSection === "trustBadges") {
      setSyncMessage("Trust Badges belum bisa diedit di CMS");
      setTimeout(() => setSyncMessage(null), 2500);
      return;
    }
    const ok = await persistToDatabase(() => {
      updateSection(activeSection as keyof SiteContent, editData as never);
    });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const toggleVisibility = async (key: LandingSectionKey) => {
    const updated = {
      ...content.sectionVisibility,
      [key]: !content.sectionVisibility[key],
    };
    await persistToDatabase(() => updateSection("sectionVisibility", updated));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedSections.findIndex((s) => s.key === active.id);
    const newIndex = orderedSections.findIndex((s) => s.key === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newOrder = arrayMove(
      orderedSections.map((s) => s.key),
      oldIndex,
      newIndex,
    );
    await persistToDatabase(() => updateSection("sectionOrder", newOrder));
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Konten Visual Editor</h1>
          <p className="text-slate-500 text-sm mt-1">
            Drag untuk ubah urutan (auto-save ke database) · klik section untuk edit
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${
                dbSynced
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {dbSynced ? "Terhubung Supabase" : "Belum sync database"}
            </span>
            {remoteUpdatedAt && (
              <span className="text-[10px] text-slate-400">
                Update DB: {new Date(remoteUpdatedAt).toLocaleString("id-ID")}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {(publishError || loadError) && (
            <p className="text-xs text-red-600 max-w-xs text-right">
              {publishError || loadError}
            </p>
          )}
          {syncMessage && (
            <p className="text-xs text-emerald-600 font-semibold">{syncMessage}</p>
          )}
          {isDirty && (
            <button
              type="button"
              onClick={() => void publishContent()}
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-slate-900 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Menyimpan…" : "Publish ke Database"}
            </button>
          )}
          <div className="flex gap-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
          >
            <Eye className="w-4 h-4" /> Preview
          </Link>
          <Link
            href="/admin/konten-json"
            className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
          >
            <Edit3 className="w-4 h-4" /> JSON Editor
          </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedSections.map((s) => s.key)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {orderedSections.map((section) => (
                  <SortableSectionRow
                    key={section.key}
                    section={section}
                    isActive={activeSection === section.key}
                    isVisible={content.sectionVisibility[section.key] !== false}
                    onOpen={() => openSection(section.key)}
                    onToggleVisibility={() => toggleVisibility(section.key)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="lg:col-span-2">
          {activeSection ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h2 className="font-bold text-slate-900">
                  Edit: {LANDING_SECTIONS.find((s) => s.key === activeSection)?.label}
                </h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditData(
                        JSON.parse(
                          JSON.stringify(
                            (content as unknown as Record<string, unknown>)[activeSection] || {},
                          ),
                        ),
                      )
                    }
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={saveSection}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saved ? "Tersimpan!" : isSaving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-500 mb-4">
                  Edit field-field di bawah. Atau gunakan{" "}
                  <Link href="/admin/konten-json" className="text-emerald-600 hover:underline">
                    JSON Editor
                  </Link>{" "}
                  untuk edit lebih detail.
                </p>
                <div className="space-y-4">
                  {Object.entries(editData).map(([key, value]: [string, unknown]) => {
                    if (Array.isArray(value)) {
                      return (
                        <div key={key}>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            {key} (Array - {(value as unknown[]).length} item)
                          </label>
                          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 font-mono max-h-40 overflow-y-auto">
                            {JSON.stringify(value, null, 2)}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Edit array via JSON Editor untuk hasil terbaik
                          </p>
                        </div>
                      );
                    }
                    if (typeof value === "object" && value !== null) {
                      return (
                        <div key={key}>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                            {key} (Object)
                          </label>
                          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 font-mono max-h-40 overflow-y-auto">
                            {JSON.stringify(value, null, 2)}
                          </div>
                        </div>
                      );
                    }
                    if (value === null || value === undefined) return null;
                    if (typeof value === "boolean") {
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-slate-700">{key}</label>
                          <button
                            type="button"
                            onClick={() =>
                              setEditData((prev) => ({ ...prev, [key]: !prev[key] }))
                            }
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                              value
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {value ? "Aktif" : "Nonaktif"}
                          </button>
                        </div>
                      );
                    }
                    const isLongText = typeof value === "string" && value.length > 80;
                    return (
                      <div key={key}>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                          {key}
                        </label>
                        {isLongText ? (
                          <textarea
                            rows={3}
                            value={value as string}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-y focus:outline-none focus:border-emerald-400"
                          />
                        ) : (
                          <input
                            value={value as string}
                            onChange={(e) =>
                              setEditData((prev) => ({ ...prev, [key]: e.target.value }))
                            }
                            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Edit3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Pilih section di sebelah kiri untuk mulai mengedit</p>
              <p className="text-slate-400 text-sm mt-2">
                Tarik icon grip untuk mengubah urutan tampilan di landing page
              </p>
            </div>
          )}
        </div>
      </div>

      {isDirty && (
        <div className="fixed bottom-6 right-6 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg max-w-xs">
          Ada perubahan lokal — klik Publish ke Database di sidebar atau header
        </div>
      )}
    </div>
  );
}
