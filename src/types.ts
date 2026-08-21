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

export type UpgradeId = "power" | "radius" | "value" | "drone" | "insulation" | "conveyor" | "processingLine" | "hopper" | "fuelTank" | "fuelSaver";

export interface ProcessingJob {
  id: number;
  contractId: ContractId;
  units: Record<CloudKind, number>;
  payout: number;
  workRequired: number;
  progress: number;
}

export interface ProcessingState {
  jobs: ProcessingJob[];
  completedCoins: number;
  totalProcessed: number;
  nextJobId: number;
  lastUpdatedAt: number;
}

export interface ProcessingEstimate {
  payout: number;
  batches: number;
  seconds: number;
}

export interface ProcessingEnqueueResult extends ProcessingEstimate {
  materialsStored: number;
}

export type GrowthMissionId = "collect" | "return" | "contract" | "ship" | "skill" | "upgrade" | "promote" | "rain";

export interface GrowthMissionDefinition {
  id: GrowthMissionId;
  code: string;
  title: string;
  description: string;
  target: number;
  reward: { money?: number; materials?: Partial<Record<CloudKind, number>> };
  rewardLabel: string;
}

export interface GrowthMissionProgress {
  step: number;
  safeReturns: number;
  contractsSigned: number;
  shipmentsClaimed: number;
  rainHarvested: number;
}

export interface GameState {
  money: number;
  totalEarned: number;
  harvested: number;
  rank: number;
  selectedMap: number;
  rankHarvested: number;
  rankFlights: number;
  levels: Record<UpgradeId, number>;
  research: Record<ResearchId, number>;
  bestCombo: number;
  sound: boolean;
  materials: Record<CloudKind, number>;
  processing: ProcessingState;
  career: CareerProgress;
  growthMission: GrowthMissionProgress;
}

export type CoreRunSkillId =
  | "overclock" | "intakeServo" | "wideIntake" | "pressureChamber" | "massInduction" | "vacuumMomentum"
  | "profitRain" | "comboCapacitor" | "feverDrive" | "feverInjector" | "stormCatalyst" | "jackpotPulse"
  | "twinDrone" | "droneAI" | "chainBurst" | "relayBurst" | "salvageProtocol" | "swarmMatrix";
export type EvolutionSkillId = "blackHole" | "eventHorizon" | "goldenStorm" | "sunStorm" | "droneFleet" | "nanoSwarm";
export type OverdriveSkillId = "cargoBay" | "yieldBoost" | "denseRadar" | "feverReserve";
export type SynergySkillId = "cycloneCore" | "cascadeGrid" | "stormDrones" | "goldenVacuum" | "chainReactor" | "cargoCyclone";
export type NavigationSkillId = "auxTank" | "aeroDrive" | "ecoThrusters" | "vacuumRecycler" | "fuelCondenser" | "comboGenerator" | "recoveryReservoir" | "stormFuel";
export type RunSkillId = CoreRunSkillId | EvolutionSkillId | OverdriveSkillId | SynergySkillId | NavigationSkillId;

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
  id: "vacuum" | "fever" | "automation" | "navigation";
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
  fuel: number;
  fuelCapacity: number;
  fuelRecovered: number;
  fuelRecoveryLimit: number;
  emergencyReturn: boolean;
  materials: Record<CloudKind, number>;
  routeId: FlightRouteId;
  mapRank: number;
  skills: Record<RunSkillId, number>;
  processing: ProcessingState;
  processingLines: number;
  processingSpeed: number;
  processingBatchCapacity: number;
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
  fuelBonus: number;
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
  code: string;
  icon: string;
  color: string;
  name: string;
  altitude: string;
  promotionCost: number;
  requiredHarvest: number;
  fuelDrain: number;
  valueMultiplier: number;
  routeId: FlightRouteId;
  identity: string;
  weights: Record<CloudKind, number>;
  description: string;
}
