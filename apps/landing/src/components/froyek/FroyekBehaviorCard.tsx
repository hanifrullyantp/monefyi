"use client";

import { useEffect, useState } from "react";

export function FroyekBehaviorCard() {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    void fetch("/api/analytics/funnel")
      .then((res) => res.json())
      .then((json) => {
        if (json?.behaviorCounts) setCounts(json.behaviorCounts);
      })
      .catch(() => undefined);
  }, []);

  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return (
      <p className="mb-6 rounded-2xl bg-white p-4 text-sm text-slate-600">
        Peristiwa landing Froyek belum tercatat di proses server ini. Hitungan ini hidup selama proses berjalan, sama seperti funnel checkout yang sudah ada.
      </p>
    );
  }

  return (
    <div className="mb-6 rounded-2xl bg-white p-4">
      <h2 className="font-semibold text-slate-900">Peristiwa landing Froyek</h2>
      <ul className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
        {entries.map(([event, count]) => (
          <li key={event} className="flex justify-between gap-4 border-b border-slate-100 py-1">
            <span>{event}</span>
            <span>{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
