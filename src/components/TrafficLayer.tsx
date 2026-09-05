"use client";
import { useEffect, useState } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

export type Aircraft = {
  icao24: string;
  callsign: string;
  lat: number;
  lon: number;
  altM: number | null;
  spdMs: number | null;
  track: number | null;
};

function planeIcon(track: number | null) {
  return L.divIcon({
    className: "",
    html: `<div style="transform:rotate(${(track ?? 0).toFixed(0)}deg);font-size:16px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))">✈</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export default function TrafficLayer({ onCount }: { onCount?: (n: number) => void }) {
  const [ac, setAc] = useState<Aircraft[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/traffic");
        const d = await r.json();
        if (!alive) return;
        if (Array.isArray(d.ac)) {
          setAc(d.ac);
          onCount?.(d.ac.length);
        }
      } catch {}
    }
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [onCount]);

  return (
    <>
      {ac.map((a) => (
        <Marker key={a.icao24} position={[a.lat, a.lon]} icon={planeIcon(a.track)}>
          <Popup>
            <strong>{a.callsign || a.icao24}</strong>
            <br />
            <span style={{ fontSize: 12 }}>
              {a.altM != null ? `${Math.round(a.altM * 3.28084).toLocaleString()} ft` : "-"}
              {a.spdMs != null ? ` · ${Math.round(a.spdMs * 1.94384)} kt` : ""}
              {a.track != null ? ` · hdg ${Math.round(a.track)}°` : ""}
            </span>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
