import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat") ?? "51.5");
  const lon = Number(searchParams.get("lon") ?? "-1.0");
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,dew_point_2m,precipitation,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m&forecast_days=2&models=ukmo_seamless`,
      { next: { revalidate: 900 } }
    );
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json();
    return NextResponse.json({ source: "open-meteo/ukmo", data });
  } catch (e) {
    return NextResponse.json({ error: "Enroute fetch failed", detail: String(e) }, { status: 502 });
  }
}
