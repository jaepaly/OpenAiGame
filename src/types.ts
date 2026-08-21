export type CloudKind = "cumulus" | "rain" | "electric" | "ice" | "solar" | "aurora";
export type CloudFormationKind = "ring" | "stream" | "cluster";
export type ContractId = "water" | "climate" | "energy" | "cryogenic" | "stellar" | "spectrum";
export type FlightRouteId = "tailwind" | "pressureMine" | "frontline";
export type ResearchId = "logistics" | "refining" | "forecasting";

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
  formationId?: number;
  formationCore?: boolean;
  formationKind?: CloudFormationKind;
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
  shape?: "spark" | "drop" | "shard" | "ribbon";
  gravity?: number;
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
  research: Record<ResearchId, number>;
  bestCombo: number;
  sound: boolean;
  materials: Record<CloudKind, number>;
  career: CareerProgress;
}

export type CoreRunSkillId =
  | "overclock" | "intakeServo" | "wideIntake" | "pressureChamber" | "massInduction" | "vacuumMomentum"
  | "profitRain" | "comboCapacitor" | "feverDrive" | "feverInjector" | "stormCatalyst" | "jackpotPulse"
  | "twinDrone" | "droneAI" | "chainBurst" | "relayBurst" | "salvageProtocol" | "swarmMatrix";
export type EvolutionSkillId = "blackHole" | "eventHorizon" | "goldenStorm" | "sunStorm" | "droneFleet" | "nanoSwarm";
export type OverdriveSkillId = "cargoBay" | "yieldBoost" | "denseRadar" | "feverReserve";
export type SynergySkillId = "cycloneCore" | "cascadeGrid" | "stormDrones" | "goldenVacuum" | "chainReactor" | "cargoCyclone";
export type RunSkillId = CoreRunSkillId | EvolutionSkillId | OverdriveSkillId | SynergySkillId;

export interface CareerProgress {
  day: number;
  level: number;
  xp: number;
  xpNext: number;
  pendingPicks: number;
  skills: Record<RunSkillId, number>;
}

export interface RunSkillDefinition {
  id: RunSkillId;
  name: string;
  description: string;
  icon: string;
  color: string;
  maxStacks: number;
  category: "core" | "evolution" | "overdrive" | "synergy";
  requirements?: RunSkillId[];
}

export type RunSkillCost = Partial<Record<CloudKind, number>>;

export interface SkillTreeBranch {
  id: "vacuum" | "fever" | "automation";
  code: string;
  name: string;
  description: string;
  color: string;
  nodes: RunSkillId[];
}

export interface RunState {
  day: number;
  flight: number;
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
  materials: Record<CloudKind, number>;
  routeId: FlightRouteId;
  skills: Record<RunSkillId, number>;
}

export interface ResearchDefinition {
  id: ResearchId;
  code: string;
  name: string;
  description: string;
  effect: string;
  color: string;
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
  comboWindowBonus: number;
  dronePower: number;
  startingFever: number;
  lowTierBias: number;
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
