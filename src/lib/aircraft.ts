export type Aircraft = {
  id: string;
  name: string;
  mtowKg: number;
  emptyKg: number;
  maxFuelL: number;
  fuelKgPerL: number;
  maxCrosswindKt: number;
  cruiseKt: number;
  fuelBurnLph: number;
};

export const AIRCRAFT: Aircraft[] = [
  { id: "c152", name: "Cessna 152", mtowKg: 757, emptyKg: 490, maxFuelL: 98, fuelKgPerL: 0.72, maxCrosswindKt: 12, cruiseKt: 95, fuelBurnLph: 24 },
  { id: "c172", name: "Cessna 172S", mtowKg: 1157, emptyKg: 767, maxFuelL: 212, fuelKgPerL: 0.72, maxCrosswindKt: 15, cruiseKt: 110, fuelBurnLph: 36 },
  { id: "pa28", name: "Piper PA-28-161", mtowKg: 1157, emptyKg: 723, maxFuelL: 182, fuelKgPerL: 0.72, maxCrosswindKt: 17, cruiseKt: 108, fuelBurnLph: 34 },
  { id: "da40", name: "Diamond DA40 NG", mtowKg: 1310, emptyKg: 880, maxFuelL: 147, fuelKgPerL: 0.84, maxCrosswindKt: 15, cruiseKt: 135, fuelBurnLph: 34 },
  { id: "dr400", name: "Robin DR400", mtowKg: 1100, emptyKg: 650, maxFuelL: 190, fuelKgPerL: 0.72, maxCrosswindKt: 15, cruiseKt: 110, fuelBurnLph: 36 },
];

export function findAircraft(id: string) {
  return AIRCRAFT.find((a) => a.id === id) ?? AIRCRAFT[1];
}
