import { NextResponse } from "next/server";

const OFFICIAL = [
  { label: "NATS AIS briefing (official PIB)", url: "https://nats.aero/ais" },
  { label: "NATS AIS Internet Briefing System", url: "https://nats-uk.ead-it.com/" },
  { label: "Met Office MAVIS (official wx)", url: "https://www.metoffice.gov.uk/services/transport/aviation/regulated/mavis" },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = (searchParams.get("ids") ?? "EGTK").toUpperCase().slice(0, 200);
  const key = process.env.CHECKWX_API_KEY;
  if (!key) {
    return NextResponse.json({
      source: "unconfigured",
      count: null,
      notams: [],
      official: OFFICIAL,
      notice:
        "Set CHECKWX_API_KEY for open NOTAMs, and always pull an official NATS PIB before flight. NATS requires login so it cannot be proxied here.",
      query: ids,
    });
  }
  try {
    const first = ids.split(",")[0].trim();
    const r = await fetch(`https://api.checkwx.com/NOTAM/${encodeURIComponent(first)}?data={"count":50}`, {
      headers: { "X-API-Key": key },
      next: { revalidate: 300 },
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json();
    const list = Array.isArray(data?.data) ? data.data : [];
    return NextResponse.json({ source: "checkwx", count: list.length, notams: list.slice(0, 50), official: OFFICIAL });
  } catch (e) {
    return NextResponse.json({ error: "NOTAM fetch failed", official: OFFICIAL, detail: String(e) }, { status: 502 });
  }
}
