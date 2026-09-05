import { NextResponse } from "next/server";

export async function GET() {
  try {
    const r = await fetch(
      "https://opensky-network.org/api/states/all?lamin=49.4&lamax=59.2&lomin=-7&lomax=2.5",
      { headers: { "User-Agent": "preflight-uk/1.0" }, next: { revalidate: 60 } }
    );
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json();
    const states: unknown[][] = Array.isArray(data?.states) ? data.states : [];
    const ac = states
      .filter((s) => s[6] != null && s[5] != null)
      .slice(0, 400)
      .map((s) => ({
        icao24: String(s[0] ?? ""),
        callsign: String(s[1] ?? "").trim(),
        lon: Number(s[5]),
        lat: Number(s[6]),
        altM: s[7] == null ? null : Number(s[7]),
        spdMs: s[9] == null ? null : Number(s[9]),
        track: s[10] == null ? null : Number(s[10]),
      }));
    return NextResponse.json({ source: "opensky", count: ac.length, time: data?.time ?? null, ac });
  } catch (e) {
    return NextResponse.json({ error: "Traffic fetch failed", detail: String(e) }, { status: 502 });
  }
}
