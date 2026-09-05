import { NextResponse } from "next/server";

export async function GET() {
  try {
    const r = await fetch("https://aviationweather.gov/api/data/airsigmet?format=json", {
      headers: { "User-Agent": "preflight-uk/1.0" },
      next: { revalidate: 300 },
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json();
    const arr = Array.isArray(data) ? data : [];
    const uk = arr.filter((s: { firId?: string; icaoId?: string; rawAirSigmet?: string }) =>
      /EG|London|Scottish|Shanwick/i.test(
        `${s.firId ?? ""} ${s.icaoId ?? ""} ${s.rawAirSigmet ?? ""}`.slice(0, 2000)
      )
    );
    return NextResponse.json({ source: "aviationweather.gov", count: arr.length, ukCount: uk.length, data: uk.slice(0, 50) });
  } catch (e) {
    return NextResponse.json({ error: "SIGMET fetch failed", detail: String(e) }, { status: 502 });
  }
}
