import { Suspense } from "react";
import { loadFroyekPublished } from "@/lib/froyek/loadContent";
import { InterviewWizard } from "@/components/froyek/InterviewWizard";
import { FroyekToasts } from "@/components/froyek/FroyekToasts";

export const metadata = {
  title: "Pilih paket",
  description: "Wawancara singkat untuk memilih paket froyek atau lisensi Estimator.",
};

export default async function PilihPage() {
  const content = await loadFroyekPublished();
  return (
    <div className="froyek-site bg-white">
      <FroyekToasts />
      <Suspense fallback={<p className="p-8">Memuat wawancara…</p>}>
        <InterviewWizard content={content} />
      </Suspense>
    </div>
  );
}
