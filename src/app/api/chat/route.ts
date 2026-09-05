import { NextResponse } from "next/server";
import { buildBrief } from "@/lib/briefing";
import type { MetarItem } from "@/lib/aviation";

type ChatBody = {
  message: string;
  context?: {
    aircraftId?: string;
    pilotKg?: number;
    paxKg?: number[];
    bagsKg?: number;
    fuelL?: number;
    rwyHdg?: number;
    routeNm?: number;
    metars?: MetarItem[];
    sigmetCount?: number;
    notamCount?: number | null;
  };
};

function parsePax(message: string) {
  const icao = (message.match(/\bEG[A-Z]{2}\b/gi) ?? []).map((s) => s.toUpperCase());
  const kg = [...message.matchAll(/(\d{2,3})\s?kg/gi)].map((m) => Number(m[1]));
  const pax = [...message.matchAll(/(\d)\s?(?:pax|passenger)/gi)].map((m) => Number(m[1]));
  const fuel = message.match(/(\d{2,3})\s?(?:l|litre|liter)/i);
  return { icao, kg, pax, fuelL: fuel ? Number(fuel[1]) : undefined };
}

export async function POST(req: Request) {
  const body = (await req.json()) as ChatBody;
  const message = body.message ?? "";
  const ctx = body.context ?? {};
  const parsed = parsePax(message);
  const key = process.env.OPENAI_API_KEY;

  const brief = buildBrief({
    aircraftId: ctx.aircraftId ?? "c172",
    pilotKg: ctx.pilotKg ?? 85,
    paxKg: ctx.paxKg ?? [],
    bagsKg: ctx.bagsKg ?? 0,
    fuelL: ctx.fuelL ?? parsed.fuelL ?? 120,
    rwyHdg: ctx.rwyHdg ?? 30,
    metars: ctx.metars ?? [],
    sigmetCount: ctx.sigmetCount ?? 0,
    notamCount: ctx.notamCount ?? null,
    routeNm: ctx.routeNm ?? 0,
  });

  const localReply = [
    `**${brief.status}** - ${brief.bullets[0] ?? ""}`,
    ...brief.bullets.slice(1).map((b) => `• ${b}`),
    parsed.icao.length ? `Airfields mentioned: ${parsed.icao.join(", ")}.` : "",
    `Tell me e.g. "C172, 2 POB 170kg total, 100L fuel, EGTK to EGKA" and I'll re-brief weight, fuel and wind.`,
  ]
    .filter(Boolean)
    .join("\n");

  if (!key) return NextResponse.json({ reply: localReply, brief, mode: "local-rules" });

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a UK GA flight-briefing co-pilot. Be concise, safety-first, conservative. Consider weight & balance, fuel reserves (45min VFR), crosswind limits, flight categories, SIGMETs and NOTAMs. Always say to verify with official NATS PIB and Met Office MAVIS. Never invent NOTAMs or METARs.",
          },
          { role: "user", content: `${message}\n\nLive brief: ${JSON.stringify(brief).slice(0, 3000)}` },
        ],
        max_tokens: 500,
      }),
    });
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content ?? localReply;
    return NextResponse.json({ reply, brief, mode: "openai" });
  } catch {
    return NextResponse.json({ reply: localReply, brief, mode: "local-rules-fallback" });
  }
}
