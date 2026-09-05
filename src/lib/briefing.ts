import { crosswind, worstFltCat, type MetarItem } from "./aviation";
import { findAircraft } from "./aircraft";

export type BriefInput = {
  aircraftId: string;
  pilotKg: number;
  paxKg: number[];
  bagsKg: number;
  fuelL: number;
  rwyHdg: number;
  metars: MetarItem[];
  sigmetCount: number;
  notamCount: number | null;
  routeNm: number;
};

export function buildBrief(input: BriefInput) {
  const ac = findAircraft(input.aircraftId);
  const fuelKg = input.fuelL * ac.fuelKgPerL;
  const loadKg = input.pilotKg + input.paxKg.reduce((a, b) => a + b, 0) + input.bagsKg;
  const towKg = ac.emptyKg + loadKg + fuelKg;
  const overMtow = towKg - ac.mtowKg;
  const enduranceH = input.fuelL / ac.fuelBurnLph;
  const stillAirMin = input.routeNm > 0 ? (input.routeNm / ac.cruiseKt) * 60 : 0;
  const reserveMin = enduranceH * 60 - stillAirMin;
  const cat = worstFltCat(input.metars);
  const m0 = input.metars[0];
  const wind = m0 ? crosswind(m0.wdir, m0.wspd, input.rwyHdg) : { cross: 0, head: 0 };
  const bullets: string[] = [];
  let status: "GO" | "CAUTION" | "NO-GO" = "GO";

  const flag = (s: "CAUTION" | "NO-GO") => {
    if (s === "NO-GO") status = "NO-GO";
    else if (status === "GO") status = "CAUTION";
  };

  if (overMtow > 0) {
    flag("NO-GO");
    bullets.push(`Over MTOW by ${overMtow.toFixed(0)} kg (${towKg.toFixed(0)} vs ${ac.mtowKg} kg limit). Offload fuel, bags or a passenger.`);
  } else {
    bullets.push(`Weight OK: TOW ${towKg.toFixed(0)} kg, margin ${(ac.mtowKg - towKg).toFixed(0)} kg under MTOW.`);
  }
  if (reserveMin < 45 && input.routeNm > 0) {
    flag(reserveMin < 30 ? "NO-GO" : "CAUTION");
    bullets.push(`Fuel reserve ${reserveMin.toFixed(0)} min is below 45 min VFR reserve. Add fuel or shorten leg.`);
  } else if (input.routeNm > 0) {
    bullets.push(`Fuel OK: ${enduranceH.toFixed(1)} h endurance, ~${reserveMin.toFixed(0)} min reserve after ${stillAirMin.toFixed(0)} min leg.`);
  }
  if (cat === "LIFR" || cat === "IFR") {
    flag("NO-GO");
    bullets.push(`Flight category ${cat} at departure/destination. Not suitable for VFR; IFR only with rating, equipped aircraft and alternates.`);
  } else if (cat === "MVFR") {
    flag("CAUTION");
    bullets.push(`MVFR conditions reported. Plan escape routes, check cloud base vs MSA and personal minima.`);
  } else {
    bullets.push(`Flight category VFR. Still check TAF trend, cloud base and visibility minima.`);
  }
  if (wind.cross > ac.maxCrosswindKt) {
    flag("NO-GO");
    bullets.push(`Crosswind ${wind.cross.toFixed(0)} kt exceeds ${ac.name} demonstrated limit ${ac.maxCrosswindKt} kt.`);
  } else if (wind.cross > ac.maxCrosswindKt * 0.7 && (m0?.wspd ?? 0) > 0) {
    flag("CAUTION");
    bullets.push(`Crosswind ${wind.cross.toFixed(0)} kt is sporty (${Math.round((wind.cross / ac.maxCrosswindKt) * 100)}% of limit). Consider another runway or delay.`);
  } else if ((m0?.wspd ?? 0) > 0) {
    bullets.push(`Wind OK: cross ${wind.cross.toFixed(0)} kt, head ${wind.head.toFixed(0)} kt on runway ${input.rwyHdg}°.`);
  }
  if ((m0?.wgst ?? 0) >= 25 || (m0?.wspd ?? 0) >= 25) {
    flag("CAUTION");
    bullets.push(`Strong surface wind ${m0?.wspd}G${m0?.wgst ?? ""} kt. Check turbulence, rotor and personal limits.`);
  }
  if (input.sigmetCount > 0) {
    flag("CAUTION");
    bullets.push(`${input.sigmetCount} active SIGMET(s) in scope. Read for TS, icing, turb or mountain waves along route.`);
  }
  if (input.notamCount == null) {
    flag("CAUTION");
    bullets.push(`NOTAMs not fetched from an official source. Pull an official NATS PIB before flight - links below.`);
  } else if (input.notamCount > 0) {
    flag("CAUTION");
    bullets.push(`${input.notamCount} NOTAM(s) returned for briefing airports. Review closures, nav-aid outages and restrictions.`);
  } else {
    bullets.push(`No NOTAMs returned by open source - still verify with an official NATS PIB.`);
  }
  bullets.push(`Always cross-check with NATS AIS (PIB) and Met Office MAVIS; this app is a planning aid, not an official briefing.`);
  return { status, bullets, towKg, enduranceH, reserveMin, cat, wind };
}
