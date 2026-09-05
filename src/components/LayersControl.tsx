"use client";
import { useState } from "react";
import { Layers, ChevronDown } from "lucide-react";

export type LayerState = {
  route: boolean;
  airfields: boolean;
  wx: boolean;
  radar: boolean;
  traffic: boolean;
  sigmet: boolean;
  notam: boolean;
};

const DEFS: { key: keyof LayerState; label: string; dot: string; hint: string }[] = [
  { key: "route", label: "Flight path", dot: "#09090b", hint: "great-circle leg" },
  { key: "airfields", label: "Airfields", dot: "#71717a", hint: "24 UK GA fields" },
  { key: "wx", label: "Weather overlay", dot: "#16a34a", hint: "METAR flight-category colours" },
  { key: "radar", label: "Rain radar", dot: "#2563eb", hint: "live precipitation" },
  { key: "traffic", label: "Live traffic", dot: "#0284c7", hint: "ADS-B over UK" },
  { key: "sigmet", label: "SIGMET overlay", dot: "#dc2626", hint: "hazard polygons" },
  { key: "notam", label: "NOTAM overlay", dot: "#d97706", hint: "5 NM briefing rings" },
];

export default function LayersControl({
  layers,
  counts,
  onToggle,
}: {
  layers: LayerState;
  counts: Partial<Record<keyof LayerState, number | null>>;
  onToggle: (k: keyof LayerState) => void;
}) {
  const [open, setOpen] = useState(true);
  const active = DEFS.filter((d) => layers[d.key]).length;
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2.5" aria-expanded={open}>
        <Layers size={15} />
        <span className="text-[13px] font-semibold">Map overlays</span>
        <span className="text-[11px] opacity-60">{active}/{DEFS.length} on</span>
        <ChevronDown size={15} className={`ml-auto opacity-60 transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && (
        <div className="flex flex-col gap-0.5 px-1.5 pb-2">
          {DEFS.map((d) => {
            const c = counts[d.key];
            return (
              <label key={d.key} className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">
                <input
                  type="checkbox"
                  checked={layers[d.key]}
                  onChange={() => onToggle(d.key)}
                  className="h-4 w-4 shrink-0 accent-black dark:accent-white"
                />
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.dot }} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13px] font-medium leading-4">
                    {d.label}
                    {c != null && <span className="ml-1.5 text-[11px] opacity-60">{c}</span>}
                  </span>
                  <span className="truncate text-[11px] opacity-55">{d.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
