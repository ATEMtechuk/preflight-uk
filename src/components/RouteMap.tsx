"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MapContainer, TileLayer, Polyline, Polygon, Circle, Marker, Popup, Tooltip, ZoomControl, useMap } from "react-leaflet";
import { AIRFIELDS, type Airfield } from "@/lib/airfields";
import type { MetarItem } from "@/lib/aviation";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

export type SigmetPoly = {
  coords: { lat: number; lon: number }[];
  hazard?: string;
  raw?: string;
};

const CAT_COLOR: Record<string, string> = {
  VFR: "#16a34a",
  MVFR: "#2563eb",
  IFR: "#dc2626",
  LIFR: "#c026d3",
};

function dot(color: string, big: boolean) {
  const s = big ? 26 : 16;
  return L.divIcon({
    className: "",
    html: `<div style="width:${s}px;height:${s}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
  });
}

function Fit({ from, to }: { from?: Airfield; to?: Airfield }) {
  const map = useMap();
  useEffect(() => {
    if (from && to) map.fitBounds([[from.lat, from.lon], [to.lat, to.lon]], { padding: [80, 80] });
    else if (from) map.setView([from.lat, from.lon], 8);
  }, [from, to, map]);
  return null;
}

export default function RouteMap({
  from,
  to,
  metars,
  radarOn,
  onPick,
  showRoute,
  showAirfields,
  wxColors,
  showSigmet,
  sigmets,
  showNotam,
  notamFrom,
  notamTo,
  children,
}: {
  from?: Airfield;
  to?: Airfield;
  metars: MetarItem[];
  radarOn: boolean;
  onPick: (icao: string, slot: "from" | "to") => void;
  showRoute: boolean;
  showAirfields: boolean;
  wxColors: boolean;
  showSigmet: boolean;
  sigmets: SigmetPoly[];
  showNotam: boolean;
  notamFrom: number | null;
  notamTo: number | null;
  children?: ReactNode;
}) {
  const [radarUrl, setRadarUrl] = useState("");
  const fromIcao = from?.icao;
  const toIcao = to?.icao;

  useEffect(() => {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  useEffect(() => {
    if (!radarOn || radarUrl) return;
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => r.json())
      .then((d) => {
        const past = d?.radar?.past;
        if (past?.length) setRadarUrl(`${d.host}${past[past.length - 1].path}/256/{z}/{x}/{y}/2/1_1.png`);
      })
      .catch(() => {});
  }, [radarOn, radarUrl]);

  const catByIcao = useMemo(
    () => new Map(metars.map((m) => [String(m.icaoId ?? "").toUpperCase(), String(m.fltCat ?? "").toUpperCase()])),
    [metars]
  );
  const metarByIcao = useMemo(
    () => new Map(metars.map((m) => [String(m.icaoId ?? "").toUpperCase(), m])),
    [metars]
  );

  const sigmetPolys = useMemo(
    () =>
      sigmets.map((s, i) => (
        <Polygon
          key={i}
          positions={s.coords.map((c) => [c.lat, c.lon] as [number, number])}
          pathOptions={{ color: "#dc2626", weight: 2, fillOpacity: 0.14 }}
        >
          <Popup>
            <strong>SIGMET {s.hazard ?? ""}</strong>
            <br />
            <span style={{ fontSize: 11, fontFamily: "monospace" }}>{(s.raw ?? "").slice(0, 300)}</span>
          </Popup>
        </Polygon>
      )),
    [sigmets]
  );

  const fieldMarkers = useMemo(
    () =>
      AIRFIELDS.map((a) => {
        const isFrom = fromIcao === a.icao;
        const isTo = toIcao === a.icao;
        const cat = wxColors ? catByIcao.get(a.icao) : undefined;
        const color = isFrom ? "#09090b" : isTo ? "#3f3f46" : (cat && CAT_COLOR[cat]) || "#71717a";
        const m = metarByIcao.get(a.icao);
        return (
          <Marker key={a.icao} position={[a.lat, a.lon]} icon={dot(color, isFrom || isTo)}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong>{a.icao}</strong> {a.name}
                <br />
                <span style={{ fontSize: 12 }}>
                  Rwy {a.rwy[0]?.qfu} · {a.rwy[0]?.lengthM}m
                </span>
                {m?.rawOb && (
                  <>
                    <br />
                    <span style={{ fontSize: 11, fontFamily: "monospace" }}>
                      {m.fltCat} · {m.rawOb.slice(0, 120)}
                    </span>
                  </>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button onClick={() => onPick(a.icao, "from")} style={{ flex: 1, background: "#09090b", color: "#fff", borderRadius: 8, padding: "6px 0", cursor: "pointer" }}>
                    Set From
                  </button>
                  <button onClick={() => onPick(a.icao, "to")} style={{ flex: 1, border: "1px solid #999", borderRadius: 8, padding: "6px 0", cursor: "pointer" }}>
                    Set To
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      }),
    [fromIcao, toIcao, catByIcao, metarByIcao, wxColors, onPick]
  );

  function ringLabel(n: number | null) {
    if (n == null) return "NOTAM: check PIB";
    return n === 0 ? "NOTAM: none (verify PIB)" : `NOTAM ×${n}`;
  }

  return (
    <MapContainer
      center={[52.6, -1.8]}
      zoom={7}
      zoomControl={false}
      preferCanvas={true}
      zoomSnap={0.5}
      wheelPxPerZoomLevel={110}
      style={{ height: "100%", width: "100%" }}
    >
      <ZoomControl position="bottomright" />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {radarOn && radarUrl && <TileLayer url={radarUrl} opacity={0.6} zIndex={10} maxNativeZoom={7} />}
      <Fit from={from} to={to} />
      {children}
      {showSigmet && sigmetPolys}
      {showNotam && from && (
        <Circle center={[from.lat, from.lon]} radius={9260} pathOptions={{ color: "#d97706", weight: 2, dashArray: "5 5", fillOpacity: 0.05 }}>
          <Tooltip permanent direction="top" className="!bg-amber-500 !text-black !border-0 !rounded-lg !font-semibold">
            {ringLabel(notamFrom)}
          </Tooltip>
        </Circle>
      )}
      {showNotam && to && to.icao !== from?.icao && (
        <Circle center={[to.lat, to.lon]} radius={9260} pathOptions={{ color: "#d97706", weight: 2, dashArray: "5 5", fillOpacity: 0.05 }}>
          <Tooltip permanent direction="top" className="!bg-amber-500 !text-black !border-0 !rounded-lg !font-semibold">
            {ringLabel(notamTo)}
          </Tooltip>
        </Circle>
      )}
      {showAirfields && fieldMarkers}
      {showRoute && from && to && (
        <Polyline
          positions={[[from.lat, from.lon], [to.lat, to.lon]]}
          pathOptions={{ color: "#09090b", weight: 3, dashArray: "8 6" }}
        >
          <Tooltip permanent direction="center" className="!bg-black !text-white !border-0 !rounded-lg">
            {from.icao} → {to.icao}
          </Tooltip>
        </Polyline>
      )}
    </MapContainer>
  );
}
