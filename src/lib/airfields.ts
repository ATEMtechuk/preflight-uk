export type Airfield = {
  icao: string;
  name: string;
  lat: number;
  lon: number;
  rwy: { qfu: string; hdg: number; lengthM: number }[];
};

export const AIRFIELDS: Airfield[] = [
  { icao: "EGTK", name: "Oxford Kidlington", lat: 51.8369, lon: -1.32, rwy: [{ qfu: "01/19", hdg: 10, lengthM: 1648 }] },
  { icao: "EGLF", name: "Farnborough", lat: 51.2758, lon: -0.7764, rwy: [{ qfu: "06/24", hdg: 60, lengthM: 2440 }] },
  { icao: "EGKB", name: "Biggin Hill", lat: 51.3308, lon: 0.0325, rwy: [{ qfu: "03/21", hdg: 30, lengthM: 1820 }] },
  { icao: "EGKA", name: "Shoreham", lat: 50.8355, lon: -0.2974, rwy: [{ qfu: "02/20", hdg: 20, lengthM: 1036 }] },
  { icao: "EGHF", name: "Lee-on-Solent", lat: 50.8089, lon: -1.3564, rwy: [{ qfu: "05/23", hdg: 50, lengthM: 1317 }] },
  { icao: "EGHI", name: "Southampton", lat: 50.9503, lon: -1.3568, rwy: [{ qfu: "02/20", hdg: 20, lengthM: 1723 }] },
  { icao: "EGTC", name: "Cranfield", lat: 52.0722, lon: -0.6164, rwy: [{ qfu: "03/21", hdg: 30, lengthM: 1799 }] },
  { icao: "EGTF", name: "Fairoaks", lat: 51.3481, lon: -0.5581, rwy: [{ qfu: "06/24", hdg: 60, lengthM: 813 }] },
  { icao: "EGLK", name: "Blackbushe", lat: 51.3239, lon: -0.8475, rwy: [{ qfu: "07/25", hdg: 70, lengthM: 1335 }] },
  { icao: "EGSG", name: "Stapleford", lat: 51.6533, lon: 0.1561, rwy: [{ qfu: "04/22", hdg: 40, lengthM: 1077 }] },
  { icao: "EGSC", name: "Cambridge", lat: 52.205, lon: 0.175, rwy: [{ qfu: "05/23", hdg: 50, lengthM: 1965 }] },
  { icao: "EGBJ", name: "Gloucester", lat: 51.8942, lon: -2.1678, rwy: [{ qfu: "04/22", hdg: 40, lengthM: 1431 }] },
  { icao: "EGBP", name: "Kemble", lat: 51.6681, lon: -2.0569, rwy: [{ qfu: "08/26", hdg: 80, lengthM: 2001 }] },
  { icao: "EGMD", name: "Lydd", lat: 50.9561, lon: 0.9392, rwy: [{ qfu: "03/21", hdg: 30, lengthM: 1505 }] },
  { icao: "EGBB", name: "Birmingham", lat: 52.4539, lon: -1.7481, rwy: [{ qfu: "15/33", hdg: 150, lengthM: 3052 }] },
  { icao: "EGNX", name: "East Midlands", lat: 52.8311, lon: -1.3281, rwy: [{ qfu: "09/27", hdg: 90, lengthM: 2893 }] },
  { icao: "EGCC", name: "Manchester", lat: 53.3539, lon: -2.275, rwy: [{ qfu: "05/23", hdg: 50, lengthM: 3048 }] },
  { icao: "EGNM", name: "Leeds Bradford", lat: 53.8659, lon: -1.6606, rwy: [{ qfu: "14/32", hdg: 140, lengthM: 2250 }] },
  { icao: "EGNT", name: "Newcastle", lat: 53.918, lon: -1.691, rwy: [{ qfu: "07/25", hdg: 70, lengthM: 2329 }] },
  { icao: "EGPH", name: "Edinburgh", lat: 53.8656, lon: -3.3725, rwy: [{ qfu: "06/24", hdg: 60, lengthM: 2560 }] },
  { icao: "EGPF", name: "Glasgow", lat: 55.8719, lon: -4.4331, rwy: [{ qfu: "05/23", hdg: 50, lengthM: 2658 }] },
  { icao: "EGFF", name: "Cardiff", lat: 51.3967, lon: -3.3433, rwy: [{ qfu: "12/30", hdg: 120, lengthM: 2354 }] },
  { icao: "EGAA", name: "Belfast Intl", lat: 54.6575, lon: -6.2158, rwy: [{ qfu: "07/25", hdg: 70, lengthM: 2780 }] },
  { icao: "EGNJ", name: "Humberside", lat: 53.5744, lon: -0.3508, rwy: [{ qfu: "02/20", hdg: 20, lengthM: 2196 }] },
];

export function findAirfield(icao: string) {
  return AIRFIELDS.find((a) => a.icao === icao.toUpperCase());
}
