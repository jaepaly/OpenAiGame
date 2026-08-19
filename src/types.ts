export type CloudKind = "cumulus" | "rain" | "electric";
export type ContractId = "water" | "climate" | "energy";
export type FlightRouteId = "tailwind" | "pressureMine" | "frontline";

export interface CloudDefinition {
  kind: CloudKind;
  name: string;
  icon: string;
  value: number;
  resistance: number;
  radius: [number, number];
  color: string;
  shadow: string;
  unlockRank: number;
  health: number;
}

export interface Cloud {
  id: number;
  kind: CloudKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  charged: boolean;
  age: number;
  health: number;
  maxHealth: number;
  hurtFlash: number;
  dense: boolean;
  front: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  description: string;
  icon: string;
  baseCost: number;
  maxLevel: number;
}

export type UpgradeId = "power" | "radius" | "value" | "drone" | "insulation";

export interface GameState {
  money: number;
  totalEarned: number;
  harvested: number;
  rank: number;
  levels: Record<UpgradeId, number>;
  bestCombo: number;
  sound: boolean;
}

export type RunSkillId = "overclock" | "wideIntake" | "chainBurst" | "profitRain" | "feverDrive" | "twinDrone";

export interface RunSkillDefinition {
  id: RunSkillId;
  name: string;
  description: string;
  icon: string;
  color: string;
  maxStacks: number;
}

export interface RunState {
  level: number;
  xp: number;
  xpNext: number;
  fever: number;
  feverActive: boolean;
  feverSeconds: number;
  combo: number;
  comboTime: number;
  pendingPicks: number;
  cargo: Record<CloudKind, number>;
  cargoValue: Record<CloudKind, number>;
  cargoBonus: number;
  cargoCapacity: number;
  routeId: FlightRouteId;
  skills: Record<RunSkillId, number>;
}

export interface FlightRouteDefinition {
  id: FlightRouteId;
  code: string;
  name: string;
  description: string;
  effect: string;
  color: string;
  capacityBonus: number;
  denseBonus: number;
  spawnInterval: number;
  valueMultiplier: number;
  frontDelay: number;
  frontBonus: number;
}

export interface ProcessingContract {
  id: ContractId;
  code: string;
  name: string;
  description: string;
  multipliers: Record<CloudKind, number>;
}

export interface RankDefinition {
  name: string;
  altitude: string;
  promotionCost: number;
  requiredHarvest: number;
  weights: Record<CloudKind, number>;
  description: string;
}
