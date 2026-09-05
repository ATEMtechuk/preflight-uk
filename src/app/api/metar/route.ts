import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") ?? "EGTK").toUpperCase().slice(0, 200);
  try {
    const r = await fetch(
      `https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(ids)}&format=json`,
      { headers: { "User-Agent": "preflight-uk/1.0" }, next: { revalidate: 120 } }
    );
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json();
    return NextResponse.json({ source: "aviationweather.gov", data });
  } catch (e) {
    return NextResponse.json({ error: "METAR fetch failed", detail: String(e) }, { status: 502 });
  }
}
