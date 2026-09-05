export type MetarItem = {
  icaoId?: string;
  rawOb?: string;
  fltCat?: string;
  temp?: number;
  dewp?: number;
  wdir?: number;
  wspd?: number;
  wgst?: number;
  visib?: number;
  cover?: string;
  obTime?: string;
};

export function toRad(d: number) {
  return (d * Math.PI) / 180;
}

export function gcDistanceNm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 3440.065;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function gcBearing(aLat: number, aLon: number, bLat: number, bLon: number) {
  const y = Math.sin(toRad(bLon - aLon)) * Math.cos(toRad(bLat));
  const x =
    Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) -
    Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(toRad(bLon - aLon));
  return (toRad(360) + Math.atan2(y, x)) % 360 >= 0
    ? ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
    : 0;
}

export function crosswind(wdir: number | undefined, wspd: number | undefined, rwyHdg: number) {
  if (wdir == null || wspd == null) return { cross: 0, head: 0 };
  const rel = toRad(wdir - rwyHdg);
  return { cross: Math.abs(wspd * Math.sin(rel)), head: wspd * Math.cos(rel) };
}

export function worstFltCat(items: MetarItem[]) {
  const order = ["VFR", "MVFR", "IFR", "LIFR"];
  let worst = "VFR";
  for (const m of items) {
    const c = (m.fltCat ?? "VFR").toUpperCase();
    if (order.indexOf(c) > order.indexOf(worst)) worst = c;
  }
  return worst;
}
