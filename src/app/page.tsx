"use client";
import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { Plane, MessageCircle, X, ArrowLeftRight, CheckCircle2, TriangleAlert, XCircle, Wind, Fuel, Users, ExternalLink, PanelLeftClose, PanelLeftOpen, ListChecks } from "lucide-react";
import LayersControl, { type LayerState } from "@/components/LayersControl";
import { type SigmetPoly } from "@/components/RouteMap";
import { AIRFIELDS, findAirfield } from "@/lib/airfields";
import { AIRCRAFT, findAircraft } from "@/lib/aircraft";
import { gcDistanceNm, gcBearing, type MetarItem } from "@/lib/aviation";
import { buildBrief } from "@/lib/briefing";
import ChatPanel from "@/components/ChatPanel";

const RouteMap = dynamic(() => import("@/components/RouteMap"), { ssr: false });
const TrafficLayer = dynamic(() => import("@/components/TrafficLayer"), { ssr: false });

type TafItem = { icaoId?: string; rawTAF?: string };

const CHECKS = [
  "Official NATS PIB pulled",
  "METAR + TAF reviewed",
  "NOTAMs reviewed",
  "W&B within limits",
  "Fuel + 45 min reserve",
  "Alternate planned",
];

export default function Home() {
  const [from, setFrom] = useState("EGTK");
  const [to, setTo] = useState("EGKA");
  const [aircraftId, setAircraftId] = useState("c172");
  const [pilotKg, setPilotKg] = useState(85);
  const [paxKg, setPaxKg] = useState("75");
  const [bagsKg, setBagsKg] = useState(10);
  const [fuelL, setFuelL] = useState(120);
  const [loading, setLoading] = useState(false);
  const [metars, setMetars] = useState<MetarItem[]>([]);
  const [tafs, setTafs] = useState<TafItem[]>([]);
  const [sigmetCount, setSigmetCount] = useState(0);
  const [notams, setNotams] = useState<{ raw?: string; text?: string; id?: string; apt?: string }[]>([]);
  const [notamNull, setNotamNull] = useState(true);
  const [notamFromCount, setNotamFromCount] = useState<number | null>(null);
  const [notamToCount, setNotamToCount] = useState<number | null>(null);
  const [fetched, setFetched] = useState(false);
  const [layers, setLayers] = useState<LayerState>({ route: true, airfields: true, wx: true, radar: true, traffic: false, sigmet: true, notam: true });
  const [trafficCount, setTrafficCount] = useState<number | null>(null);
  const [sigmetPolys, setSigmetPolys] = useState<SigmetPoly[]>([]);
  const [checks, setChecks] = useState<boolean[]>(CHECKS.map(() => false));
  const [chatOpen, setChatOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [tab, setTab] = useState<"brief" | "wx" | "notam">("brief");

  const fromA = findAirfield(from);
  const toA = findAirfield(to);
  const ac = findAircraft(aircraftId);
  const routeNm = fromA && toA ? gcDistanceNm(fromA.lat, fromA.lon, toA.lat, toA.lon) : 0;
  const track = fromA && toA ? gcBearing(fromA.lat, fromA.lon, toA.lat, toA.lon) : 0;
  const paxArr = useMemo(
    () => paxKg.split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n) && n > 0),
    [paxKg]
  );

  const rwyHdg = fromA?.rwy[0]?.hdg ?? 0;
  const notamCount = notamNull ? null : notams.length;
  const brief = buildBrief({
    aircraftId, pilotKg, paxKg: paxArr, bagsKg, fuelL, rwyHdg, metars, sigmetCount, notamCount, routeNm,
  });

  const pick = useCallback((icao: string, slot: "from" | "to") => {
    if (slot === "from") setFrom(icao);
    else setTo(icao);
  }, []);

  const toggleLayer = useCallback((k: keyof LayerState) => {
    setLayers((l) => ({ ...l, [k]: !l[k] }));
  }, []);

  async function fetchBrief() {
    setLoading(true);
    try {
      const ids = `${from},${to}`;
      const [m, t, s, nf, nt] = await Promise.all([
        fetch(`/api/metar?ids=${ids}`).then((r) => r.json()),
        fetch(`/api/taf?ids=${ids}`).then((r) => r.json()),
        fetch(`/api/sigmet`).then((r) => r.json()),
        fetch(`/api/notam?ids=${from}`).then((r) => r.json()),
        fetch(`/api/notam?ids=${to}`).then((r) => r.json()),
      ]);
      setMetars(Array.isArray(m.data) ? m.data : []);
      setTafs(Array.isArray(t.data) ? t.data : []);
      setSigmetCount(Number(s.ukCount ?? 0));
      const polys: SigmetPoly[] = (Array.isArray(s.data) ? s.data : [])
        .filter(
          (x: { coords?: { lat: number; lon: number }[] }) =>
            Array.isArray(x.coords) &&
            x.coords.some((c) => c.lat > 49 && c.lat < 60.5 && c.lon > -8 && c.lon < 3)
        )
        .map((x: { coords: { lat: number; lon: number }[]; hazard?: string; rawAirSigmet?: string }) => ({
          coords: x.coords,
          hazard: x.hazard,
          raw: x.rawAirSigmet,
        }));
      setSigmetPolys(polys);
      const norm = (n: { notams?: { raw?: string; message?: string; id?: string }[] }) =>
        Array.isArray(n?.notams)
          ? n.notams.map((x) => ({ raw: x.raw ?? x.message, id: x.id }))
          : null;
      const lf = norm(nf);
      const lt = norm(nt);
      setNotamFromCount(lf ? lf.length : null);
      setNotamToCount(lt ? lt.length : null);
      if (lf || lt) {
        setNotams([...(lf ?? []).map((x) => ({ ...x, apt: from })), ...(lt ?? []).map((x) => ({ ...x, apt: to }))]);
        setNotamNull(false);
      } else {
        setNotams([]);
        setNotamNull(true);
      }
      setFetched(true);
      setTab("brief");
    } finally {
      setLoading(false);
    }
  }

  const StatusIcon = brief.status === "GO" ? CheckCircle2 : brief.status === "CAUTION" ? TriangleAlert : XCircle;
  const statusCls =
    brief.status === "GO"
      ? "bg-emerald-500 text-white"
      : brief.status === "CAUTION"
        ? "bg-amber-500 text-black"
        : "bg-red-600 text-white";

  const inputCls = "min-w-0 rounded-xl border border-black/10 bg-white/70 px-2 py-2 text-sm outline-none dark:border-white/15 dark:bg-white/10";

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#e8e8e8]">
      <div className="absolute inset-0 z-0">
        <RouteMap
          from={fromA}
          to={toA}
          metars={metars}
          radarOn={layers.radar}
          onPick={pick}
          showRoute={layers.route}
          showAirfields={layers.airfields}
          wxColors={layers.wx}
          showSigmet={layers.sigmet}
          sigmets={sigmetPolys}
          showNotam={layers.notam}
          notamFrom={notamFromCount}
          notamTo={notamToCount}
        >
          {layers.traffic && <TrafficLayer onCount={setTrafficCount} />}
        </RouteMap>
      </div>

      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        <div className="card flex items-center gap-2 px-3 py-2 shadow-lg">
          <Plane size={16} />
          <span className="text-sm font-semibold tracking-tight">PreFlight UK</span>
          <span className="hidden text-[11px] opacity-60 sm:inline">click any airfield → Set From / To</span>
        </div>
        <button onClick={() => setPanelOpen(!panelOpen)} className="card p-2 shadow-lg" aria-label="Toggle panel">
          {panelOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </div>

      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="flex items-center gap-1.5 rounded-2xl bg-black px-3 py-2 text-xs font-medium text-white shadow-lg dark:bg-white dark:text-black"
        >
          {chatOpen ? <X size={14} /> : <MessageCircle size={14} />} Co-pilot
        </button>
      </div>

      <AnimatePresence>
        {panelOpen && (
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="absolute bottom-3 left-3 top-16 z-10 flex w-[min(360px,calc(100vw-24px))] flex-col gap-3 overflow-y-auto rounded-2xl border border-black/10 bg-white/90 p-4 shadow-xl backdrop-blur dark:border-white/10 dark:bg-black/85"
          >
            <div className="flex flex-col gap-1.5">
              <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium">From
                <select value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} w-full min-w-0 truncate`}>
                  {AIRFIELDS.map((a) => <option key={a.icao} value={a.icao}>{a.icao} - {a.name}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-black/10 dark:bg-white/15" />
                <button onClick={() => { setFrom(to); setTo(from); }} className="flex items-center gap-1 rounded-full border border-black/10 px-2.5 py-1 text-[11px] font-medium opacity-70 hover:opacity-100 dark:border-white/15" aria-label="Swap from and to">
                  <ArrowLeftRight size={12} /> Swap
                </button>
                <div className="h-px flex-1 bg-black/10 dark:bg-white/15" />
              </div>
              <label className="flex min-w-0 flex-col gap-1 text-[11px] font-medium">To
                <select value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} w-full min-w-0 truncate`}>
                  {AIRFIELDS.map((a) => <option key={a.icao} value={a.icao}>{a.icao} - {a.name}</option>)}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-[11px] font-medium">Aircraft
              <select value={aircraftId} onChange={(e) => setAircraftId(e.target.value)} className={inputCls}>
                {AIRCRAFT.map((a) => <option key={a.id} value={a.id}>{a.name} · MTOW {a.mtowKg}kg</option>)}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-medium">
              <label className="flex flex-col gap-1">Pilot kg<input type="number" value={pilotKg} onChange={(e) => setPilotKg(Number(e.target.value))} className={inputCls} /></label>
              <label className="flex flex-col gap-1">Fuel L<input type="number" value={fuelL} onChange={(e) => setFuelL(Number(e.target.value))} className={inputCls} /></label>
              <label className="flex flex-col gap-1">Pax kg<input value={paxKg} onChange={(e) => setPaxKg(e.target.value)} className={inputCls} /></label>
              <label className="flex flex-col gap-1">Bags kg<input type="number" value={bagsKg} onChange={(e) => setBagsKg(Number(e.target.value))} className={inputCls} /></label>
            </div>

            <div className="flex items-center gap-2 text-[11px] opacity-70">
              <Wind size={13} /> {routeNm.toFixed(0)} NM · trk {track.toFixed(0)}° · ~{routeNm > 0 ? ((routeNm / ac.cruiseKt) * 60).toFixed(0) : 0} min · TOW {brief.towKg.toFixed(0)}kg
            </div>

            <button onClick={fetchBrief} disabled={loading} className="rounded-xl bg-black py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black">
              {loading ? "Briefing…" : "Get briefing"}
            </button>

            <LayersControl
              layers={layers}
              counts={{
                traffic: layers.traffic ? trafficCount : null,
                sigmet: fetched ? sigmetPolys.length : null,
                notam: notamNull ? null : notams.length,
              }}
              onToggle={(k) => {
                toggleLayer(k);
                if (k === "traffic") setTrafficCount(null);
              }}
            />

            <div className="flex gap-1 rounded-xl bg-black/5 p-1 text-xs font-medium dark:bg-white/10">
              {(["brief", "wx", "notam"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg py-1.5 ${tab === t ? "bg-white shadow dark:bg-black" : "opacity-60"}`}>
                  {t === "brief" ? "Brief" : t === "wx" ? `Weather${fetched && metars.length ? ` (${metars.length})` : ""}` : `NOTAM${notamNull ? "" : ` (${notams.length})`}`}
                </button>
              ))}
            </div>

            {tab === "brief" && (
              <>
                <div className={`rounded-2xl p-3 ${fetched ? statusCls : "bg-black/5 dark:bg-white/10"}`}>
                  <div className="flex items-center gap-2">
                    {fetched && <StatusIcon size={18} />}
                    <span className="text-sm font-semibold">{fetched ? `${brief.status} · ${brief.cat}` : "Ready"}</span>
                  </div>
                  <ul className="mt-1.5 flex flex-col gap-1.5 text-[13px] leading-5">
                    {(fetched ? brief.bullets : ["Pick airfields on the map, set load, then Get briefing."]).map((b, i) => <li key={i}>• {b}</li>)}
                  </ul>
                </div>
                <div className="rounded-2xl border border-black/10 p-3 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <ListChecks size={15} />
                    <span className="text-[13px] font-semibold">Pre-flight checks</span>
                    <span className="ml-auto text-[11px] opacity-60">{checks.filter(Boolean).length}/{CHECKS.length}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${(checks.filter(Boolean).length / CHECKS.length) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-col gap-1">
                    {CHECKS.map((c, i) => (
                      <label key={c} className="flex cursor-pointer items-center gap-2 text-[13px]">
                        <input
                          type="checkbox"
                          checked={checks[i]}
                          onChange={() => setChecks((prev) => prev.map((v, j) => (j === i ? !v : v)))}
                          className="h-4 w-4 accent-black dark:accent-white"
                        />
                        <span className={checks[i] ? "opacity-45 line-through" : ""}>{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === "wx" && (
              <div className="flex flex-col gap-2">
                {!fetched && <div className="text-xs opacity-60">No data yet - hit Get briefing.</div>}
                {metars.map((m, i) => (
                  <div key={i} className="rounded-xl bg-black/5 p-2 font-mono text-[11px] leading-5 dark:bg-white/10">
                    <span className="font-sans font-semibold">{m.icaoId} {m.fltCat}</span><br />{m.rawOb}
                  </div>
                ))}
                {tafs.slice(0, 4).map((t, i) => (
                  <div key={`t${i}`} className="rounded-xl border border-black/10 p-2 font-mono text-[11px] leading-5 dark:border-white/10">
                    <span className="font-sans font-semibold">{t.icaoId}</span><br />{t.rawTAF}
                  </div>
                ))}
                <div className="text-[11px] opacity-70">UK SIGMETs in scope: {sigmetCount}</div>
              </div>
            )}

            {tab === "notam" && (
              <div className="flex flex-col gap-2">
                {notamNull
                  ? <div className="text-xs leading-5 opacity-70">Open NOTAMs need CHECKWX_API_KEY in .env. Always pull the official NATS PIB.</div>
                  : notams.length === 0
                    ? <div className="text-xs opacity-70">None returned - still verify with NATS PIB.</div>
                    : <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto font-mono text-[11px] leading-5">
                      {notams.slice(0, 20).map((n, i) => <li key={i} className="rounded-xl bg-black/5 p-2 dark:bg-white/10">{n.apt ? `[${n.apt}] ` : ""}{n.raw ?? n.text ?? JSON.stringify(n)}</li>)}
                    </ul>}
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <a className="inline-flex items-center gap-1 underline opacity-70" href="https://nats.aero/ais" target="_blank" rel="noreferrer">NATS AIS <ExternalLink size={11} /></a>
                  <a className="inline-flex items-center gap-1 underline opacity-70" href="https://nats-uk.ead-it.com/" target="_blank" rel="noreferrer">PIB tool <ExternalLink size={11} /></a>
                  <a className="inline-flex items-center gap-1 underline opacity-70" href="https://www.metoffice.gov.uk/services/transport/aviation/regulated/mavis" target="_blank" rel="noreferrer">MAVIS <ExternalLink size={11} /></a>
                </div>
              </div>
            )}

            <div className="mt-auto flex flex-col gap-1 text-[11px] opacity-70">
              <div className="flex items-center gap-1.5"><Fuel size={12} /> {brief.enduranceH.toFixed(1)}h endurance · {brief.reserveMin.toFixed(0)} min reserve</div>
              <div className="flex items-center gap-1.5"><Users size={12} /> {1 + paxArr.length} POB</div>
              <div className="leading-4">Planning aid only - verify with NATS PIB + MAVIS.</div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="absolute bottom-3 right-3 top-16 z-10 w-[min(380px,calc(100vw-24px))]"
          >
            <div className="h-full overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-xl backdrop-blur dark:border-white/10 dark:bg-black/90">
              <ChatPanel
                getContext={() => ({ aircraftId, pilotKg, paxKg: paxArr, bagsKg, fuelL, rwyHdg, routeNm, metars, sigmetCount, notamCount })}
                briefState={{
                  routeEdited: from !== "EGTK" || to !== "EGKA",
                  loadDeclared: aircraftId !== "c172" || pilotKg !== 85 || paxKg !== "75" || bagsKg !== 10 || fuelL !== 120,
                  weatherReady: fetched && metars.length > 0,
                  notamsReady: !notamNull,
                  checksDone: checks.filter(Boolean).length,
                  checksTotal: CHECKS.length,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {fetched && !panelOpen && (
        <div className={`absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${statusCls}`}>
          <StatusIcon size={16} /> {brief.status} · {routeNm.toFixed(0)} NM · {brief.cat}
        </div>
      )}
    </div>
  );
}
