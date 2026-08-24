import { CLOUDS, FLIGHT_ROUTES, GROWTH_MISSIONS, INFINITE_RESEARCH, INITIAL_STATE, PROCESSING_CONTRACTS, PROCESSING_SECONDS, RANKS, RESEARCH_PROJECTS, RUN_SKILL_COSTS, RUN_SKILLS, UPGRADES, infiniteResearchCost, upgradeCost } from "./config";
import type { ArchiveRelayState, Cloud, CloudFormationKind, CloudKind, ContractId, FloatingText, GameState, GrowthMissionId, InfiniteResearchId, OpenSkyState, Particle, ProcessingClaimResult, ProcessingEnqueueResult, ProcessingEstimate, ProcessingJob, ProcessingState, ResearchId, RivalRaceState, RunSkillId, RunState, SignalTraceState, SolarEngineState, StorySceneId, UpgradeId } from "./types";

type StateListener = (state: GameState) => void;
type RunListener = (state: RunState) => void;
type LevelListener = (pendingPicks: number) => void;
type FactoryListener = (state: RunState) => void;
type ToastListener = (message: string, tone?: "normal" | "success" | "warning") => void;
export type RadioCall = {
  speaker: string;
  role: string;
  text: string;
  tone: "moka" | "sona";
  portrait: "moka-worried" | "sona-worried" | "sona-serious";
};
type RadioListener = (call: RadioCall) => void;
type HarvestDrone = { x: number; y: number; vx: number; vy: number; targetId?: number; phase: number };
type RivalHarvester = { x: number; y: number; vx: number; vy: number; targetId?: number; angle: number; beamTarget?: { x: number; y: number }; pulse: number; delay: number };

const CLOUD_ORDER: CloudKind[] = ["cumulus", "rain", "electric", "ice", "solar", "aurora"];
type Shockwave = { x: number; y: number; radius: number; life: number; maxLife: number; color: string };
type CascadeHarvest = { cloudId: number; delay: number; depth: number };
type DroneBeam = { x: number; y: number; targetX: number; targetY: number };
type HarvestLink = { x: number; y: number; targetX: number; targetY: number; life: number; maxLife: number; color: string };
type HarvestSource = "manual" | "drone" | "cascade";

export function getPromotionEventGate(state: GameState): { label: string; done: boolean } | null {
  switch (state.rank) {
    case 1: return { label: "LIVE RACE 승리", done: state.story.rivalBeaten };
    case 2: return { label: "THUNDER TRACE 완료", done: state.story.electricSignalCleared };
    case 3: return { label: "FROZEN ARCHIVE 복원", done: state.story.iceArchiveRecovered };
    case 4: return { label: "PRESSURE ENGINE 정지", done: state.story.solarEngineDisabled };
    default: return null;
  }
}

const MAX_PARTICLES = 850;
const MAX_FLOATING_TEXTS = 30;
const MAX_SHOCKWAVES = 24;
const MAX_HARVEST_LINKS = 24;

const SAVE_KEY = "cloud-harvest-inc-save-v2";
const RIVAL_RACE_TARGET = 5;
const RIVAL_RACE_REWARD = 80;
const SIGNAL_TRACE_TARGET = 5;
const SIGNAL_TRACE_SECONDS = 45;
const SIGNAL_TRACE_REWARD = 180;
const ARCHIVE_FRAGMENT_TARGET = 3;
const ARCHIVE_CHAIN_TARGET = 3;
const ARCHIVE_CHAIN_WINDOW = 4;
const ARCHIVE_RELAY_SECONDS = 60;
const ARCHIVE_RELAY_REWARD = 350;
const SOLAR_ENGINE_CHARGE_TARGET = 100;
const SOLAR_CORE_CHARGE = 25;
const SOLAR_CORE_HEAT = 34;
const SOLAR_ENGINE_SECONDS = 75;
const SOLAR_ENGINE_REWARD = 700;
const SOLAR_OVERLOAD_LOCK = 3;
const OPEN_SKY_CIRCUIT_TARGET = 3;
const OPEN_SKY_CHAIN_TARGET = 3;
const OPEN_SKY_CHAIN_WINDOW = 4;
const OPEN_SKY_SECONDS = 90;
const OPEN_SKY_REWARD = 1200;
const OPEN_SKY_NODE_INSTABILITY = 22;
const OPEN_SKY_OVERLOAD_LOCK = 3.5;
const PACING_TARGETS = {
  firstHarvest: 10,
  firstReturn: 75,
  firstContract: 105,
  firstShipment: 150,
  firstSkill: 210,
  firstUpgrade: 270,
  rainUnlocked: 420,
  rivalStarted: 480,
  rivalWon: 600,
} as const;
type PacingMilestone = keyof typeof PACING_TARGETS;
const emptyCloudStock = (): Record<CloudKind, number> => ({ cumulus: 0, rain: 0, electric: 0, ice: 0, solar: 0, aurora: 0 });
const freshProcessingState = (): ProcessingState => ({ jobs: [], completedCoins: 0, completedMaterials: emptyCloudStock(), totalProcessed: 0, nextJobId: 1, lastUpdatedAt: Date.now() });
const freshRivalRace = (): RivalRaceState => ({ status: "inactive", playerScore: 0, rivalScore: 0, target: RIVAL_RACE_TARGET, reward: RIVAL_RACE_REWARD });
const freshSignalTrace = (): SignalTraceState => ({ status: "inactive", progress: 0, target: SIGNAL_TRACE_TARGET, timeLeft: SIGNAL_TRACE_SECONDS, timeLimit: SIGNAL_TRACE_SECONDS, reward: SIGNAL_TRACE_REWARD });
const freshArchiveRelay = (): ArchiveRelayState => ({
  status: "inactive", fragments: 0, fragmentTarget: ARCHIVE_FRAGMENT_TARGET, streak: 0, chainTarget: ARCHIVE_CHAIN_TARGET,
  chainTimeLeft: 0, chainWindow: ARCHIVE_CHAIN_WINDOW, timeLeft: ARCHIVE_RELAY_SECONDS, timeLimit: ARCHIVE_RELAY_SECONDS,
  waveDelay: .7, reward: ARCHIVE_RELAY_REWARD,
});
const freshSolarEngine = (): SolarEngineState => ({
  status: "inactive", charge: 0, chargeTarget: SOLAR_ENGINE_CHARGE_TARGET, heat: 0, heatLimit: 100,
  lockTime: 0, ventReady: false, timeLeft: SOLAR_ENGINE_SECONDS, timeLimit: SOLAR_ENGINE_SECONDS,
  waveDelay: .7, reward: SOLAR_ENGINE_REWARD,
});
const freshOpenSky = (): OpenSkyState => ({
  status: "inactive", circuits: 0, circuitTarget: OPEN_SKY_CIRCUIT_TARGET, chain: 0, chainTarget: OPEN_SKY_CHAIN_TARGET,
  chainTimeLeft: 0, chainWindow: OPEN_SKY_CHAIN_WINDOW, instability: 0, instabilityLimit: 100,
  lockTime: 0, coolingRequired: false, timeLeft: OPEN_SKY_SECONDS, timeLimit: OPEN_SKY_SECONDS,
  waveDelay: .7, reward: OPEN_SKY_REWARD,
});

const freshRunState = (day = 1): RunState => ({
  day,
  flight: 1,
  level: 1,
  xp: 0,
  xpNext: 6,
  fever: 0,
  feverActive: false,
  feverSeconds: 0,
  combo: 0,
  comboTime: 0,
  pendingPicks: 0,
  cargo: emptyCloudStock(),
  cargoValue: emptyCloudStock(),
  cargoBonus: 0,
  fuel: 9,
  fuelCapacity: 9,
  fuelRecovered: 0,
  fuelRecoveryLimit: 0,
  emergencyReturn: false,
  materials: emptyCloudStock(),
  routeId: "tailwind",
  mapRank: 0,
  skills: {
    overclock: 0, intakeServo: 0, wideIntake: 0, pressureChamber: 0, massInduction: 0, vacuumMomentum: 0,
    profitRain: 0, comboCapacitor: 0, feverDrive: 0, feverInjector: 0, stormCatalyst: 0, jackpotPulse: 0,
    twinDrone: 0, droneAI: 0, chainBurst: 0, relayBurst: 0, salvageProtocol: 0, swarmMatrix: 0,
    blackHole: 0, eventHorizon: 0, goldenStorm: 0, sunStorm: 0, droneFleet: 0, nanoSwarm: 0,
    cargoBay: 0, yieldBoost: 0, denseRadar: 0, feverReserve: 0,
    cycloneCore: 0, cascadeGrid: 0, stormDrones: 0, goldenVacuum: 0, chainReactor: 0, cargoCyclone: 0,
    auxTank: 0, aeroDrive: 0, ecoThrusters: 0, vacuumRecycler: 0,
    fuelCondenser: 0, comboGenerator: 0, recoveryReservoir: 0, stormFuel: 0,
  },
  infiniteResearch: { speed: 0, power: 0, fuel: 0, drone: 0, yield: 0 },
  processing: freshProcessingState(),
  processingLines: 1,
  processingSpeed: 1,
  processingBatchCapacity: 10,
  processingUsage: {},
  rivalRace: freshRivalRace(),
  signalTrace: freshSignalTrace(),
  archiveRelay: freshArchiveRelay(),
  solarEngine: freshSolarEngine(),
  openSky: freshOpenSky(),
});

export class CloudHarvestGame {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly onStateChange: StateListener;
  private readonly onRunChange: RunListener;
  private readonly onLevelUp: LevelListener;
  private readonly onFactoryOpen: FactoryListener;
  private readonly onToast: ToastListener;
  private readonly onRadio: RadioListener;
  private state: GameState;
  private run = freshRunState();
  private clouds: Cloud[] = [];
  private particles: Particle[] = [];
  private texts: FloatingText[] = [];
  private shockwaves: Shockwave[] = [];
  private droneBeams: DroneBeam[] = [];
  private harvestLinks: HarvestLink[] = [];
  private width = 960;
  private height = 640;
  private dpr = 1;
  private lastTime = 0;
  private spawnTimer = 0;
  private cloudId = 0;
  private formationId = 0;
  private formationCooldown = 4;
  private running = true;
  private pausedForLevel = false;
  private storyPaused = false;
  private titlePaused = false;
  private player = { x: 480, y: 380, targetX: 480, targetY: 380 };
  private pointer = { x: 480, y: 380, active: false, visible: false };
  private aimAngle = 0;
  private aimInitialized = false;
  private playerVelocity = { x: 0, y: 0 };
  private keys = new Set<string>();
  private touchDirect = false;
  private overload = 0;
  private shockToastCooldown = 0;
  private combo = 0;
  private comboTimer = 0;
  private shake = 0;
  private impactFlash = 0;
  private impactFreeze = 0;
  private comboPunch = 0;
  private cascadeQueue: CascadeHarvest[] = [];
  private cascadeTailDelay = 0;
  private queuedCascadeIds = new Set<number>();
  private cascadeCount = 0;
  private cascadeTimer = 0;
  private cascadePunch = 0;
  private rankReveal = 0;
  private frontTimer = 14;
  private frontActive = 0;
  private frontBanner = 0;
  private frontDirection: 1 | -1 = 1;
  private goldenFront = false;
  private goldenFrontClaimed = false;
  private atFactory = false;
  private returning = false;
  private returnTimer = 0;
  private launching = false;
  private launchTimer = 0;
  private transitionWhooshPlayed = false;
  private dayComplete = false;
  private harvestDrones: HarvestDrone[] = [];
  private rivalHarvester: RivalHarvester = { x: 0, y: 0, vx: 0, vy: 0, angle: Math.PI, pulse: 0, delay: 0 };
  private signalTargetId?: number;
  private archiveWaveIndex = 0;
  private archiveRelayPulse = 0;
  private solarWaveIndex = 0;
  private solarEnginePulse = 0;
  private solarOverloadWarned = false;
  private openSkyWaveIndex = 0;
  private openSkyPulse = 0;
  private openSkyOverloadWarned = false;
  private runEmitTimer = 0;
  private processingEmitTimer = 0;
  private fuelWarningStage = 0;
  private fuelPity = 0;
  private fuelPickupFlash = 0;
  private audioContext?: AudioContext;
  private lastHarvestToneAt = 0;
  private discoveredCloudKinds = new Set<CloudKind>(["cumulus"]);
  private discoveryBanner?: { kind: CloudKind; life: number; maxLife: number };
  private pacingSeconds = 0;
  private pacingMilestones: Partial<Record<PacingMilestone, number>> = {};

  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: StateListener,
    onRunChange: RunListener,
    onLevelUp: LevelListener,
    onFactoryOpen: FactoryListener,
    onToast: ToastListener,
    onRadio: RadioListener,
  ) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context를 사용할 수 없습니다.");
    this.ctx = context;
    this.onStateChange = onStateChange;
    this.onRunChange = onRunChange;
    this.onLevelUp = onLevelUp;
    this.onFactoryOpen = onFactoryOpen;
    this.onToast = onToast;
    this.onRadio = onRadio;
    this.state = this.loadState();
    this.restoreCareerProgress();
    this.run.fuelCapacity = this.getFuelCapacity();
    this.run.fuel = this.run.fuelCapacity;
    const offlineSeconds = Math.min(60 * 60 * 4, Math.max(0, (Date.now() - this.state.processing.lastUpdatedAt) / 1000));
    this.advanceProcessing(offlineSeconds, false);
    this.state.processing.lastUpdatedAt = Date.now();
    if (this.advanceGrowthMissions(false)) localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    this.bindInput();
    this.resize();
    this.prepareRivalRace(this.run.mapRank);
    this.prepareSignalTrace(this.run.mapRank);
    this.prepareArchiveRelay(this.run.mapRank);
    this.prepareSolarEngine(this.run.mapRank);
    this.prepareOpenSky(this.run.mapRank);
    window.addEventListener("resize", () => this.resize());
    for (let i = 0; i < Math.min(18, this.getMaxClouds()); i += 1) this.spawnCloud(true);
    this.emitAll();
    requestAnimationFrame((time) => this.frame(time));
  }

  getState(): GameState { return structuredClone(this.state); }
  getPacingReport() {
    return (Object.keys(PACING_TARGETS) as PacingMilestone[]).map((id) => ({
      id,
      seconds: this.pacingMilestones[id] ?? null,
      targetSeconds: PACING_TARGETS[id],
    }));
  }

  private markPacingMilestone(id: PacingMilestone): void {
    if (!import.meta.env.DEV || this.pacingMilestones[id] !== undefined) return;
    const seconds = Math.round(this.pacingSeconds * 10) / 10;
    this.pacingMilestones[id] = seconds;
    const target = PACING_TARGETS[id];
    console.info(`[PACE] ${id}: ${seconds.toFixed(1)}s / target ≤ ${target}s`);
  }
  getRunState(): RunState {
    const state = structuredClone(this.run);
    state.fuelCapacity = this.getFuelCapacity();
    state.fuel = Math.min(state.fuel, state.fuelCapacity);
    state.fuelRecovered = this.run.fuelRecovered;
    state.fuelRecoveryLimit = this.getFuelRecoveryLimit();
    state.materials = structuredClone(this.state.materials);
    state.infiniteResearch = structuredClone(this.state.infiniteResearch);
    state.processing = structuredClone(this.state.processing);
    state.processingLines = this.getProcessingLineCount();
    state.processingSpeed = this.getProcessingSpeed();
    state.processingBatchCapacity = this.getProcessingBatchCapacity();
    return state;
  }

  getUpgradeCost(id: UpgradeId): number {
    const upgrade = UPGRADES.find((item) => item.id === id);
    return upgrade ? upgradeCost(upgrade.baseCost, this.state.levels[id]) : Number.POSITIVE_INFINITY;
  }

  getContractPayout(id: ContractId): number {
    return this.getProcessingEstimate(id).payout;
  }

  getProcessingEstimate(id: ContractId): ProcessingEstimate {
    const jobs = this.buildProcessingJobs(id, false);
    const laneLoads = Array.from({ length: this.getProcessingLineCount() }, () => 0);
    for (const job of jobs) {
      const lane = laneLoads.indexOf(Math.min(...laneLoads));
      laneLoads[lane] += job.workRequired / this.getProcessingSpeed();
    }
    return {
      payout: jobs.reduce((total, job) => total + job.payout, 0),
      batches: jobs.length,
      seconds: Math.max(0, ...laneLoads),
      units: jobs.reduce((total, job) => total + CLOUD_ORDER.reduce((sum, kind) => sum + job.units[kind], 0), 0),
      materialRewards: jobs.reduce((total, job) => {
        CLOUD_ORDER.forEach((kind) => { total[kind] += job.materialRewards?.[kind] ?? 0; });
        return total;
      }, emptyCloudStock()),
      quotaRemaining: (() => {
        const contract = PROCESSING_CONTRACTS.find((item) => item.id === id);
        if (!contract?.flightLimit) return null;
        return Math.max(0, contract.flightLimit - (this.run.processingUsage[id] ?? 0));
      })(),
    };
  }

  getSkillCost(id: RunSkillId) { return { ...RUN_SKILL_COSTS[id] }; }

  setStoryPaused(paused: boolean): void {
    this.storyPaused = paused;
    this.pointer.active = false;
    this.touchDirect = false;
    this.keys.clear();
    this.playerVelocity = { x: 0, y: 0 };
  }

  setTitlePaused(paused: boolean): void {
    this.titlePaused = paused;
    this.pointer.active = false;
    this.touchDirect = false;
    this.keys.clear();
    this.playerVelocity = { x: 0, y: 0 };
  }

  completeStoryScene(id: StorySceneId): boolean {
    if (this.state.story.seen.includes(id)) return false;
    this.state.story.seen.push(id);
    this.commit();
    return true;
  }

  areAllSkillsUnlocked(): boolean {
    return (Object.keys(RUN_SKILLS) as RunSkillId[]).every((id) => this.state.career.skills[id] >= 1);
  }

  getInfiniteResearchCost(id: InfiniteResearchId): number {
    return INFINITE_RESEARCH[id] ? infiniteResearchCost(id, this.state.infiniteResearch[id]) : Number.POSITIVE_INFINITY;
  }

  canBuyInfiniteResearch(id: InfiniteResearchId): boolean {
    if (!INFINITE_RESEARCH[id] || !this.atFactory || !this.pausedForLevel || !this.areAllSkillsUnlocked()) return false;
    return Boolean(this.planCloudMassPayment(this.getInfiniteResearchCost(id)));
  }

  buyInfiniteResearch(id: InfiniteResearchId): boolean {
    if (!this.canBuyInfiniteResearch(id)) return false;
    const cost = this.getInfiniteResearchCost(id);
    const payment = this.planCloudMassPayment(cost);
    if (!payment) return false;
    CLOUD_ORDER.forEach((kind) => { this.state.materials[kind] -= payment[kind]; });
    this.state.infiniteResearch[id] += 1;
    this.run.infiniteResearch[id] = this.state.infiniteResearch[id];
    this.burst(this.player.x, this.player.y, INFINITE_RESEARCH[id].color, 46, 240);
    this.playChord();
    this.commit();
    this.onRunChange(this.getRunState());
    this.onToast(`∞ ${INFINITE_RESEARCH[id].name} Lv.${this.state.infiniteResearch[id]} · 구름 질량 ${cost.toLocaleString()} 투입`, "success");
    return true;
  }

  requestReturn(): boolean {
    if (this.atFactory || this.returning || this.launching) return false;
    if (this.run.signalTrace.status === "active") this.finishSignalTrace(false, "return");
    if (this.run.archiveRelay.status === "active") this.finishArchiveRelay(false, "return");
    if (this.run.solarEngine.status === "active") this.finishSolarEngine(false, "return");
    if (this.run.openSky.status === "active") this.finishOpenSky(false, "return");
    this.run.emergencyReturn = false;
    this.returning = true;
    this.returnTimer = 0;
    this.transitionWhooshPlayed = false;
    this.pointer.active = false;
    this.pointer.visible = false;
    this.touchDirect = false;
    this.keys.clear();
    this.playerVelocity = { x: 0, y: 0 };
    this.clearCascade();
    this.player.targetX = this.getWorldWidth() * .5;
    this.player.targetY = this.getWorldHeight() * .53;
    this.onToast("관제탑 승인 — 기지 복귀 항로 진입", "success");
    return true;
  }

  private consumeFuel(amount: number): boolean {
    if (amount <= 0 || this.atFactory || this.returning || this.launching) return false;
    const feverEfficiency = this.run.feverActive && this.run.skills.cargoCyclone ? .72 : 1;
    const altitudeDrain = RANKS[this.run.mapRank].fuelDrain;
    this.run.fuel = Math.max(0, this.run.fuel - amount * feverEfficiency * altitudeDrain);
    const ratio = this.run.fuel / Math.max(1, this.getFuelCapacity());
    if (ratio <= .15 && this.fuelWarningStage < 2) {
      this.fuelWarningStage = 2;
      this.onToast("연료 15% — 지금 귀환하지 않으면 화물을 모두 잃습니다!", "warning");
      this.playTone(135, .18);
    } else if (ratio <= .35 && this.fuelWarningStage < 1) {
      this.fuelWarningStage = 1;
      this.onToast("연료 35% — 욕심낼지 귀환할지 결정하세요.", "warning");
    }
    if (this.run.fuel > 0) return false;
    this.triggerEmergencyReturn();
    return true;
  }

  private triggerEmergencyReturn(): void {
    if (this.atFactory || this.returning) return;
    if (this.run.signalTrace.status === "active") this.finishSignalTrace(false, "fuel");
    if (this.run.archiveRelay.status === "active") this.finishArchiveRelay(false, "fuel");
    if (this.run.solarEngine.status === "active") this.finishSolarEngine(false, "fuel");
    if (this.run.openSky.status === "active") this.finishOpenSky(false, "fuel");
    const discarded = this.getCargoCount();
    this.run.cargo = emptyCloudStock();
    this.run.cargoValue = emptyCloudStock();
    this.run.cargoBonus = 0;
    this.run.emergencyReturn = true;
    this.returning = true;
    this.returnTimer = 0;
    this.transitionWhooshPlayed = false;
    this.pointer.active = false;
    this.pointer.visible = false;
    this.touchDirect = false;
    this.keys.clear();
    this.playerVelocity = { x: 0, y: 0 };
    this.clearCascade();
    this.player.targetX = this.getWorldWidth() * .5;
    this.player.targetY = this.getWorldHeight() * .53;
    this.onRunChange(this.getRunState());
    this.onToast(`연료 고갈! 수확한 구름 ${discarded}개 폐기 · 비상 견인 귀환`, "warning");
    this.playTone(92, .36);
  }

  isAtFactory(): boolean { return this.atFactory; }
  isDayComplete(): boolean { return this.dayComplete; }

  queueCargoForProcessing(id: ContractId): ProcessingEnqueueResult | null {
    if (!this.atFactory) return null;
    if (id === "energy" && !this.state.story.electricSignalCleared) {
      this.onToast("전기구름 항로의 신호 좌표를 먼저 확보해야 합니다.", "warning");
      return null;
    }
    if (id === "cryogenic" && !this.state.story.iceArchiveRecovered) {
      this.onToast("빙정 중계기의 관측 기록을 먼저 복원해야 합니다.", "warning");
      return null;
    }
    if (id === "stellar" && !this.state.story.solarEngineDisabled) {
      this.onToast("태양구름 층의 기압 엔진을 먼저 정지해야 합니다.", "warning");
      return null;
    }
    if (id === "spectrum" && !this.state.story.skyRestored) {
      this.onToast("오로라 핵심 항로의 기상 순환망을 먼저 복구해야 합니다.", "warning");
      return null;
    }
    const contract = PROCESSING_CONTRACTS.find((item) => item.id === id);
    if (!contract || this.getCargoCount() <= 0) return null;
    const estimate = this.getProcessingEstimate(id);
    const jobs = this.buildProcessingJobs(id, true);
    if (jobs.length === 0) return null;
    const payout = jobs.reduce((total, job) => total + job.payout, 0);
    const cargoBefore = this.getCargoCount();
    const submitted = jobs.reduce((stock, job) => {
      CLOUD_ORDER.forEach((kind) => { stock[kind] += job.units[kind]; });
      return stock;
    }, emptyCloudStock());
    const materialsStored = CLOUD_ORDER.reduce((total, kind) => total + submitted[kind], 0);
    const bonusUsed = this.run.cargoBonus * materialsStored / Math.max(1, cargoBefore);
    this.state.processing.jobs.push(...jobs);
    this.state.growthMission.contractsSigned += 1;
    this.markPacingMilestone("firstContract");
    CLOUD_ORDER.forEach((kind) => {
      const averageValue = this.run.cargo[kind] > 0 ? this.run.cargoValue[kind] / this.run.cargo[kind] : 0;
      this.state.materials[kind] += submitted[kind];
      this.run.cargo[kind] = Math.max(0, this.run.cargo[kind] - submitted[kind]);
      this.run.cargoValue[kind] = Math.max(0, this.run.cargoValue[kind] - averageValue * submitted[kind]);
    });
    this.run.cargoBonus = Math.max(0, this.run.cargoBonus - bonusUsed);
    this.run.processingUsage[id] = (this.run.processingUsage[id] ?? 0) + materialsStored;
    if (this.run.mapRank === this.state.rank) this.state.rankHarvested += materialsStored;
    const cargoRemaining = this.getCargoCount();
    const flightCompleted = cargoRemaining <= 0;
    if (flightCompleted) {
      if (this.run.mapRank === this.state.rank) this.state.rankFlights += 1;
      const finalFlight = this.run.flight >= 3;
      this.run.cargo = emptyCloudStock();
      this.run.cargoValue = emptyCloudStock();
      this.run.cargoBonus = 0;
      this.run.fever = 0;
      this.run.feverActive = false;
      this.run.feverSeconds = 0;
      this.run.combo = 0;
      this.run.comboTime = 0;
      this.dayComplete = finalFlight;
      if (!finalFlight) this.run.flight += 1;
      this.combo = 0;
      this.comboTimer = 0;
      this.clearCascade();
    }
    this.commit();
    this.onRunChange(this.getRunState());
    this.onToast(cargoRemaining > 0
      ? `${contract.name}에 ${materialsStored}개 배정 · 남은 화물 ${cargoRemaining}개`
      : `${jobs.length}개 가공 묶음 적재 — 비행 중에도 자동 처리됩니다.`, "success");
    return {
      payout, batches: jobs.length, seconds: estimate.seconds, materialsStored, cargoRemaining, flightCompleted,
      units: materialsStored,
      materialRewards: estimate.materialRewards,
      quotaRemaining: contract.flightLimit === undefined ? null : Math.max(0, contract.flightLimit - (this.run.processingUsage[id] ?? 0)),
    };
  }

  claimProcessedOutput(): ProcessingClaimResult {
    const coins = Math.floor(this.state.processing.completedCoins);
    const materials = { ...this.state.processing.completedMaterials };
    const materialUnits = CLOUD_ORDER.reduce((total, kind) => total + materials[kind], 0);
    if (coins <= 0 && materialUnits <= 0) return { coins: 0, materials, materialUnits: 0 };
    this.state.processing.completedCoins = 0;
    this.state.processing.completedMaterials = emptyCloudStock();
    this.state.money += coins;
    this.state.totalEarned += coins;
    CLOUD_ORDER.forEach((kind) => { this.state.materials[kind] += materials[kind]; });
    this.state.growthMission.shipmentsClaimed += 1;
    this.markPacingMilestone("firstShipment");
    this.commit();
    this.onRunChange(this.getRunState());
    this.playChord();
    const materialLabel = materialUnits > 0 ? ` · 특성 재료 +${materialUnits}` : "";
    this.onToast(`완성품 출하! ◈ ${coins.toLocaleString()} 정산${materialLabel}`, "success");
    return { coins, materials, materialUnits };
  }

  private buildProcessingJobs(id: ContractId, reserveIds: boolean): ProcessingJob[] {
    const contract = PROCESSING_CONTRACTS.find((item) => item.id === id);
    const totalUnits = this.getCargoCount();
    if (!contract || totalUnits <= 0) return [];
    const remaining = { ...this.run.cargo };
    const averageValues = Object.fromEntries(CLOUD_ORDER.map((kind) => [kind,
      this.run.cargo[kind] > 0 ? this.run.cargoValue[kind] / this.run.cargo[kind] : 0,
    ])) as Record<CloudKind, number>;
    const jobs: ProcessingJob[] = [];
    const batchCapacity = Math.min(this.getProcessingBatchCapacity(), contract.batchSize);
    const quota = contract.flightLimit === undefined
      ? Number.POSITIVE_INFINITY
      : Math.max(0, contract.flightLimit - (this.run.processingUsage[id] ?? 0));
    let unitsLeft = Math.min(quota, contract.acceptedKinds.reduce((total, kind) => total + remaining[kind], 0));
    while (unitsLeft > 0) {
      const units = emptyCloudStock();
      let space = Math.min(batchCapacity, unitsLeft);
      for (const kind of [...contract.acceptedKinds].reverse()) {
        const amount = Math.min(remaining[kind], space, unitsLeft);
        units[kind] = amount;
        remaining[kind] -= amount;
        unitsLeft -= amount;
        space -= amount;
        if (space <= 0) break;
      }
      const batchUnits = CLOUD_ORDER.reduce((total, kind) => total + units[kind], 0);
      if (batchUnits <= 0) break;
      const cargoPayout = CLOUD_ORDER.reduce((total, kind) =>
        total + units[kind] * averageValues[kind] * contract.multipliers[kind], 0);
      const bonusShare = this.run.cargoBonus * batchUnits / totalUnits;
      const workRequired = CLOUD_ORDER.reduce((total, kind) => total + units[kind] * PROCESSING_SECONDS[kind], 0) * contract.durationMultiplier;
      const materialRewards = contract.materialYield
        ? Object.fromEntries(CLOUD_ORDER.map((kind) => [kind, units[kind] > 0 ? Math.ceil(units[kind] * contract.materialYield!) : 0])) as Record<CloudKind, number>
        : undefined;
      jobs.push({
        id: reserveIds ? this.state.processing.nextJobId++ : -(jobs.length + 1),
        contractId: id,
        units,
        payout: Math.max(1, Math.round(cargoPayout + bonusShare)),
        workRequired: Math.max(.5, workRequired),
        progress: 0,
        materialRewards,
      });
    }
    return jobs;
  }

  private getProcessingSpeed(): number {
    return 1 + this.state.levels.conveyor * .22 + this.state.research.refining * .04
      + this.state.research.logistics * .02 + this.run.skills.yieldBoost * .25;
  }

  private getProcessingLineCount(): number {
    return Math.min(6, 1 + this.state.levels.processingLine + this.run.skills.swarmMatrix);
  }

  private getProcessingBatchCapacity(): number {
    return 10 + this.state.levels.hopper * 5 + this.state.research.logistics * 2 + this.run.skills.cargoBay * 12;
  }

  private advanceProcessing(seconds: number, notify: boolean): number {
    let remainingSeconds = Math.max(0, seconds);
    let completedJobs = 0;
    let completedCoins = 0;
    const speed = this.getProcessingSpeed();
    const lineCount = this.getProcessingLineCount();
    while (remainingSeconds > .0001 && this.state.processing.jobs.length > 0) {
      const activeJobs = this.state.processing.jobs.slice(0, lineCount);
      const nextCompletion = Math.min(...activeJobs.map((job) => Math.max(0, job.workRequired - job.progress) / speed));
      const step = Math.min(remainingSeconds, nextCompletion);
      activeJobs.forEach((job) => { job.progress = Math.min(job.workRequired, job.progress + step * speed); });
      remainingSeconds -= step;
      const completedIds = new Set(activeJobs.filter((job) => job.progress >= job.workRequired - .0001).map((job) => job.id));
      if (completedIds.size === 0) break;
      this.state.processing.jobs = this.state.processing.jobs.filter((job) => {
        if (!completedIds.has(job.id)) return true;
        completedJobs += 1;
        completedCoins += job.payout;
        CLOUD_ORDER.forEach((kind) => {
          this.state.processing.completedMaterials[kind] += job.materialRewards?.[kind] ?? 0;
        });
        this.state.processing.totalProcessed += CLOUD_ORDER.reduce((total, kind) => total + job.units[kind], 0);
        return false;
      });
    }
    this.state.processing.completedCoins += completedCoins;
    this.state.processing.lastUpdatedAt = Date.now();
    if (notify && completedJobs > 0) {
      const readyMaterials = CLOUD_ORDER.reduce((total, kind) => total + this.state.processing.completedMaterials[kind], 0);
      this.onToast(`가공 ${completedJobs}묶음 완료 · ◈ ${completedCoins.toLocaleString()}${readyMaterials > 0 ? ` · 재료 ${readyMaterials}` : ""} 출하 대기`, "success");
      [440, 660, 880].slice(0, Math.min(3, completedJobs + 1)).forEach((frequency, index) => {
        window.setTimeout(() => this.playTone(frequency, .08), index * 65);
      });
    }
    return completedJobs;
  }

  private updateProcessing(dt: number): void {
    const completed = this.advanceProcessing(dt, true);
    this.processingEmitTimer -= dt;
    if (completed > 0) this.commit();
    if (completed > 0 || this.processingEmitTimer <= 0) {
      this.onRunChange(this.getRunState());
      this.processingEmitTimer = .15;
    }
  }

  private prepareRivalRace(mapRank: number): void {
    const startsRivalRace = mapRank === 1 && this.state.story.seen.includes("rainFrontier") && !this.state.story.rivalBeaten;
    if (startsRivalRace) this.markPacingMilestone("rivalStarted");
    this.run.rivalRace = { ...freshRivalRace(), status: startsRivalRace ? "active" : "inactive" };
    this.rivalHarvester = {
      x: this.getWorldWidth() - 90 / this.getWorldZoom(),
      y: this.getWorldHeight() * .42,
      vx: 0,
      vy: 0,
      angle: Math.PI,
      pulse: 0,
      delay: startsRivalRace ? 2.8 : 0,
    };
  }

  private prepareSignalTrace(mapRank: number): void {
    const startsSignalTrace = mapRank === 2
      && this.state.story.seen.includes("electricFrontier")
      && !this.state.story.electricSignalCleared;
    this.signalTargetId = undefined;
    this.run.signalTrace = { ...freshSignalTrace(), status: startsSignalTrace ? "active" : "inactive" };
  }

  private prepareArchiveRelay(mapRank: number): void {
    const startsArchiveRelay = mapRank === 3
      && this.state.story.seen.includes("iceFrontier")
      && !this.state.story.iceArchiveRecovered;
    this.archiveWaveIndex = 0;
    this.archiveRelayPulse = 0;
    this.run.archiveRelay = { ...freshArchiveRelay(), status: startsArchiveRelay ? "active" : "inactive" };
  }

  private prepareSolarEngine(mapRank: number): void {
    const startsSolarEngine = mapRank === 4
      && this.state.story.seen.includes("solarFrontier")
      && !this.state.story.solarEngineDisabled;
    this.solarWaveIndex = 0;
    this.solarEnginePulse = 0;
    this.solarOverloadWarned = false;
    this.run.solarEngine = { ...freshSolarEngine(), status: startsSolarEngine ? "active" : "inactive" };
  }

  private prepareOpenSky(mapRank: number): void {
    const startsOpenSky = mapRank === 5
      && this.state.story.seen.includes("auroraFrontier")
      && this.state.story.solarEngineDisabled
      && !this.state.story.skyRestored;
    this.openSkyWaveIndex = 0;
    this.openSkyPulse = 0;
    this.openSkyOverloadWarned = false;
    this.run.openSky = { ...freshOpenSky(), status: startsOpenSky ? "active" : "inactive" };
  }

  launchFlight(mapRank: number): boolean {
    if (!this.atFactory || this.launching || this.returning || this.dayComplete) return false;
    if (!Number.isInteger(mapRank) || mapRank < 0 || mapRank > this.state.rank || !RANKS[mapRank]) return false;
    const routeId = RANKS[mapRank].routeId;
    this.state.selectedMap = mapRank;
    this.run.mapRank = mapRank;
    this.run.routeId = routeId;
    this.run.fuelCapacity = this.getFuelCapacity();
    this.run.fuel = this.run.fuelCapacity;
    this.run.fuelRecovered = 0;
    this.run.fuelRecoveryLimit = this.getFuelRecoveryLimit();
    this.run.emergencyReturn = false;
    this.run.processingUsage = {};
    this.prepareRivalRace(mapRank);
    this.prepareSignalTrace(mapRank);
    this.prepareArchiveRelay(mapRank);
    this.prepareSolarEngine(mapRank);
    this.prepareOpenSky(mapRank);
    this.fuelWarningStage = 0;
    this.fuelPity = 0;
    this.fuelPickupFlash = 0;
    this.launching = true;
    this.launchTimer = 0;
    this.transitionWhooshPlayed = false;
    this.pausedForLevel = false;
    this.pointer.active = false;
    this.pointer.visible = false;
    this.touchDirect = false;
    this.keys.clear();
    this.playerVelocity = { x: 0, y: 0 };
    this.clouds = [];
    this.formationId = 0;
    this.particles = [];
    this.texts = [];
    this.shockwaves = [];
    this.droneBeams = [];
    this.harvestLinks = [];
    this.harvestDrones = [];
    this.formationCooldown = 2.8;
    this.clearCascade();
    this.goldenFront = false;
    this.goldenFrontClaimed = false;
    const flightFrontDelay = this.run.flight === 3 ? 3.5 : this.run.flight === 2 ? .72 : 1;
    this.frontTimer = FLIGHT_ROUTES[routeId].frontDelay * flightFrontDelay;
    this.run.fever = Math.max(this.run.fever, FLIGHT_ROUTES[routeId].startingFever);
    this.player.x = this.width * .5;
    this.player.y = this.height * .61;
    this.player.targetX = this.width * .5;
    this.player.targetY = this.height * .55;
    const phaseName = this.run.flight === 3 ? "최종 수확" : this.run.flight === 2 ? "고밀도 운항" : "탐색 운항";
    this.rankReveal = 2.4;
    this.commit();
    this.onToast(`FLIGHT ${this.run.flight}/3 ${phaseName} — ${RANKS[mapRank].name}`, "success");
    this.playTone(165, .28);
    return true;
  }

  completeDay(id: ResearchId): boolean {
    if (!this.atFactory || !this.dayComplete || !RESEARCH_PROJECTS[id]) return false;
    this.state.research[id] += 1;
    const nextDay = this.run.day + 1;
    this.syncCareerProgress();
    this.state.career.day = nextDay;
    this.run = freshRunState(nextDay);
    this.restoreCareerProgress();
    this.dayComplete = false;
    this.pointer = { x: this.width * .7, y: this.height * .55, active: false, visible: false };
    this.touchDirect = false;
    this.keys.clear();
    this.playerVelocity = { x: 0, y: 0 };
    this.commit();
    this.onRunChange(this.getRunState());
    this.onToast(`${RESEARCH_PROJECTS[id].name} 연구 완료 — 모든 성장 유지 · DAY ${nextDay}`, "success");
    return true;
  }

  buyUpgrade(id: UpgradeId): void {
    const upgrade = UPGRADES.find((item) => item.id === id);
    if (!upgrade) return;
    const level = this.state.levels[id];
    if (level >= upgrade.maxLevel) return;
    if (id === "insulation" && this.state.rank < 2) {
      this.onToast("전국 기상기업 승급 후 연구할 수 있어요.", "warning");
      return;
    }
    const cost = this.getUpgradeCost(id);
    if (this.state.money < cost) {
      this.onToast(`${cost - Math.floor(this.state.money)}코인이 더 필요해요.`, "warning");
      return;
    }
    this.state.money -= cost;
    this.state.levels[id] += 1;
    this.markPacingMilestone("firstUpgrade");
    this.burst(this.player.x, this.player.y, "#ffd166", 22, 150);
    this.playTone(520 + this.state.levels[id] * 40, 0.09);
    this.onToast(`${upgrade.name} Lv.${this.state.levels[id]} 장착!`, "success");
    this.commit();
  }

  chooseSkill(id: RunSkillId): boolean {
    if (!this.pausedForLevel || !this.canChooseSkill(id)) return false;
    const payment = this.planSkillPayment(id);
    if (!payment) return false;
    CLOUD_ORDER.forEach((kind) => { this.state.materials[kind] -= payment[kind]; });
    this.run.skills[id] = 1;
    this.markPacingMilestone("firstSkill");
    this.commit();
    this.burst(this.player.x, this.player.y, RUN_SKILLS[id].color, 36, 210);
    this.playChord();
    this.onRunChange(this.getRunState());
    this.onToast(`${RUN_SKILLS[id].name} 영구 해금!`, "success");
    window.setTimeout(() => this.presentLevelUp(), 140);
    return true;
  }

  canChooseSkill(id: RunSkillId): boolean {
    const skill = RUN_SKILLS[id];
    if (!skill || !this.atFactory || !this.pausedForLevel || this.run.skills[id] >= 1) return false;
    const requirementsMet = skill.requirements?.every((requirement) => this.run.skills[requirement] >= 1) ?? true;
    if (!requirementsMet) return false;
    return Boolean(this.planSkillPayment(id));
  }

  canAffordSkillCost(id: RunSkillId): boolean { return Boolean(this.planSkillPayment(id)); }

  private planSkillPayment(id: RunSkillId): Record<CloudKind, number> | null {
    const available = { ...this.state.materials };
    const payment: Record<CloudKind, number> = { cumulus: 0, rain: 0, electric: 0, ice: 0, solar: 0, aurora: 0 };
    const cost = RUN_SKILL_COSTS[id];
    for (let targetIndex = CLOUD_ORDER.length - 1; targetIndex >= 0; targetIndex -= 1) {
      const target = CLOUD_ORDER[targetIndex];
      let remaining = cost[target] ?? 0;
      for (let sourceIndex = targetIndex; sourceIndex < CLOUD_ORDER.length && remaining > 0; sourceIndex += 1) {
        const source = CLOUD_ORDER[sourceIndex];
        const exchangeValue = 4 ** (sourceIndex - targetIndex);
        const used = Math.min(available[source], Math.ceil(remaining / exchangeValue));
        available[source] -= used;
        payment[source] += used;
        remaining -= used * exchangeValue;
      }
      if (remaining > 0) return null;
    }
    return payment;
  }

  private planCloudMassPayment(cost: number): Record<CloudKind, number> | null {
    const available = { ...this.state.materials };
    const payment = emptyCloudStock();
    let remaining = cost;
    for (let sourceIndex = 0; sourceIndex < CLOUD_ORDER.length && remaining > 0; sourceIndex += 1) {
      const source = CLOUD_ORDER[sourceIndex];
      const exchangeValue = 4 ** sourceIndex;
      const used = Math.min(available[source], Math.ceil(remaining / exchangeValue));
      available[source] -= used;
      payment[source] += used;
      remaining -= used * exchangeValue;
    }
    return remaining > 0 ? null : payment;
  }

  openSkillTree(): boolean {
    if (!this.atFactory) return false;
    this.pausedForLevel = true;
    this.presentLevelUp();
    return true;
  }

  closeSkillTree(): void {
    if (!this.atFactory) return;
    this.pausedForLevel = false;
    this.onRunChange(this.getRunState());
  }

  canPromote(): boolean {
    const next = RANKS[this.state.rank + 1];
    const eventGate = this.getPromotionGate();
    return Boolean(this.atFactory && next && this.state.rankFlights >= 1
      && this.state.money >= next.promotionCost && this.state.rankHarvested >= next.requiredHarvest
      && (eventGate?.done ?? true));
  }

  getPromotionGate(): { label: string; done: boolean } | null {
    return getPromotionEventGate(this.state);
  }

  promote(): boolean {
    const next = RANKS[this.state.rank + 1];
    if (!next) return false;
    if (!this.atFactory) {
      this.onToast("고도 승급은 기지 관제실에서만 승인할 수 있습니다.", "warning");
      return false;
    }
    const eventGate = this.getPromotionGate();
    if (eventGate && !eventGate.done) {
      this.onToast(`${eventGate.label} 후 다음 고도를 해금할 수 있습니다.`, "warning");
      return false;
    }
    if (!this.canPromote()) {
      this.onToast("승급 조건을 조금 더 채워주세요.", "warning");
      return false;
    }
    this.state.money -= next.promotionCost;
    this.state.rank += 1;
    if (this.state.rank === 1) this.markPacingMilestone("rainUnlocked");
    this.state.selectedMap = this.state.rank;
    this.state.rankHarvested = 0;
    this.state.rankFlights = 0;
    this.run.mapRank = this.state.rank;
    this.run.routeId = RANKS[this.run.mapRank].routeId;
    const unlocked = ["", "비구름", "전기구름", "빙정구름", "태양구름", "오로라구름"][this.state.rank];
    this.onToast(`${next.name} 항로 해금 · 새 항로가 자동 선택되었습니다! ${unlocked} 출현`, "success");
    this.playChord();
    this.commit();
    this.onRunChange(this.getRunState());
    return true;
  }

  toggleSound(): void { this.state.sound = !this.state.sound; this.commit(); }

  reset(): void {
    localStorage.removeItem(SAVE_KEY);
    this.state = structuredClone(INITIAL_STATE);
    this.state.processing = freshProcessingState();
    this.run = freshRunState();
    this.pointer = { x: this.width * .7, y: this.height * .55, active: false, visible: false };
    this.touchDirect = false;
    this.keys.clear();
    this.playerVelocity = { x: 0, y: 0 };
    this.pausedForLevel = false;
    this.storyPaused = false;
    this.atFactory = false;
    this.returning = false;
    this.returnTimer = 0;
    this.launching = false;
    this.launchTimer = 0;
    this.dayComplete = false;
    this.goldenFront = false;
    this.goldenFrontClaimed = false;
    this.clouds = [];
    this.formationId = 0;
    this.combo = 0;
    this.droneBeams = [];
    this.harvestLinks = [];
    this.harvestDrones = [];
    this.discoveredCloudKinds = new Set<CloudKind>(["cumulus"]);
    this.discoveryBanner = undefined;
    this.formationCooldown = 4;
    this.clearCascade();
    for (let i = 0; i < Math.min(18, this.getMaxClouds()); i += 1) this.spawnCloud(true);
    this.emitAll();
    this.onToast("새로운 수확 비행선이 출격했습니다.");
  }

  destroy(): void {
    this.state.processing.lastUpdatedAt = Date.now();
    this.commit();
    this.running = false;
  }

  private bindInput(): void {
    const point = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const zoom = this.getWorldZoom();
      return { x: ((event.clientX - rect.left) / rect.width) * this.width / zoom, y: ((event.clientY - rect.top) / rect.height) * this.height / zoom };
    };
    this.canvas.addEventListener("pointerdown", (event) => {
      const p = point(event);
      this.canvas.focus({ preventScroll: true });
      this.pointer = { x: p.x, y: p.y, active: true, visible: true };
      this.touchDirect = event.pointerType === "touch" || event.pointerType === "pen";
      if (this.touchDirect) {
        this.player.targetX = p.x;
        this.player.targetY = p.y;
      }
      this.canvas.setPointerCapture(event.pointerId);
      this.ensureAudio();
    });
    this.canvas.addEventListener("pointermove", (event) => {
      const p = point(event);
      this.canvas.focus({ preventScroll: true });
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.pointer.visible = true;
      if (this.touchDirect) {
        this.player.targetX = p.x;
        this.player.targetY = p.y;
      }
    });
    const release = (event: PointerEvent) => {
      this.pointer.active = false;
      this.touchDirect = false;
      if (event.pointerType !== "mouse") this.pointer.visible = false;
    };
    this.canvas.addEventListener("pointerup", release);
    this.canvas.addEventListener("pointercancel", release);
    this.canvas.addEventListener("pointerleave", () => { if (!this.pointer.active) this.pointer.visible = false; });

    const controlCodes = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "Space"]);
    window.addEventListener("keydown", (event) => {
      if (!controlCodes.has(event.code) || this.atFactory || this.pausedForLevel || this.storyPaused) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, input, textarea, select")) return;
      event.preventDefault();
      if (event.code === "Space") {
        if (!event.repeat && !this.launching && !this.returning) {
          this.ensureAudio();
          this.requestReturn();
        }
        return;
      }
      this.keys.add(event.code);
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    window.addEventListener("blur", () => this.keys.clear());
  }

  private isSuctionActive(): boolean {
    return this.run.fuel > 0 && !this.atFactory && !this.returning && !this.launching
      && this.pointer.active;
  }

  private getAimAngle(): number {
    return this.aimAngle;
  }

  private updateAimDirection(dt: number): void {
    if (!this.pointer.visible || this.touchDirect) return;
    const dx = this.pointer.x - this.player.x;
    const dy = this.pointer.y - this.player.y;
    const distance = Math.hypot(dx, dy);
    const aimDeadZone = 82;
    if (distance < aimDeadZone) return;

    const targetAngle = Math.atan2(dy, dx);
    if (!this.aimInitialized) {
      this.aimAngle = targetAngle;
      this.aimInitialized = true;
      return;
    }

    const delta = Math.atan2(Math.sin(targetAngle - this.aimAngle), Math.cos(targetAngle - this.aimAngle));
    const easedTurn = delta * (1 - Math.exp(-dt * 10));
    const maxTurn = 6.5 * dt;
    this.aimAngle += Math.max(-maxTurn, Math.min(maxTurn, easedTurn));
    this.aimAngle = Math.atan2(Math.sin(this.aimAngle), Math.cos(this.aimAngle));
  }

  private getSuctionHalfAngle(): number {
    if (this.run.feverActive || this.touchDirect) return Math.PI;
    return Math.min(1.38, .62 + this.run.skills.intakeServo * .055 + this.run.skills.wideIntake * .1 + this.run.skills.cycloneCore * .14);
  }

  private isCloudInSuctionArc(cloud: Cloud, radius: number): boolean {
    const dx = cloud.x - this.player.x;
    const dy = cloud.y - this.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > radius + cloud.radius) return false;
    const halfAngle = this.getSuctionHalfAngle();
    if (halfAngle >= Math.PI) return true;
    const cloudAngle = Math.atan2(dy, dx);
    const angleDelta = Math.atan2(Math.sin(cloudAngle - this.getAimAngle()), Math.cos(cloudAngle - this.getAimAngle()));
    return Math.abs(angleDelta) <= halfAngle;
  }

  private updatePlayerMovement(dt: number): number {
    const startX = this.player.x;
    const startY = this.player.y;
    if (this.touchDirect) {
      const follow = 1 - Math.exp(-dt * 9);
      this.player.x += (this.player.targetX - this.player.x) * follow;
      this.player.y += (this.player.targetY - this.player.y) * follow;
      this.playerVelocity.x = 0;
      this.playerVelocity.y = 0;
    } else {
      const inputX = Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) - Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft"));
      const inputY = Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")) - Number(this.keys.has("KeyW") || this.keys.has("ArrowUp"));
      const inputLength = Math.hypot(inputX, inputY) || 1;
      const feverMovementBoost = this.run.feverActive ? 1.55 + this.run.skills.feverInjector * .08 : 1;
      const acceleration = 1250 * (this.run.feverActive ? 1.35 + this.run.skills.feverInjector * .06 : 1);
      if (inputX || inputY) {
        this.playerVelocity.x += inputX / inputLength * acceleration * dt;
        this.playerVelocity.y += inputY / inputLength * acceleration * dt;
      } else {
        const drag = Math.exp(-dt * 8);
        this.playerVelocity.x *= drag;
        this.playerVelocity.y *= drag;
      }
      const infiniteSpeedMultiplier = 1 + this.state.infiniteResearch.speed * .025;
      const skillSpeedMultiplier = (1 + this.run.skills.intakeServo * .22 + this.run.skills.vacuumMomentum * .28 + this.run.skills.aeroDrive * .18) * infiniteSpeedMultiplier;
      const maxSpeed = (315 + this.run.skills.overclock * 18) * skillSpeedMultiplier * feverMovementBoost;
      const speed = Math.hypot(this.playerVelocity.x, this.playerVelocity.y);
      if (speed > maxSpeed) {
        this.playerVelocity.x = this.playerVelocity.x / speed * maxSpeed;
        this.playerVelocity.y = this.playerVelocity.y / speed * maxSpeed;
      }
      this.player.x += this.playerVelocity.x * dt;
      this.player.y += this.playerVelocity.y * dt;
      this.player.targetX = this.player.x;
      this.player.targetY = this.player.y;
    }
    const previousX = this.player.x;
    const previousY = this.player.y;
    const zoom = this.getWorldZoom();
    this.player.x = Math.max(55 / zoom, Math.min(this.getWorldWidth() - 55 / zoom, this.player.x));
    this.player.y = Math.max(100 / zoom, Math.min(this.getWorldHeight() - 150 / zoom, this.player.y));
    if (this.player.x !== previousX) this.playerVelocity.x = 0;
    if (this.player.y !== previousY) this.playerVelocity.y = 0;
    const moved = Math.hypot(this.player.x - startX, this.player.y - startY);
    return dt > 0 ? Math.min(1.4, moved / (315 * dt)) : 0;
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.width = rect.width;
    this.height = rect.height;
    if (!this.pointer.visible) {
      this.player.x = this.atFactory ? this.width * .5 : this.getWorldWidth() * .5;
      this.player.y = this.atFactory ? this.height * .55 : this.getWorldHeight() * .55;
      this.player.targetX = this.player.x;
      this.player.targetY = this.player.y;
    }
  }

  private getWorldZoom(): number {
    return [1, .93, .85, .77, .69, .61][this.run.mapRank] ?? .61;
  }

  private getWorldWidth(): number { return this.width / this.getWorldZoom(); }
  private getWorldHeight(): number { return this.height / this.getWorldZoom(); }

  private frame(time: number): void {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000 || 0, 0.033);
    this.lastTime = time;
    if (!this.storyPaused && !this.titlePaused) this.pacingSeconds += dt;
    if (!this.titlePaused) this.updateProcessing(dt);
    if (this.impactFreeze > 0) this.impactFreeze -= dt;
    else if (!this.pausedForLevel && !this.storyPaused && !this.titlePaused && (!this.atFactory || this.launching || this.returning)) this.update(dt);
    this.render(time / 1000);
    requestAnimationFrame((next) => this.frame(next));
  }

  private update(dt: number): void {
    if (this.launching) {
      this.updateLaunchSequence(dt);
      return;
    }
    if (this.returning) {
      this.updateReturnSequence(dt);
      return;
    }
    this.spawnTimer -= dt;
    this.formationCooldown = Math.max(0, this.formationCooldown - dt);
    const flightPressure = this.run.flight - 1;
    const maxClouds = this.getMaxClouds();
    if (this.spawnTimer <= 0 && this.clouds.length < maxClouds) {
      const formationChance = .14 + (this.run.flight - 1) * .06 + (this.run.feverActive ? .22 : 0);
      const formed = this.formationCooldown <= 0 && maxClouds - this.clouds.length >= 4 && Math.random() < formationChance
        ? this.spawnFormation(maxClouds - this.clouds.length)
        : false;
      if (!formed) this.spawnCloud(false);
      this.spawnTimer = this.getCloudSpawnInterval() * (formed ? 1.8 : 1);
    }
    this.updateSignalTrace(dt);
    this.updateArchiveRelay(dt);
    this.updateSolarEngine(dt);
    this.updateOpenSky(dt);

    const worldZoom = this.getWorldZoom();
    this.player.targetX = Math.max(55 / worldZoom, Math.min(this.getWorldWidth() - 55 / worldZoom, this.player.targetX));
    this.player.targetY = Math.max(100 / worldZoom, Math.min(this.getWorldHeight() - 150 / worldZoom, this.player.targetY));
    const movementLoad = this.updatePlayerMovement(dt);
    this.updateAimDirection(dt);
    const suctionLoad = this.isSuctionActive() ? .72 : 0;
    const movementEfficiency = 1 - this.run.skills.ecoThrusters * .22;
    const suctionEfficiency = 1 - this.run.skills.vacuumRecycler * .22;
    if (this.consumeFuel((movementLoad * .32 * movementEfficiency + suctionLoad * suctionEfficiency) * dt)) return;
    this.overload = Math.max(0, this.overload - dt);
    this.shockToastCooldown = Math.max(0, this.shockToastCooldown - dt);
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    this.run.combo = this.combo;
    this.run.comboTime = Math.max(0, this.comboTimer);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.impactFlash = Math.max(0, this.impactFlash - dt * 4.6);
    this.fuelPickupFlash = Math.max(0, this.fuelPickupFlash - dt * 2.8);
    this.comboPunch = Math.max(0, this.comboPunch - dt * 3.8);
    this.cascadeTimer = Math.max(0, this.cascadeTimer - dt);
    this.cascadePunch = Math.max(0, this.cascadePunch - dt * 7);
    if (this.cascadeTimer <= 0 && this.cascadeQueue.length === 0) this.cascadeCount = 0;
    this.rankReveal = Math.max(0, this.rankReveal - dt);
    if (this.discoveryBanner) {
      this.discoveryBanner.life -= dt;
      if (this.discoveryBanner.life <= 0) this.discoveryBanner = undefined;
    }
    this.frontTimer -= dt;
    this.frontActive = Math.max(0, this.frontActive - dt);
    this.frontBanner = Math.max(0, this.frontBanner - dt);
    if (this.frontTimer <= 0) {
      if (!this.clouds.some((cloud) => cloud.front)) this.startCloudFront();
      else this.frontTimer = 5;
    }
    if (this.run.feverActive) {
      this.run.feverSeconds -= dt;
      if (this.run.feverSeconds <= 0) {
        this.run.feverActive = false;
        this.run.fever = 0;
        this.onToast("피버 종료 — 다시 게이지를 채우세요!");
      }
    }
    const radius = 112 + this.state.levels.radius * 18 + this.run.skills.wideIntake * 34 + this.run.skills.pressureChamber * 18
      + this.run.skills.blackHole * 80 + this.run.skills.eventHorizon * 140
      + (this.run.feverActive ? this.run.skills.cycloneCore * 120 + this.run.skills.goldenVacuum * 80 : 0);
    const basePower = 36 + this.state.levels.power * 15;
    const skillPower = (1 + this.run.skills.overclock * 0.45 + this.run.skills.pressureChamber * .2) * (1 + this.run.skills.blackHole * .25 + this.run.skills.eventHorizon * .35);
    const feverPower = this.run.feverActive
      ? (this.run.skills.goldenStorm ? 3.6 : 2.65) * (1 + this.run.skills.feverInjector * .15 + this.run.skills.sunStorm * .4 + this.run.skills.goldenVacuum * .25)
      : 1;
    const overloadPower = this.overload > 0 ? 0.22 : 1;
    const infinitePower = 1 + this.state.infiniteResearch.power * .04;
    const suctionPower = basePower * skillPower * feverPower * overloadPower * infinitePower;
    const collected: Cloud[] = [];

    for (const cloud of this.clouds) {
      cloud.age += dt;
      cloud.hurtFlash = Math.max(0, cloud.hurtFlash - dt * 5);
      cloud.vx += Math.sin(cloud.phase + cloud.age * 0.6) * dt * 3;
      cloud.vy += Math.cos(cloud.phase + cloud.age * 0.48) * dt * 2;

      if (this.isSuctionActive() && !this.queuedCascadeIds.has(cloud.id)) {
        const dx = this.player.x - cloud.x;
        const dy = this.player.y - cloud.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (this.isCloudInSuctionArc(cloud, radius)) {
          const definition = CLOUDS[cloud.kind];
          const proximity = Math.max(0.18, 1 - distance / (radius + cloud.radius));
          const damage = suctionPower * (0.55 + proximity) * dt;
          cloud.health -= damage;
          cloud.hurtFlash = 1;
          const pull = (95 + suctionPower * 1.25) * proximity / Math.sqrt(definition.resistance);
          cloud.vx += (dx / distance) * pull * dt;
          cloud.vy += (dy / distance) * pull * dt;
          if (Math.random() < dt * 18) this.suctionParticle(cloud);

          if (cloud.kind === "electric" && Math.random() < dt * 0.9) this.triggerElectric(cloud);
          if (cloud.health <= 0 || distance < 28) collected.push(cloud);
        }
      }

      if (cloud.front && this.frontActive > 0) cloud.vx += this.frontDirection * 45 * dt;
      if (cloud.front && cloud.x > this.getWorldWidth() - 410 / worldZoom && cloud.y < 350 / worldZoom) cloud.vy += 90 * dt;
      const drag = cloud.front && this.frontActive > 0 ? .993 : .955;
      cloud.vx *= Math.pow(drag, dt * 60);
      cloud.vy *= Math.pow(drag, dt * 60);
      const flightSpeed = 1 + flightPressure * .14;
      cloud.x += cloud.vx * dt * flightSpeed;
      cloud.y += cloud.vy * dt * flightSpeed;
      const margin = cloud.radius + 4;
      if (cloud.x < margin) { cloud.x = margin; cloud.vx = Math.abs(cloud.vx) * 0.6; }
      if (cloud.x > this.getWorldWidth() - margin) { cloud.x = this.getWorldWidth() - margin; cloud.vx = -Math.abs(cloud.vx) * 0.6; }
      if (cloud.y < 88 / worldZoom + margin) { cloud.y = 88 / worldZoom + margin; cloud.vy = Math.abs(cloud.vy) * 0.6; }
      if (cloud.y > this.getWorldHeight() - 125 / worldZoom - margin) { cloud.y = this.getWorldHeight() - 125 / worldZoom - margin; cloud.vy = -Math.abs(cloud.vy) * 0.6; }
    }

    let harvestedThisFrame = this.updateDrones(dt);
    if (this.droneBeams.length > 0 && this.consumeFuel(this.droneBeams.length * .035 * dt)) return;
    for (const cloud of collected) {
      if (!this.clouds.some((item) => item.id === cloud.id)) continue;
      this.collectCloud(cloud, 0, true, "manual");
      harvestedThisFrame = true;
    }
    harvestedThisFrame = this.updateCascadeQueue(dt) || harvestedThisFrame;
    this.updateRivalRace(dt);
    if (harvestedThisFrame) {
      this.commit();
      this.bankLevelUps();
    }
    this.replenishCloudFloor();

    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += (particle.gravity ?? 0) * dt;
      particle.vx *= 0.965;
      particle.vy *= 0.965;
      return particle.life > 0;
    });
    this.texts = this.texts.filter((text) => { text.life -= dt; text.y -= dt * 38; return text.life > 0; });
    this.shockwaves = this.shockwaves.filter((wave) => {
      wave.life -= dt;
      wave.radius += dt * 240;
      return wave.life > 0;
    });
    this.harvestLinks = this.harvestLinks.filter((link) => { link.life -= dt; return link.life > 0; });
    this.runEmitTimer -= dt;
    if (this.runEmitTimer <= 0) { this.onRunChange(this.getRunState()); this.runEmitTimer = 0.08; }
  }

  private updateLaunchSequence(dt: number): void {
    this.launchTimer += dt;
    if (!this.transitionWhooshPlayed && this.launchTimer >= .42) {
      this.transitionWhooshPlayed = true;
      this.playTransitionWhoosh(true);
    }
    const baseCenterX = this.width * .5;
    const worldCenterX = this.getWorldWidth() * .5;
    const worldCenterY = this.getWorldHeight() * .55;
    const hangarY = this.height * .61;
    if (this.atFactory) {
      if (this.launchTimer < .48) {
        this.player.x = baseCenterX + Math.sin(this.launchTimer * 68) * (1 + this.launchTimer * 7);
        this.player.y = hangarY;
        this.shake = 1 + this.launchTimer * 5;
      } else {
        const progress = Math.min(1, (this.launchTimer - .48) / .62);
        const thrust = progress * progress * progress;
        this.player.x = baseCenterX + thrust * this.width * .78;
        this.player.y = hangarY - thrust * this.height * .24;
        this.shake = 4 + progress * 9;
      }
      if (Math.random() < dt * (35 + this.launchTimer * 45)) {
        this.particles.push({
          x: this.player.x - 48, y: this.player.y + (Math.random() - .5) * 18,
          vx: -240 - Math.random() * 300, vy: 30 + Math.random() * 70,
          life: .28 + Math.random() * .3, maxLife: .58, size: 3 + Math.random() * 5,
          color: Math.random() < .5 ? "#fff36f" : "#7ff5df",
        });
      }
      if (this.launchTimer >= 1.1) {
        this.atFactory = false;
        this.shake = 0;
        this.particles = [];
        this.player.x = -100 / this.getWorldZoom();
        this.player.y = this.getWorldHeight() * .62;
        for (let index = 0; index < Math.min(18 + (this.run.flight - 1) * 4, this.getMaxClouds()); index += 1) this.spawnCloud(true);
      }
    } else {
      const entry = Math.min(1, (this.launchTimer - 1.1) / .62);
      const eased = 1 - Math.pow(1 - entry, 3);
      this.player.x = -100 / this.getWorldZoom() + (worldCenterX + 100 / this.getWorldZoom()) * eased;
      this.player.y = this.getWorldHeight() * .62 + (worldCenterY - this.getWorldHeight() * .62) * eased;
      this.shake = Math.max(0, (1 - entry) * 8);
      if (entry >= 1) {
        this.launching = false;
        this.launchTimer = 0;
        this.player.x = worldCenterX;
        this.player.y = worldCenterY;
        this.player.targetX = this.player.x;
        this.player.targetY = this.player.y;
        this.burst(this.player.x, this.player.y, "#8fffe4", 45, 260);
        if (this.run.rivalRace.status === "active") {
          this.onToast("소나: 쾌청산업 수확선 접근! 비구름 5개를 먼저 확보하세요.", "warning");
          this.onRadio({
            speaker: "관측 연구원 소나",
            role: "LIVE WEATHER LINK",
            tone: "sona",
            portrait: "sona-worried",
            text: "경쟁 수확선 확인. 3초 먼저 움직일 수 있어요. 비구름 다섯 개를 선점하세요!",
          });
          this.playTone(185, .12);
        } else if (this.run.signalTrace.status === "active") {
          this.onToast("소나: 전하 신호 포착! 표식이 붙은 전기구름 5개를 45초 안에 추적하세요.", "warning");
          this.onRadio({
            speaker: "관측 연구원 소나",
            role: "LIVE THUNDER LINK // 45 SEC",
            tone: "sona",
            portrait: "sona-worried",
            text: "전하 신호가 이동합니다. 보라색 표식이 붙은 전기구름만 따라가세요. 다섯 개를 연결하면 기압장 좌표를 고정할 수 있어요!",
          });
          this.playTone(248, .12);
        } else if (this.run.archiveRelay.status === "active") {
          this.onToast("소나: 동결 기록 반응! 표시된 빙정 파편 3개를 4초 간격 안에 연결하세요.", "warning");
          this.onRadio({
            speaker: "관측 연구원 소나",
            role: "FROZEN ARCHIVE // RESONANCE LINK",
            tone: "sona",
            portrait: "sona-worried",
            text: "중계기 기록이 세 조각으로 얼어붙어 있어요. 청록 표식 파편 세 개를 빠르게 이어서 한 조각씩 해동하세요. 공명이 끊기면 그 묶음은 다시 얼어붙습니다!",
          });
          this.playTone(520, .14);
        } else if (this.run.solarEngine.status === "active") {
          this.onToast("소나: 기압 엔진 접속! 광자핵으로 출력 100%를 만들고 과열 전에 흡입을 놓으세요.", "warning");
          this.onRadio({
            speaker: "관측 연구원 소나",
            role: "PRESSURE ENGINE // CONTROLLED OVERCHARGE",
            tone: "sona",
            portrait: "sona-serious",
            text: "주황 표식 광자핵을 수확하면 엔진 출력과 열이 함께 올라갑니다. 열이 높아지면 흡입을 놓고 28%까지 식히세요. 100% 과열되면 출력 한 단계가 날아가요!",
          });
          this.playTone(690, .13);
        } else if (this.run.openSky.status === "active") {
          this.onToast("소나: OPEN SKY PROTOCOL 시작! 오로라 노드 3개를 4초 안에 연결하고 흡입을 놓아 순환망을 안정화하세요.", "warning");
          this.onRadio({
            speaker: "관측 연구원 소나",
            role: "OPEN SKY PROTOCOL // FINAL CIRCUIT",
            tone: "sona",
            portrait: "sona-serious",
            text: "중심 순환핵 주변의 오로라 노드 세 개를 4초 안에 연결하세요. 한 회로가 닫히면 불안정도가 크게 오릅니다. 흡입을 놓고 25%까지 식히며 세 회로를 완성해야 해요!",
          });
          this.playTone(860, .14);
        } else {
          this.onToast("기상 항로 진입 — 수확 비행 시작!", "success");
        }
        this.emitAll();
      }
    }
    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      return particle.life > 0;
    });
  }

  private updateReturnSequence(dt: number): void {
    this.returnTimer += dt;
    if (!this.transitionWhooshPlayed && this.returnTimer >= .66) {
      this.transitionWhooshPlayed = true;
      this.playTransitionWhoosh(false);
    }
    const centerX = this.getWorldWidth() * .5;
    const centerY = this.getWorldHeight() * .53;
    if (this.atFactory) {
      this.particles = this.particles.filter((particle) => {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        return particle.life > 0;
      });
      if (this.returnTimer >= 2.25) {
        this.returning = false;
        this.onFactoryOpen(this.getRunState());
      }
      return;
    }
    if (this.returnTimer < .72) {
      const follow = 1 - Math.exp(-dt * 8.5);
      this.player.x += (centerX - this.player.x) * follow;
      this.player.y += (centerY - this.player.y) * follow;
      this.shake = Math.max(this.shake, this.returnTimer > .5 ? 2.5 : 0);
      return;
    }

    const progress = Math.min(1, (this.returnTimer - .72) / .72);
    const launch = progress * progress * progress;
    this.player.x = centerX + launch * this.getWorldWidth() * .78;
    this.player.y = centerY - launch * this.getWorldHeight() * .48;
    this.shake = 3 + progress * 10;
    if (Math.random() < dt * (25 + progress * 65)) {
      this.particles.push({
        x: this.player.x - 48, y: this.player.y + (Math.random() - .5) * 18,
        vx: -220 - Math.random() * 260, vy: 35 + Math.random() * 80,
        life: .32 + Math.random() * .28, maxLife: .6, size: 3 + Math.random() * 5,
        color: Math.random() < .45 ? "#fff36f" : "#8ff5ff",
      });
    }
    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      return particle.life > 0;
    });

    if (this.returnTimer >= 1.55 && !this.atFactory) {
      this.atFactory = true;
      if (!this.run.emergencyReturn) this.state.growthMission.safeReturns += 1;
      if (!this.run.emergencyReturn) this.markPacingMilestone("firstReturn");
      this.run.fuelCapacity = this.getFuelCapacity();
      this.run.fuel = this.run.fuelCapacity;
      this.shake = 0;
      this.player.x = this.width * .5;
      this.player.y = this.height * .61;
      this.player.targetX = this.player.x;
      this.player.targetY = this.player.y;
      this.burst(this.player.x, this.player.y + 34, "#7ff5df", 28, 120);
      this.commit();
    }
  }

  private updateRivalRace(dt: number): void {
    const race = this.run.rivalRace;
    const rival = this.rivalHarvester;
    rival.pulse += dt;
    rival.beamTarget = undefined;

    if (race.status === "inactive") return;
    if (race.status === "won") {
      rival.vx += 420 * dt;
      rival.vy -= 90 * dt;
      rival.x += rival.vx * dt;
      rival.y += rival.vy * dt;
      return;
    }
    if (race.status === "lost") {
      rival.vx *= Math.exp(-dt * 4);
      rival.vy *= Math.exp(-dt * 4);
      rival.x += rival.vx * dt;
      rival.y += rival.vy * dt;
      return;
    }
    if (rival.delay > 0) {
      rival.delay = Math.max(0, rival.delay - dt);
      return;
    }

    let target = this.clouds.find((cloud) => cloud.id === rival.targetId
      && cloud.kind === "rain" && !cloud.front && cloud.formationId === undefined && !this.queuedCascadeIds.has(cloud.id));
    if (!target) {
      let bestScore = Number.POSITIVE_INFINITY;
      for (const candidate of this.clouds) {
        if (candidate.kind !== "rain" || candidate.front || candidate.formationId !== undefined || this.queuedCascadeIds.has(candidate.id)) continue;
        const distance = Math.hypot(candidate.x - rival.x, candidate.y - rival.y);
        const score = distance + candidate.health * 1.35;
        if (score < bestScore) {
          bestScore = score;
          target = candidate;
        }
      }
      rival.targetId = target?.id;
    }

    let destinationX = this.getWorldWidth() * .72 + Math.cos(rival.pulse * .55) * this.getWorldWidth() * .14;
    let destinationY = this.getWorldHeight() * .43 + Math.sin(rival.pulse * .8) * this.getWorldHeight() * .12;
    if (target) {
      const cloudAngle = Math.atan2(target.y - rival.y, target.x - rival.x);
      const approachDistance = 78 + target.radius;
      destinationX = target.x - Math.cos(cloudAngle) * approachDistance;
      destinationY = target.y - Math.sin(cloudAngle) * approachDistance;
      const targetDelta = Math.atan2(Math.sin(cloudAngle - rival.angle), Math.cos(cloudAngle - rival.angle));
      rival.angle += targetDelta * (1 - Math.exp(-dt * 7));
      const targetDistance = Math.hypot(target.x - rival.x, target.y - rival.y);
      if (targetDistance < 155 + target.radius) {
        rival.beamTarget = { x: target.x, y: target.y };
        target.health -= (15.5 + this.run.flight * 1.2) * dt;
        target.hurtFlash = Math.max(target.hurtFlash, .45);
        if (Math.random() < dt * 11 && this.particles.length < MAX_PARTICLES) {
          this.particles.push({
            x: rival.x + Math.cos(rival.angle) * 42,
            y: rival.y + Math.sin(rival.angle) * 42,
            vx: (target.x - rival.x) * 1.8,
            vy: (target.y - rival.y) * 1.8,
            life: .22,
            maxLife: .22,
            size: 2.5 + Math.random() * 2,
            color: "#ff6578",
          });
        }
        if (target.health <= 0) this.collectRivalCloud(target);
      }
    } else {
      const patrolAngle = Math.atan2(destinationY - rival.y, destinationX - rival.x);
      const patrolDelta = Math.atan2(Math.sin(patrolAngle - rival.angle), Math.cos(patrolAngle - rival.angle));
      rival.angle += patrolDelta * (1 - Math.exp(-dt * 4));
    }

    rival.vx += (destinationX - rival.x) * dt * 2.9;
    rival.vy += (destinationY - rival.y) * dt * 2.9;
    const speed = Math.hypot(rival.vx, rival.vy);
    const maxSpeed = 188 + this.run.flight * 8;
    if (speed > maxSpeed) {
      rival.vx = rival.vx / speed * maxSpeed;
      rival.vy = rival.vy / speed * maxSpeed;
    }
    rival.x += rival.vx * dt;
    rival.y += rival.vy * dt;
    rival.vx *= Math.exp(-dt * 2.15);
    rival.vy *= Math.exp(-dt * 2.15);
    const zoom = this.getWorldZoom();
    rival.x = Math.max(52 / zoom, Math.min(this.getWorldWidth() - 52 / zoom, rival.x));
    rival.y = Math.max(115 / zoom, Math.min(this.getWorldHeight() - 145 / zoom, rival.y));
  }

  private collectRivalCloud(cloud: Cloud): void {
    const cloudIndex = this.clouds.findIndex((candidate) => candidate.id === cloud.id);
    if (cloudIndex < 0 || this.run.rivalRace.status !== "active") return;
    this.clouds.splice(cloudIndex, 1);
    this.rivalHarvester.targetId = undefined;
    this.rivalHarvester.beamTarget = undefined;
    this.run.rivalRace.rivalScore += 1;
    this.addFloatingText({ x: cloud.x, y: cloud.y - 15, text: `RIVAL STEAL  ${this.run.rivalRace.rivalScore}/${this.run.rivalRace.target}`, color: "#ff6578", life: 1.15 });
    this.addShockwave({ x: cloud.x, y: cloud.y, radius: 12, life: .42, maxLife: .42, color: "#ff6578" });
    this.burst(cloud.x, cloud.y, "#ff6578", 18, 240, "spark");
    this.playTone(118, .07);
    if (this.run.rivalRace.rivalScore >= this.run.rivalRace.target) this.finishRivalRace(false);
  }

  private finishRivalRace(playerWon: boolean): void {
    const race = this.run.rivalRace;
    if (race.status !== "active") return;
    this.rivalHarvester.targetId = undefined;
    this.rivalHarvester.beamTarget = undefined;
    if (playerWon) {
      race.status = "won";
      this.markPacingMilestone("rivalWon");
      this.state.story.rivalBeaten = true;
      this.state.money += race.reward;
      this.state.totalEarned += race.reward;
      this.rivalHarvester.vx = 170;
      this.addFloatingText({ x: this.player.x, y: this.player.y - 70, text: `ROUTE SECURED  +◈${race.reward}`, color: "#fff36f", life: 1.8 });
      this.addShockwave({ x: this.player.x, y: this.player.y, radius: 25, life: .9, maxLife: .9, color: "#fff36f" });
      this.burst(this.player.x, this.player.y, "#fff36f", 48, 340, "spark");
      this.onToast(`소나: 우선 항로 확보! ◈ ${race.reward} 지원금과 전용 가공 계약이 해금됐습니다.`, "success");
      this.onRadio({
        speaker: "관측 연구원 소나",
        role: "ROUTE CONTROL // SECURED",
        tone: "sona",
        portrait: "sona-serious",
        text: "쾌청산업보다 먼저 확보했습니다. 우선 항로와 긴급 납품 계약, 지금부터 모두 우리 회사 겁니다.",
      });
      this.playChord();
      return;
    }
    race.status = "lost";
    this.onToast("모카: 이번 화물은 그대로예요. 기지에서 정비하고 비구름 항로에 재도전하죠.", "warning");
    this.onRadio({
      speaker: "정비사 모카",
      role: "DOCK SUPPORT // RETRY READY",
      tone: "moka",
      portrait: "moka-worried",
      text: "화물은 멀쩡해요. 무리해서 쫓지 말고 돌아와요. 터빈 한 번 손보고 다시 붙으면 됩니다.",
    });
    this.playTone(92, .24);
  }

  private updateSignalTrace(dt: number): void {
    const trace = this.run.signalTrace;
    if (trace.status !== "active") return;
    trace.timeLeft = Math.max(0, trace.timeLeft - dt);
    if (trace.timeLeft <= 0) {
      this.finishSignalTrace(false, "time");
      return;
    }
    this.ensureSignalTarget();
  }

  private ensureSignalTarget(): void {
    if (this.run.signalTrace.status !== "active") return;
    const current = this.clouds.find((cloud) => cloud.id === this.signalTargetId && cloud.signalTarget);
    if (current) return;
    let target = this.clouds.find((cloud) => cloud.kind === "electric" && !cloud.front
      && cloud.formationId === undefined && !this.queuedCascadeIds.has(cloud.id));
    if (!target) {
      this.spawnCloud(false, "electric");
      target = this.clouds[this.clouds.length - 1];
    }
    if (!target) return;
    target.signalTarget = true;
    target.dense = false;
    this.signalTargetId = target.id;
    this.addShockwave({ x: target.x, y: target.y, radius: target.radius * .7, life: .7, maxLife: .7, color: "#c9a7ff" });
    this.playTone(610 + this.run.signalTrace.progress * 55, .07);
  }

  private finishSignalTrace(success: boolean, reason: "time" | "return" | "fuel" = "time"): void {
    const trace = this.run.signalTrace;
    if (trace.status !== "active") return;
    const markedCloud = this.clouds.find((cloud) => cloud.id === this.signalTargetId);
    if (markedCloud) markedCloud.signalTarget = false;
    this.signalTargetId = undefined;
    if (success) {
      trace.status = "won";
      trace.timeLeft = Math.max(0, trace.timeLeft);
      this.state.story.electricSignalCleared = true;
      this.state.money += trace.reward;
      this.state.totalEarned += trace.reward;
      this.state.materials.electric += 3;
      this.addFloatingText({ x: this.player.x, y: this.player.y - 72, text: `SIGNAL LOCKED  +◈${trace.reward}`, color: "#e3c8ff", life: 1.8 });
      this.addShockwave({ x: this.player.x, y: this.player.y, radius: 28, life: 1, maxLife: 1, color: "#b695ff" });
      this.burst(this.player.x, this.player.y, "#d9bcff", 58, 360, "spark");
      this.onToast(`신호 좌표 확보! ◈ ${trace.reward} · 전기구름 재료 3 · NRG 추출 라인 해금`, "success");
      this.onRadio({
        speaker: "관측 연구원 소나",
        role: "THUNDER GRID // COORDINATE LOCKED",
        tone: "sona",
        portrait: "sona-serious",
        text: "좌표 고정 완료. 인공 기압장이 북부 빙정층으로 이어집니다. 전하 결정 추출 라인도 지금 승인됐어요.",
      });
      this.playChord();
      this.commit();
      this.onRunChange(this.getRunState());
      return;
    }
    trace.status = "lost";
    const reasonText = reason === "fuel" ? "연료가 먼저 바닥났어요." : reason === "return" ? "귀환 항로로 이탈했어요." : "신호 창이 닫혔어요.";
    this.onToast(`신호 추적 실패 — 화물 손실 없음 · 전기구름 항로에서 재도전`, "warning");
    this.onRadio({
      speaker: "정비사 모카",
      role: "SIGNAL RETRY // CARGO SAFE",
      tone: "moka",
      portrait: "moka-worried",
      text: `${reasonText} 수확한 화물은 그대로니까 정비하고 다음 전기구름 항로에서 다시 추적하죠.`,
    });
    this.playTone(105, .22);
    this.onRunChange(this.getRunState());
  }

  private archiveRelayPosition(): { x: number; y: number } {
    return { x: this.getWorldWidth() * .48, y: this.getWorldHeight() * .42 };
  }

  private clearArchiveShards(remove: boolean): void {
    const shardIds = new Set(this.clouds.filter((cloud) => cloud.archiveShard).map((cloud) => cloud.id));
    if (remove && shardIds.size > 0) {
      for (const cloud of this.clouds) {
        if (!shardIds.has(cloud.id)) continue;
        this.burst(cloud.x, cloud.y, "#bff8ff", 10, 150, "shard");
        this.queuedCascadeIds.delete(cloud.id);
      }
      this.clouds = this.clouds.filter((cloud) => !shardIds.has(cloud.id));
      this.cascadeQueue = this.cascadeQueue.filter((item) => !shardIds.has(item.cloudId));
      return;
    }
    for (const cloud of this.clouds) if (cloud.archiveShard) cloud.archiveShard = false;
  }

  private spawnArchiveWave(): void {
    if (this.run.archiveRelay.status !== "active") return;
    this.clearArchiveShards(true);
    const relay = this.archiveRelayPosition();
    const waveAngle = -Math.PI / 2 + this.archiveWaveIndex * .58;
    this.archiveWaveIndex += 1;
    for (let index = 0; index < this.run.archiveRelay.chainTarget; index += 1) {
      this.spawnCloud(false, "ice");
      const shard = this.clouds[this.clouds.length - 1];
      if (!shard) continue;
      const angle = waveAngle + index / this.run.archiveRelay.chainTarget * Math.PI * 2;
      const health = CLOUDS.ice.health * (1 + this.run.mapRank * .12) * .46;
      shard.x = Math.max(70, Math.min(this.getWorldWidth() - 70, relay.x + Math.cos(angle) * 175));
      shard.y = Math.max(190, Math.min(this.getWorldHeight() - 125, relay.y + Math.sin(angle) * 112));
      shard.vx = Math.cos(angle) * 3;
      shard.vy = Math.sin(angle) * 2;
      shard.radius = Math.min(34, Math.max(27, shard.radius));
      shard.health = health;
      shard.maxHealth = health;
      shard.dense = false;
      shard.front = false;
      shard.formationId = undefined;
      shard.formationCore = false;
      shard.formationKind = undefined;
      shard.archiveShard = true;
    }
    this.addShockwave({ x: relay.x, y: relay.y, radius: 34, life: .85, maxLife: .85, color: "#9eeeff" });
    this.addFloatingText({ x: relay.x, y: relay.y - 58, text: `MEMORY WAVE  ${this.run.archiveRelay.fragments + 1}/${this.run.archiveRelay.fragmentTarget}`, color: "#d8fbff", life: 1.2 });
    this.playTone(470 + this.run.archiveRelay.fragments * 70, .08);
  }

  private updateArchiveRelay(dt: number): void {
    this.archiveRelayPulse = Math.max(0, this.archiveRelayPulse - dt * 2.4);
    const archive = this.run.archiveRelay;
    if (archive.status !== "active") return;
    archive.timeLeft = Math.max(0, archive.timeLeft - dt);
    if (archive.timeLeft <= 0) {
      this.finishArchiveRelay(false, "time");
      return;
    }
    if (archive.waveDelay > 0) {
      archive.waveDelay = Math.max(0, archive.waveDelay - dt);
      if (archive.waveDelay <= 0) this.spawnArchiveWave();
      return;
    }
    if (archive.streak > 0) {
      archive.chainTimeLeft = Math.max(0, archive.chainTimeLeft - dt);
      if (archive.chainTimeLeft <= 0) {
        const relay = this.archiveRelayPosition();
        archive.streak = 0;
        archive.waveDelay = .65;
        this.clearArchiveShards(true);
        this.addFloatingText({ x: relay.x, y: relay.y - 48, text: "RESONANCE LOST  ·  REFREEZE", color: "#a9c8d7", life: 1.25 });
        this.addShockwave({ x: relay.x, y: relay.y, radius: 20, life: .6, maxLife: .6, color: "#7f9eb5" });
        this.playTone(150, .12);
        return;
      }
    }
    if (!this.clouds.some((cloud) => cloud.archiveShard)) this.spawnArchiveWave();
  }

  private registerArchiveShard(cloud: Cloud): void {
    const archive = this.run.archiveRelay;
    if (archive.status !== "active") return;
    const relay = this.archiveRelayPosition();
    archive.streak += 1;
    archive.chainTimeLeft = archive.chainWindow;
    this.addHarvestLink({ x: cloud.x, y: cloud.y, targetX: relay.x, targetY: relay.y, life: .7, maxLife: .7, color: "#9eeeff" });
    this.addFloatingText({ x: cloud.x, y: cloud.y - 42, text: `RESONANCE  ${archive.streak}/${archive.chainTarget}`, color: "#d8fbff", life: 1.2 });
    this.playTone(620 + archive.streak * 90, .055);
    if (archive.streak < archive.chainTarget) return;
    archive.fragments += 1;
    archive.streak = 0;
    archive.chainTimeLeft = 0;
    this.archiveRelayPulse = 1;
    const relayFuel = Math.min(1.5, this.getFuelCapacity() - this.run.fuel);
    if (relayFuel > 0) this.run.fuel += relayFuel;
    this.clearArchiveShards(true);
    this.addFloatingText({ x: relay.x, y: relay.y - 64, text: `ARCHIVE RESTORED  ${archive.fragments}/${archive.fragmentTarget}${relayFuel > 0 ? `  ·  FUEL +${relayFuel.toFixed(1)}` : ""}`, color: "#ffffff", life: 1.6 });
    this.addShockwave({ x: relay.x, y: relay.y, radius: 46, life: .9, maxLife: .9, color: "#9eeeff" });
    this.burst(relay.x, relay.y, "#d8fbff", 40, 300, "shard");
    if (archive.fragments >= archive.fragmentTarget) this.finishArchiveRelay(true);
    else archive.waveDelay = .85;
  }

  private finishArchiveRelay(success: boolean, reason: "time" | "return" | "fuel" = "time"): void {
    const archive = this.run.archiveRelay;
    if (archive.status !== "active") return;
    this.clearArchiveShards(false);
    if (success) {
      archive.status = "won";
      this.state.story.iceArchiveRecovered = true;
      this.state.money += archive.reward;
      this.state.totalEarned += archive.reward;
      this.state.materials.ice += 4;
      const relay = this.archiveRelayPosition();
      this.addFloatingText({ x: relay.x, y: relay.y - 82, text: `ARCHIVE ONLINE  +◈${archive.reward}`, color: "#ffffff", life: 2 });
      this.addShockwave({ x: relay.x, y: relay.y, radius: 72, life: 1.2, maxLife: 1.2, color: "#9eeeff" });
      this.burst(relay.x, relay.y, "#ffffff", 70, 410, "shard");
      this.onToast(`관측 기록 복원! ◈ ${archive.reward} · 빙정 재료 4 · CRY 추출 라인 해금`, "success");
      this.onRadio({
        speaker: "관측 연구원 소나",
        role: "FROZEN ARCHIVE // FILE RECOVERED",
        tone: "sona",
        portrait: "sona-serious",
        text: "기록 복원 완료. 선대 사장님은 실패한 게 아니라 기압장 증거를 지키려고 회사를 해체한 거였어요. 마지막 좌표는 태양구름 층입니다.",
      });
      this.playChord();
      this.commit();
      this.onRunChange(this.getRunState());
      return;
    }
    archive.status = "lost";
    const reasonText = reason === "fuel" ? "연료가 먼저 바닥났어요." : reason === "return" ? "귀환 항로로 이탈했어요." : "중계기 전원이 다시 얼어붙었어요.";
    this.onToast("기록 복원 중단 — 화물 손실 없음 · 빙정 항로에서 재시도", "warning");
    this.onRadio({
      speaker: "정비사 모카",
      role: "ARCHIVE RETRY // CARGO SAFE",
      tone: "moka",
      portrait: "moka-worried",
      text: `${reasonText} 복원 진도는 초기화됐지만 수확 화물은 그대로예요. 다음 빙정 항로에서 다시 전원을 넣어보죠.`,
    });
    this.playTone(118, .22);
    this.onRunChange(this.getRunState());
  }

  private solarEnginePosition(): { x: number; y: number } {
    return { x: this.getWorldWidth() * .52, y: this.getWorldHeight() * .4 };
  }

  private clearSolarCores(remove: boolean): void {
    const coreIds = new Set(this.clouds.filter((cloud) => cloud.solarCore).map((cloud) => cloud.id));
    if (remove && coreIds.size > 0) {
      for (const cloud of this.clouds) {
        if (!coreIds.has(cloud.id)) continue;
        this.burst(cloud.x, cloud.y, "#ffd36b", 12, 175);
        this.queuedCascadeIds.delete(cloud.id);
      }
      this.clouds = this.clouds.filter((cloud) => !coreIds.has(cloud.id));
      this.cascadeQueue = this.cascadeQueue.filter((item) => !coreIds.has(item.cloudId));
      return;
    }
    for (const cloud of this.clouds) if (cloud.solarCore) cloud.solarCore = false;
  }

  private spawnSolarCoreWave(): void {
    if (this.run.solarEngine.status !== "active" || this.run.solarEngine.lockTime > 0) return;
    this.clearSolarCores(true);
    const engine = this.solarEnginePosition();
    const waveAngle = -.72 + this.solarWaveIndex * .8;
    this.solarWaveIndex += 1;
    for (let index = 0; index < 2; index += 1) {
      this.spawnCloud(false, "solar");
      const core = this.clouds[this.clouds.length - 1];
      if (!core) continue;
      const angle = waveAngle + index * Math.PI;
      const health = CLOUDS.solar.health * (1 + this.run.mapRank * .12) * .4;
      core.x = Math.max(78, Math.min(this.getWorldWidth() - 78, engine.x + Math.cos(angle) * 195));
      core.y = Math.max(195, Math.min(this.getWorldHeight() - 128, engine.y + Math.sin(angle) * 118));
      core.vx = Math.cos(angle + Math.PI / 2) * 4;
      core.vy = Math.sin(angle + Math.PI / 2) * 3;
      core.radius = Math.min(36, Math.max(29, core.radius));
      core.health = health;
      core.maxHealth = health;
      core.dense = false;
      core.front = false;
      core.formationId = undefined;
      core.formationCore = false;
      core.formationKind = undefined;
      core.solarCore = true;
    }
    this.addShockwave({ x: engine.x, y: engine.y, radius: 42, life: .8, maxLife: .8, color: "#ffbd4a" });
    this.addFloatingText({ x: engine.x, y: engine.y - 78, text: "PHOTON CORE EJECTED", color: "#fff1ad", life: 1.15 });
    this.playTone(720 + this.run.solarEngine.charge * 1.5, .075);
  }

  private updateSolarEngine(dt: number): void {
    this.solarEnginePulse = Math.max(0, this.solarEnginePulse - dt * 2.3);
    const engine = this.run.solarEngine;
    if (engine.status !== "active") return;
    engine.timeLeft = Math.max(0, engine.timeLeft - dt);
    if (engine.timeLeft <= 0) {
      this.finishSolarEngine(false, "time");
      return;
    }

    const suctionActive = this.isSuctionActive();
    const coolingRate = engine.lockTime > 0 ? 30 : suctionActive ? 2.5 : 22;
    engine.heat = Math.max(0, engine.heat - coolingRate * dt);
    if (engine.heat >= 65 && engine.lockTime <= 0) engine.ventReady = true;
    if (engine.ventReady && !suctionActive && engine.lockTime <= 0 && engine.heat <= 28) {
      engine.ventReady = false;
      const recovered = Math.min(1.5, this.getFuelCapacity() - this.run.fuel);
      if (recovered > 0) this.run.fuel += recovered;
      const position = this.solarEnginePosition();
      this.addFloatingText({ x: position.x, y: position.y - 88, text: `PERFECT VENT${recovered > 0 ? `  ·  FUEL +${recovered.toFixed(1)}` : ""}`, color: "#baffdf", life: 1.45 });
      this.addShockwave({ x: position.x, y: position.y, radius: 54, life: .8, maxLife: .8, color: "#8fffe4" });
      this.playTone(920, .08);
    }

    if (engine.lockTime > 0) {
      engine.lockTime = Math.max(0, engine.lockTime - dt);
      if (engine.lockTime <= 0) engine.waveDelay = .35;
      return;
    }
    if (engine.waveDelay > 0) {
      engine.waveDelay = Math.max(0, engine.waveDelay - dt);
      if (engine.waveDelay <= 0) this.spawnSolarCoreWave();
      return;
    }
    if (!this.clouds.some((cloud) => cloud.solarCore)) this.spawnSolarCoreWave();
  }

  private registerSolarCore(cloud: Cloud): void {
    const engine = this.run.solarEngine;
    if (engine.status !== "active" || engine.lockTime > 0) return;
    const position = this.solarEnginePosition();
    engine.charge = Math.min(engine.chargeTarget, engine.charge + SOLAR_CORE_CHARGE);
    engine.heat = Math.min(engine.heatLimit, engine.heat + SOLAR_CORE_HEAT);
    if (engine.heat >= 65) engine.ventReady = true;
    this.solarEnginePulse = 1;
    this.addHarvestLink({ x: cloud.x, y: cloud.y, targetX: position.x, targetY: position.y, life: .72, maxLife: .72, color: "#ffd36b" });
    this.addFloatingText({ x: cloud.x, y: cloud.y - 44, text: `OUTPUT ${engine.charge}%  ·  HEAT ${Math.round(engine.heat)}%`, color: "#fff1ad", life: 1.3 });
    this.addShockwave({ x: cloud.x, y: cloud.y, radius: 22, life: .64, maxLife: .64, color: "#ffbd4a" });
    this.playTone(660 + engine.charge * 2.2, .065);
    if (engine.heat >= engine.heatLimit) {
      this.overloadSolarEngine();
      return;
    }
    if (engine.charge >= engine.chargeTarget) {
      this.finishSolarEngine(true);
      return;
    }
    if (!this.clouds.some((item) => item.solarCore)) engine.waveDelay = .38;
  }

  private overloadSolarEngine(): void {
    const engine = this.run.solarEngine;
    if (engine.status !== "active") return;
    const position = this.solarEnginePosition();
    engine.charge = Math.max(0, engine.charge - SOLAR_CORE_CHARGE);
    engine.heat = engine.heatLimit;
    engine.lockTime = SOLAR_OVERLOAD_LOCK;
    engine.ventReady = false;
    this.clearSolarCores(true);
    this.solarEnginePulse = 1.4;
    this.shake = Math.min(3.2, Math.max(this.shake, 3.2));
    this.addFloatingText({ x: position.x, y: position.y - 92, text: "THERMAL OVERLOAD  ·  OUTPUT -25%", color: "#ff8b69", life: 1.8 });
    this.addShockwave({ x: position.x, y: position.y, radius: 78, life: 1.1, maxLife: 1.1, color: "#ff6e4b" });
    this.burst(position.x, position.y, "#ff8b48", 48, 330);
    this.playTone(105, .24);
    if (!this.solarOverloadWarned) {
      this.solarOverloadWarned = true;
      this.onRadio({
        speaker: "정비사 모카",
        role: "THERMAL LOCK // 3 SEC",
        tone: "moka",
        portrait: "moka-worried",
        text: "과열 잠금 걸렸어요! 출력이 25% 떨어졌지만 아직 끝난 건 아니에요. 3초 냉각이 끝나면 다시 광자핵을 밀어 넣죠!",
      });
    } else {
      this.onToast("기압 엔진 과열 — 출력 25% 손실 · 3초 강제 냉각", "warning");
    }
  }

  private finishSolarEngine(success: boolean, reason: "time" | "return" | "fuel" = "time"): void {
    const engine = this.run.solarEngine;
    if (engine.status !== "active") return;
    this.clearSolarCores(false);
    if (success) {
      engine.status = "won";
      engine.charge = engine.chargeTarget;
      engine.heat = Math.min(engine.heat, 72);
      this.state.story.solarEngineDisabled = true;
      this.state.money += engine.reward;
      this.state.totalEarned += engine.reward;
      this.state.materials.solar += 5;
      const position = this.solarEnginePosition();
      this.addFloatingText({ x: position.x, y: position.y - 94, text: `ENGINE APERTURE OPEN  +◈${engine.reward}`, color: "#ffffff", life: 2.1 });
      this.addShockwave({ x: position.x, y: position.y, radius: 94, life: 1.25, maxLife: 1.25, color: "#fff1ad" });
      this.burst(position.x, position.y, "#ffd36b", 78, 440);
      this.onToast(`기압 엔진 정지! ◈ ${engine.reward} · 태양 재료 5 · SOL 광자 가공 라인 해금`, "success");
      this.onRadio({
        speaker: "관측 연구원 소나",
        role: "PRESSURE ENGINE // APERTURE OPEN",
        tone: "sona",
        portrait: "sona-serious",
        text: "엔진 출력이 역전됐습니다. 독점 항로를 밀어내던 압력이 풀리고 있어요. 열린 배기구 너머에서 오로라 핵심 좌표가 잡힙니다.",
      });
      this.playChord();
      this.commit();
      this.onRunChange(this.getRunState());
      return;
    }
    engine.status = "lost";
    const reasonText = reason === "fuel" ? "연료가 먼저 바닥났어요." : reason === "return" ? "귀환 항로로 이탈했어요." : "제어 시간이 끝났어요.";
    this.onToast("기압 엔진 제어 중단 — 화물 손실 없음 · 태양구름 항로에서 재시도", "warning");
    this.onRadio({
      speaker: "정비사 모카",
      role: "ENGINE RETRY // CARGO SAFE",
      tone: "moka",
      portrait: "moka-worried",
      text: `${reasonText} 엔진 출력은 초기화됐지만 수확 화물은 그대로예요. 다음 태양구름 항로에서 냉각 타이밍만 다시 맞춰보죠.`,
    });
    this.playTone(112, .22);
    this.onRunChange(this.getRunState());
  }

  private openSkyPosition(): { x: number; y: number } {
    return { x: this.getWorldWidth() * .5, y: this.getWorldHeight() * .4 };
  }

  private clearOpenSkyNodes(remove: boolean): void {
    const nodeIds = new Set(this.clouds.filter((cloud) => cloud.auroraNode).map((cloud) => cloud.id));
    if (remove && nodeIds.size > 0) {
      for (const cloud of this.clouds) {
        if (!nodeIds.has(cloud.id)) continue;
        this.burst(cloud.x, cloud.y, "#aaf5ff", 12, 190, "ribbon");
        this.queuedCascadeIds.delete(cloud.id);
      }
      this.clouds = this.clouds.filter((cloud) => !nodeIds.has(cloud.id));
      this.cascadeQueue = this.cascadeQueue.filter((item) => !nodeIds.has(item.cloudId));
      return;
    }
    for (const cloud of this.clouds) if (cloud.auroraNode) cloud.auroraNode = false;
  }

  private spawnOpenSkyWave(): void {
    const finale = this.run.openSky;
    if (finale.status !== "active" || finale.lockTime > 0) return;
    this.clearOpenSkyNodes(true);
    const core = this.openSkyPosition();
    const waveAngle = -.9 + this.openSkyWaveIndex * .72;
    this.openSkyWaveIndex += 1;
    for (let index = 0; index < finale.chainTarget; index += 1) {
      this.spawnCloud(false, "aurora");
      const node = this.clouds[this.clouds.length - 1];
      if (!node) continue;
      const angle = waveAngle + index / finale.chainTarget * Math.PI * 2;
      const radiusX = 205;
      const radiusY = 126;
      const health = CLOUDS.aurora.health * (1 + this.run.mapRank * .12) * .34;
      node.x = Math.max(82, Math.min(this.getWorldWidth() - 82, core.x + Math.cos(angle) * radiusX));
      node.y = Math.max(198, Math.min(this.getWorldHeight() - 130, core.y + Math.sin(angle) * radiusY));
      node.vx = -Math.sin(angle) * 32;
      node.vy = Math.cos(angle) * 22;
      node.radius = Math.min(36, Math.max(28, node.radius));
      node.health = health;
      node.maxHealth = health;
      node.dense = false;
      node.front = false;
      node.formationId = undefined;
      node.formationCore = false;
      node.formationKind = undefined;
      node.auroraNode = true;
    }
    this.addShockwave({ x: core.x, y: core.y, radius: 46, life: .86, maxLife: .86, color: "#d8b8ff" });
    this.addFloatingText({ x: core.x, y: core.y - 90, text: `CIRCUIT WAVE  ${finale.circuits + 1}/${finale.circuitTarget}`, color: "#f1e6ff", life: 1.2 });
    this.playTone(760 + finale.circuits * 110, .08);
  }

  private updateOpenSkyNodes(dt: number): void {
    const core = this.openSkyPosition();
    for (const node of this.clouds) {
      if (!node.auroraNode) continue;
      const dx = node.x - core.x;
      const dy = node.y - core.y;
      const distance = Math.hypot(dx, dy) || 1;
      const targetRadius = 190;
      const radialError = targetRadius - distance;
      const tangentX = -dy / distance;
      const tangentY = dx / distance;
      const radialX = dx / distance;
      const radialY = dy / distance;
      node.vx += (tangentX * 46 + radialX * radialError * 1.15) * dt;
      node.vy += (tangentY * 34 + radialY * radialError * .82) * dt;
      const speed = Math.hypot(node.vx, node.vy);
      if (speed > 72) { node.vx = node.vx / speed * 72; node.vy = node.vy / speed * 72; }
    }
  }

  private updateOpenSky(dt: number): void {
    this.openSkyPulse = Math.max(0, this.openSkyPulse - dt * 2.2);
    const finale = this.run.openSky;
    if (finale.status !== "active") return;
    this.updateOpenSkyNodes(dt);
    finale.timeLeft = Math.max(0, finale.timeLeft - dt);
    if (finale.timeLeft <= 0) {
      this.finishOpenSky(false, "time");
      return;
    }

    const suctionActive = this.isSuctionActive();
    const coolingRate = finale.lockTime > 0 ? 30 : suctionActive ? 1.5 : 24;
    finale.instability = Math.max(0, finale.instability - coolingRate * dt);
    if (finale.coolingRequired && !suctionActive && finale.lockTime <= 0 && finale.instability <= 25) {
      finale.coolingRequired = false;
      const recovered = Math.min(2, this.getFuelCapacity() - this.run.fuel);
      if (recovered > 0) this.run.fuel += recovered;
      const core = this.openSkyPosition();
      this.addFloatingText({ x: core.x, y: core.y - 102, text: `CIRCUIT STABLE${recovered > 0 ? `  ·  FUEL +${recovered.toFixed(1)}` : ""}`, color: "#aaffdf", life: 1.5 });
      this.addShockwave({ x: core.x, y: core.y, radius: 68, life: .9, maxLife: .9, color: "#8fffe4" });
      this.playTone(980, .085);
      if (finale.circuits >= finale.circuitTarget) {
        this.finishOpenSky(true);
        return;
      }
    }

    if (finale.lockTime > 0) {
      finale.lockTime = Math.max(0, finale.lockTime - dt);
      if (finale.lockTime <= 0) finale.waveDelay = .4;
      return;
    }
    if (finale.chain > 0) {
      finale.chainTimeLeft = Math.max(0, finale.chainTimeLeft - dt);
      if (finale.chainTimeLeft <= 0) {
        const core = this.openSkyPosition();
        finale.chain = 0;
        finale.instability = Math.max(0, finale.instability - 12);
        finale.waveDelay = .7;
        this.clearOpenSkyNodes(true);
        this.addFloatingText({ x: core.x, y: core.y - 86, text: "CIRCUIT BROKEN  ·  RELINK", color: "#c7bdd9", life: 1.35 });
        this.playTone(145, .13);
        return;
      }
    }
    if (finale.waveDelay > 0) {
      finale.waveDelay = Math.max(0, finale.waveDelay - dt);
      if (finale.waveDelay <= 0) this.spawnOpenSkyWave();
      return;
    }
    if (!this.clouds.some((cloud) => cloud.auroraNode)) this.spawnOpenSkyWave();
  }

  private registerOpenSkyNode(cloud: Cloud): void {
    const finale = this.run.openSky;
    if (finale.status !== "active" || finale.lockTime > 0) return;
    const core = this.openSkyPosition();
    finale.chain += 1;
    finale.chainTimeLeft = finale.chainWindow;
    finale.instability = Math.min(finale.instabilityLimit, finale.instability + OPEN_SKY_NODE_INSTABILITY);
    this.openSkyPulse = 1;
    this.addHarvestLink({ x: cloud.x, y: cloud.y, targetX: core.x, targetY: core.y, life: .76, maxLife: .76, color: "#d8b8ff" });
    this.addFloatingText({ x: cloud.x, y: cloud.y - 46, text: `SKY LINK  ${finale.chain}/${finale.chainTarget}`, color: "#f1e6ff", life: 1.3 });
    this.addShockwave({ x: cloud.x, y: cloud.y, radius: 24, life: .68, maxLife: .68, color: "#b8d6ff" });
    this.playTone(700 + finale.chain * 110 + finale.circuits * 45, .06);
    if (finale.instability >= finale.instabilityLimit) {
      this.overloadOpenSky();
      return;
    }
    if (finale.chain < finale.chainTarget) return;
    finale.circuits += 1;
    finale.chain = 0;
    finale.chainTimeLeft = 0;
    finale.coolingRequired = true;
    this.clearOpenSkyNodes(true);
    this.addFloatingText({ x: core.x, y: core.y - 106, text: `CIRCUIT CLOSED  ${finale.circuits}/${finale.circuitTarget}  ·  RELEASE TO STABILIZE`, color: "#ffffff", life: 1.75 });
    this.addShockwave({ x: core.x, y: core.y, radius: 76, life: 1, maxLife: 1, color: "#d8b8ff" });
    this.burst(core.x, core.y, "#c8f4ff", 50, 360, "ribbon");
    finale.waveDelay = finale.circuits >= finale.circuitTarget ? 999 : .65;
  }

  private overloadOpenSky(): void {
    const finale = this.run.openSky;
    if (finale.status !== "active") return;
    const core = this.openSkyPosition();
    finale.circuits = Math.max(0, finale.circuits - 1);
    finale.chain = 0;
    finale.chainTimeLeft = 0;
    finale.instability = finale.instabilityLimit;
    finale.lockTime = OPEN_SKY_OVERLOAD_LOCK;
    finale.coolingRequired = false;
    this.clearOpenSkyNodes(true);
    this.openSkyPulse = 1.4;
    this.shake = Math.min(3.5, Math.max(this.shake, 3.5));
    this.addFloatingText({ x: core.x, y: core.y - 108, text: "SKYLOOP OVERLOAD  ·  CIRCUIT -1", color: "#ff8fcf", life: 1.9 });
    this.addShockwave({ x: core.x, y: core.y, radius: 98, life: 1.2, maxLife: 1.2, color: "#ff75c8" });
    this.burst(core.x, core.y, "#ff9bd8", 60, 390, "ribbon");
    this.playTone(98, .27);
    if (!this.openSkyOverloadWarned) {
      this.openSkyOverloadWarned = true;
      this.onRadio({
        speaker: "정비사 모카",
        role: "SKYLOOP OVERLOAD // CIRCUIT LOST",
        tone: "moka",
        portrait: "moka-worried",
        text: "순환핵이 역류했어요! 완성 회로 하나가 끊겼지만 아직 복구할 수 있어요. 잠금이 풀리면 이번에는 회로마다 꼭 흡입을 놓아주세요!",
      });
    } else {
      this.onToast("순환핵 과부하 — 완성 회로 1개 손실 · 3.5초 강제 안정화", "warning");
    }
  }

  private finishOpenSky(success: boolean, reason: "time" | "return" | "fuel" = "time"): void {
    const finale = this.run.openSky;
    if (finale.status !== "active") return;
    this.clearOpenSkyNodes(false);
    if (success) {
      finale.status = "won";
      finale.circuits = finale.circuitTarget;
      finale.instability = Math.min(finale.instability, 70);
      this.state.story.skyRestored = true;
      this.state.money += finale.reward;
      this.state.totalEarned += finale.reward;
      this.state.materials.aurora += 8;
      const core = this.openSkyPosition();
      this.addFloatingText({ x: core.x, y: core.y - 112, text: `OPEN SKY  +◈${finale.reward}`, color: "#ffffff", life: 2.3 });
      this.addShockwave({ x: core.x, y: core.y, radius: 124, life: 1.4, maxLife: 1.4, color: "#f1e6ff" });
      this.burst(core.x, core.y, "#d8b8ff", 94, 490, "ribbon");
      this.onToast(`하늘 순환 복구! ◈ ${finale.reward} · 오로라 재료 8 · AUR 스펙트럼 라인 해금`, "success");
      this.onRadio({
        speaker: "관측 연구원 소나",
        role: "OPEN SKY // WEATHER CYCLE RESTORED",
        tone: "sona",
        portrait: "sona-serious",
        text: "세 회로 모두 정상 연결. 인공 기압장이 무너지고 구름이 도시 쪽으로 다시 흐릅니다. 43일 만의 비가 시작될 거예요. 우리가 하늘을 되찾았습니다.",
      });
      this.playChord();
      this.commit();
      this.onRunChange(this.getRunState());
      return;
    }
    finale.status = "lost";
    const reasonText = reason === "fuel" ? "연료가 먼저 바닥났어요." : reason === "return" ? "귀환 항로로 이탈했어요." : "순환 동기화 시간이 끝났어요.";
    this.onToast("OPEN SKY 중단 — 화물 손실 없음 · 오로라 항로에서 재시도", "warning");
    this.onRadio({
      speaker: "정비사 모카",
      role: "FINAL PROTOCOL RETRY // CARGO SAFE",
      tone: "moka",
      portrait: "moka-worried",
      text: `${reasonText} 연결 회로는 초기화됐지만 수확 화물은 그대로예요. 다음 오로라 항로에서 마지막 프로토콜을 다시 시작하죠.`,
    });
    this.playTone(108, .24);
    this.onRunChange(this.getRunState());
  }

  private updateDrones(dt: number): boolean {
    this.droneBeams = [];
    let harvested = false;
    const stormDroneBonus = this.run.feverActive ? this.run.skills.stormDrones * 2 : 0;
    const totalCount = this.state.levels.drone + this.run.skills.twinDrone + this.run.skills.droneFleet * 3
      + this.run.skills.nanoSwarm * 5 + this.run.skills.swarmMatrix * 2 + stormDroneBonus;
    const count = Math.min(12, totalCount);
    while (this.harvestDrones.length < count) {
      const phase = this.harvestDrones.length * 1.9;
      this.harvestDrones.push({ x: this.player.x + Math.cos(phase) * 55, y: this.player.y + Math.sin(phase) * 40, vx: 0, vy: 0, phase });
    }
    if (this.harvestDrones.length > count) this.harvestDrones.length = count;
    if (count <= 0) return false;
    const claimedTargets = new Set<number>();

    for (const drone of this.harvestDrones) {
      drone.phase += dt * (.7 + (drone.phase % 1) * .25);
      let target = this.clouds.find((cloud) => cloud.id === drone.targetId && !cloud.signalTarget && !cloud.archiveShard && !cloud.solarCore && !cloud.auroraNode && !claimedTargets.has(cloud.id) && !this.queuedCascadeIds.has(cloud.id));
      if (!target) {
        let nearest = Number.POSITIVE_INFINITY;
        for (const cloud of this.clouds) {
          if (cloud.signalTarget || cloud.archiveShard || cloud.solarCore || cloud.auroraNode || claimedTargets.has(cloud.id) || this.queuedCascadeIds.has(cloud.id)) continue;
          const approachX = cloud.x + Math.cos(drone.phase) * (34 + cloud.radius * .35);
          const approachY = cloud.y + Math.sin(drone.phase) * (28 + cloud.radius * .28);
          const distance = Math.hypot(approachX - drone.x, approachY - drone.y);
          if (distance < nearest) { nearest = distance; target = cloud; }
        }
        drone.targetId = target?.id;
      }
      if (target) claimedTargets.add(target.id);

      if (!target) {
        const homeX = this.player.x + Math.cos(drone.phase) * 90;
        const homeY = this.player.y + Math.sin(drone.phase) * 60;
        drone.vx += (homeX - drone.x) * dt * 3;
        drone.vy += (homeY - drone.y) * dt * 3;
      } else {
        const orbitRadius = 34 + target.radius * .35;
        const targetX = target.x + Math.cos(drone.phase) * orbitRadius;
        const targetY = target.y + Math.sin(drone.phase) * orbitRadius * .72;
        const dx = targetX - drone.x;
        const dy = targetY - drone.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const pursuitSpeed = 185 + this.run.skills.droneAI * 45 + this.run.skills.nanoSwarm * 30;
        if (distance > 88) {
          drone.vx += dx / distance * pursuitSpeed * dt * 4.5;
          drone.vy += dy / distance * pursuitSpeed * dt * 4.5;
        } else {
          drone.vx *= Math.exp(-dt * 7);
          drone.vy *= Math.exp(-dt * 7);
          this.droneBeams.push({ x: drone.x, y: drone.y, targetX: target.x, targetY: target.y });
          const stormPower = this.run.feverActive && this.run.skills.stormDrones ? 3 : 1;
          const infiniteDronePower = 1 + this.state.infiniteResearch.drone * .04;
          const systemsPower = (1 + this.run.skills.droneAI * .34 + this.run.skills.nanoSwarm * .55) * FLIGHT_ROUTES[this.run.routeId].dronePower * infiniteDronePower;
          target.health -= dt * (12 + totalCount * 2.4 + this.run.skills.droneFleet * 14) * stormPower * systemsPower;
          target.hurtFlash = .7;
          if (Math.random() < dt * 18) this.particles.push({ x: drone.x, y: drone.y, vx: dx * 1.8, vy: dy * 1.8, life: .24, maxLife: .24, size: 2.5, color: "#6ff6e2" });
          if (target.health <= 0) {
            this.addFloatingText({ x: target.x, y: target.y - 24, text: "DRONE HARVEST!", color: "#8fffe9", life: .8 });
            this.collectCloud(target, 0, true, "drone");
            harvested = true;
            drone.targetId = undefined;
          }
        }
      }
      const speed = Math.hypot(drone.vx, drone.vy);
      const maxSpeed = 280;
      if (speed > maxSpeed) { drone.vx = drone.vx / speed * maxSpeed; drone.vy = drone.vy / speed * maxSpeed; }
      const zoom = this.getWorldZoom();
      drone.x = Math.max(24 / zoom, Math.min(this.getWorldWidth() - 24 / zoom, drone.x + drone.vx * dt));
      drone.y = Math.max(115 / zoom, Math.min(this.getWorldHeight() - 135 / zoom, drone.y + drone.vy * dt));
      drone.vx *= Math.exp(-dt * 2.8);
      drone.vy *= Math.exp(-dt * 2.8);
    }
    return harvested;
  }

  private triggerElectric(cloud: Cloud): void {
    if (this.state.levels.insulation > 0) {
      cloud.health -= 18 * this.state.levels.insulation;
      this.addFloatingText({ x: cloud.x, y: cloud.y, text: "절연 반사!", color: "#fff07d", life: .8 });
      this.burst(cloud.x, cloud.y, "#fff07d", 8, 120);
      return;
    }
    this.overload = 1.1;
    this.shake = 8;
    if (this.shockToastCooldown <= 0) {
      this.onToast("⚡ 감전! 절연 코팅으로 반사할 수 있어요.", "warning");
      this.shockToastCooldown = 2.2;
    }
    this.playTone(110, .14);
  }

  private collectCloud(cloud: Cloud, cascadeDepth = 0, deferSync = false, source: HarvestSource = "manual"): void {
    const cloudIndex = this.clouds.findIndex((item) => item.id === cloud.id);
    if (cloudIndex < 0) return;
    this.queuedCascadeIds.delete(cloud.id);
    this.clouds.splice(cloudIndex, 1);
    const definition = CLOUDS[cloud.kind];
    const countsForRivalRace = this.run.rivalRace.status === "active" && cloud.kind === "rain";
    const countsForSignalTrace = this.run.signalTrace.status === "active" && source !== "drone" && cloud.id === this.signalTargetId && cloud.signalTarget;
    const countsForArchiveRelay = this.run.archiveRelay.status === "active" && source !== "drone" && cloud.archiveShard;
    const countsForSolarEngine = this.run.solarEngine.status === "active" && source !== "drone" && cloud.solarCore;
    const countsForOpenSky = this.run.openSky.status === "active" && source !== "drone" && cloud.auroraNode;
    this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
    this.comboTimer = 3.4 + FLIGHT_ROUTES[this.run.routeId].comboWindowBonus + this.run.skills.comboCapacitor * .35 + this.run.skills.vacuumMomentum * .22;
    this.state.bestCombo = Math.max(this.state.bestCombo, this.combo);
    const comboMultiplier = 1 + Math.min(1.8, Math.floor(this.combo / 3) * .17);
    const permanentValue = (1 + this.state.levels.value * .24)
      * (1 + this.state.research.refining * .05)
      * (1 + this.state.infiniteResearch.yield * .03)
      * FLIGHT_ROUTES[this.run.routeId].valueMultiplier
      * (1 + this.run.skills.yieldBoost * .1)
      * (this.run.feverActive && this.run.skills.goldenStorm ? 1.5 : 1)
      * (this.run.feverActive ? 1 + this.run.skills.jackpotPulse * .15 + this.run.skills.sunStorm * .25 + this.run.skills.goldenVacuum * .2 : 1);
    const runValue = 1 + this.run.skills.profitRain * .4 + this.run.skills.salvageProtocol * .08;
    const energizedCloud = cloud.kind === "electric" || cloud.kind === "solar" || cloud.kind === "aurora";
    const insulationValue = energizedCloud && this.state.levels.insulation > 0 ? 1.5 : 1;
    const densityValue = cloud.dense ? 3 : 1;
    const altitudeValue = RANKS[this.run.mapRank].valueMultiplier;
    const earned = Math.round(definition.value * comboMultiplier * permanentValue * runValue * insulationValue * densityValue * altitudeValue);
    this.run.cargo[cloud.kind] += 1;
    this.run.cargoValue[cloud.kind] += earned;
    this.state.harvested += 1;
    this.markPacingMilestone("firstHarvest");
    if (countsForRivalRace) this.run.rivalRace.playerScore += 1;
    if (cloud.kind === "rain") this.state.growthMission.rainHarvested += 1;
    if (source === "manual") this.tryRecoverFuel(cloud);
    const baseXp = { cumulus: 2, rain: 5, electric: 9, ice: 14, solar: 22, aurora: 34 }[cloud.kind];
    const xp = cloud.dense ? baseXp * 2 : baseXp;
    this.run.xp += xp;
    const feverGain = (12 + Math.min(10, this.combo))
      * (1 + this.run.skills.feverDrive * .35 + this.run.skills.comboCapacitor * .12 + this.run.skills.feverInjector * .2);
    if (!this.run.feverActive) this.run.fever = Math.min(100, this.run.fever + feverGain);
    if (this.run.fever >= 100 && !this.run.feverActive) this.startFever();

    if (cascadeDepth > 0) {
      this.cascadeCount = Math.max(1, this.cascadeCount) + 1;
      this.cascadeTimer = .72;
      this.cascadePunch = 1;
    }
    const cascadeLabel = cascadeDepth > 0 ? `  CASCADE ×${this.cascadeCount}` : "";
    const harvestVerb: Record<CloudKind, string> = { cumulus: "POP", rain: "COMPRESS", electric: "ARC", ice: "SHATTER", solar: "FLARE", aurora: "SPECTRUM" };
    this.addFloatingText({ x: cloud.x, y: cloud.y, text: `${harvestVerb[cloud.kind]}  ${cloud.dense ? "DENSE  " : ""}+1  ◈${earned}${cascadeLabel}`, color: cloud.dense || definition.value >= 28 || cascadeDepth > 0 ? "#fff27a" : "#ffffff", life: 1.15 });
    if (this.combo >= 3 && this.combo % 3 === 0) this.addFloatingText({ x: cloud.x, y: cloud.y + 28, text: `${this.combo} COMBO!`, color: "#ffdf70", life: .9 });
    this.triggerCloudHarvestEffect(cloud, cascadeDepth);
    const harvestShake = Math.min(3.2, .7 + this.combo * .12 + Math.min(1.2, cascadeDepth * .24));
    this.shake = this.run.feverActive ? Math.min(.8, harvestShake) : harvestShake;
    this.impactFlash = Math.min(.92, .22 + this.combo * .025 + cascadeDepth * .025);
    this.impactFreeze = this.run.feverActive ? 0 : Math.min(.025, .008 + this.combo * .0006);
    this.comboPunch = 1;
    this.playHarvestTone(cloud.kind, cascadeDepth);
    if (countsForRivalRace) {
      this.addFloatingText({
        x: cloud.x,
        y: cloud.y - 34,
        text: `ROUTE RACE  ${this.run.rivalRace.playerScore}/${this.run.rivalRace.target}`,
        color: "#7ff5df",
        life: 1.2,
      });
      if (this.run.rivalRace.playerScore >= this.run.rivalRace.target) this.finishRivalRace(true);
    }
    if (countsForSignalTrace) {
      this.signalTargetId = undefined;
      this.run.signalTrace.progress += 1;
      this.addFloatingText({
        x: cloud.x,
        y: cloud.y - 42,
        text: `SIGNAL LINK  ${this.run.signalTrace.progress}/${this.run.signalTrace.target}`,
        color: "#e1c4ff",
        life: 1.35,
      });
      this.addShockwave({ x: cloud.x, y: cloud.y, radius: 18, life: .68, maxLife: .68, color: "#b695ff" });
      if (this.run.signalTrace.progress >= this.run.signalTrace.target) this.finishSignalTrace(true);
      else this.ensureSignalTarget();
    }
    if (countsForArchiveRelay) this.registerArchiveShard(cloud);
    if (countsForSolarEngine) this.registerSolarCore(cloud);
    if (countsForOpenSky) this.registerOpenSkyNode(cloud);

    if (cascadeDepth > 0 && this.cascadeCount % 5 === 0) {
      const milestone = this.cascadeCount >= 30 ? "MEGA HARVEST" : this.cascadeCount >= 20 ? "SUPER CASCADE" : this.cascadeCount >= 10 ? "CHAIN REACTION" : "CASCADE";
      this.addFloatingText({ x: cloud.x, y: cloud.y - 34, text: `${milestone} ×${this.cascadeCount}!`, color: "#fff36f", life: 1.35 });
      this.addShockwave({ x: cloud.x, y: cloud.y, radius: 24, life: .78, maxLife: .78, color: "#fff36f" });
      this.burst(cloud.x, cloud.y, "#fff36f", 16 + Math.min(34, this.cascadeCount), 390);
      const milestoneShake = Math.min(5, 2.4 + this.cascadeCount * .07);
      this.shake = this.run.feverActive ? Math.min(.8, milestoneShake) : milestoneShake;
      this.impactFlash = Math.min(1, .48 + this.cascadeCount * .012);
    }

    if (this.combo % 5 === 0) this.triggerPressureSurge(cloud.x, cloud.y, source === "drone");
    if (cloud.front && !this.clouds.some((item) => item.front)) this.completeCloudFront(cloud.x, cloud.y);
    if (cloud.formationCore && cloud.formationId !== undefined) this.collapseFormation(cloud, cascadeDepth);

    const chainStacks = this.run.skills.chainBurst;
    if (chainStacks > 0) {
      const chainRadius = 105 + chainStacks * 35 + this.run.skills.relayBurst * 42 + this.run.skills.blackHole * 120
        + this.run.skills.cascadeGrid * 95 + this.run.skills.chainReactor * 145;
      for (const nearby of this.clouds) {
        if (source === "drone" && (nearby.archiveShard || nearby.solarCore || nearby.auroraNode)) continue;
        const distance = Math.hypot(nearby.x - cloud.x, nearby.y - cloud.y);
        if (distance < chainRadius) {
          nearby.health -= 11 + chainStacks * 12 + this.run.skills.relayBurst * 15 + this.run.skills.blackHole * 25
            + this.run.skills.cascadeGrid * 38 + this.run.skills.chainReactor * 65;
          nearby.hurtFlash = 1;
          const dx = nearby.x - cloud.x;
          const dy = nearby.y - cloud.y;
          const length = Math.hypot(dx, dy) || 1;
          nearby.vx += dx / length * 85;
          nearby.vy += dy / length * 85;
          if (nearby.health <= 0) this.queueCascade(nearby, cascadeDepth + 1);
        }
      }
    }
    if (!deferSync) {
      this.commit();
      this.onRunChange(this.getRunState());
      this.bankLevelUps();
    }
  }

  private getFuelRecoveryLimit(): number {
    if (!this.run.skills.fuelCondenser) return 0;
    return 3 + this.run.skills.recoveryReservoir * 4 + this.run.skills.stormFuel * 8;
  }

  private tryRecoverFuel(cloud: Cloud): void {
    const limit = this.getFuelRecoveryLimit();
    if (limit <= 0 || this.run.fuelRecovered >= limit || this.run.fuel >= this.getFuelCapacity()) return;
    const tier = CLOUD_ORDER.indexOf(cloud.kind);
    this.fuelPity += 1 + tier * .16;
    const comboChance = this.run.skills.comboGenerator ? Math.min(.12, this.combo * .006) : 0;
    const highTierChance = this.run.skills.stormFuel && tier >= 2 ? .08 : 0;
    const guaranteedCombo = this.run.skills.comboGenerator && this.combo > 0 && this.combo % 8 === 0;
    if (!guaranteedCombo && this.fuelPity < 7 && Math.random() >= .06 + comboChance + highTierChance) return;
    const recovery = Math.min(
      this.run.skills.stormFuel && tier >= 2 ? 1.5 : 1,
      limit - this.run.fuelRecovered,
      this.getFuelCapacity() - this.run.fuel,
    );
    if (recovery <= 0) return;
    this.fuelPity = 0;
    this.run.fuel += recovery;
    this.run.fuelRecovered += recovery;
    this.run.fuelRecoveryLimit = limit;
    this.fuelPickupFlash = 1;
    this.addFloatingText({ x: cloud.x, y: cloud.y - 28, text: `FUEL CELL  +${recovery.toFixed(recovery % 1 ? 1 : 0)}`, color: "#fff36f", life: 1.2 });
    this.addShockwave({ x: cloud.x, y: cloud.y, radius: 15, life: .55, maxLife: .55, color: "#fff36f" });
    this.burst(cloud.x, cloud.y, "#fff36f", 18, 230, "spark");
    this.playTone(610, .08);
  }

  private triggerCloudHarvestEffect(cloud: Cloud, cascadeDepth: number): void {
    const definition = CLOUDS[cloud.kind];
    const cascadeScale = cascadeDepth > 0 ? .68 : 1;
    if (cloud.kind === "cumulus") {
      this.burst(cloud.x, cloud.y, definition.color, Math.round(18 * cascadeScale), 245, "spark");
      this.burst(cloud.x, cloud.y, "#bcecff", Math.round(5 * cascadeScale), 180, "spark");
      this.addShockwave({ x: cloud.x, y: cloud.y, radius: 8, life: .26, maxLife: .26, color: "#ffffff" });
      return;
    }

    if (cloud.kind === "rain") {
      this.burst(cloud.x, cloud.y, definition.color, Math.round(14 * cascadeScale), 205, "spark");
      this.burst(cloud.x, cloud.y + cloud.radius * .2, "#61c7ff", Math.round(12 * cascadeScale), 150, "drop", 270);
      this.addShockwave({ x: cloud.x, y: cloud.y, radius: cloud.radius * .7, life: .5, maxLife: .5, color: "#78d5ff" });
      return;
    }

    if (cloud.kind === "electric") {
      this.burst(cloud.x, cloud.y, "#ffe76b", Math.round(24 * cascadeScale), 335, "spark");
      const targets = this.clouds
        .filter((candidate) => !this.queuedCascadeIds.has(candidate.id) && Math.hypot(candidate.x - cloud.x, candidate.y - cloud.y) < 245)
        .sort((a, b) => Math.hypot(a.x - cloud.x, a.y - cloud.y) - Math.hypot(b.x - cloud.x, b.y - cloud.y))
        .slice(0, 3);
      for (const target of targets) {
        this.addHarvestLink({ x: cloud.x, y: cloud.y, targetX: target.x, targetY: target.y, life: .22, maxLife: .22, color: "#fff071" });
        target.health -= 15 + this.run.mapRank * 3;
        target.hurtFlash = 1;
        if (target.health <= 0) this.queueCascade(target, cascadeDepth + 1);
      }
      this.addShockwave({ x: cloud.x, y: cloud.y, radius: 12, life: .38, maxLife: .38, color: "#ffe76b" });
      return;
    }

    if (cloud.kind === "ice") {
      this.burst(cloud.x, cloud.y, "#d9fbff", Math.round(26 * cascadeScale), 360, "shard", 120);
      this.burst(cloud.x, cloud.y, "#72e7ff", Math.round(8 * cascadeScale), 235, "spark");
      this.addShockwave({ x: cloud.x, y: cloud.y, radius: 16, life: .46, maxLife: .46, color: "#b9f3ff" });
      return;
    }

    if (cloud.kind === "solar") {
      this.burst(cloud.x, cloud.y, "#fff4a1", Math.round(30 * cascadeScale), 430, "spark");
      this.addShockwave({ x: cloud.x, y: cloud.y, radius: 20, life: .72, maxLife: .72, color: "#ffd86a" });
      for (const nearby of this.clouds) {
        const dx = nearby.x - cloud.x;
        const dy = nearby.y - cloud.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance > 280) continue;
        const force = (1 - distance / 280) * 310;
        nearby.vx += dx / distance * force;
        nearby.vy += dy / distance * force;
      }
      return;
    }

    this.burst(cloud.x, cloud.y, "#8fffd2", Math.round(18 * cascadeScale), 300, "ribbon");
    this.burst(cloud.x, cloud.y, "#c69cff", Math.round(14 * cascadeScale), 260, "ribbon");
    this.addShockwave({ x: cloud.x, y: cloud.y, radius: 24, life: .8, maxLife: .8, color: "#a98cff" });
    if (cascadeDepth === 0) {
      const echoCount = Math.min(2, Math.max(0, this.getMaxClouds() - this.clouds.length));
      for (let index = 0; index < echoCount; index += 1) this.spawnAuroraEcho(cloud, index, echoCount);
      if (echoCount > 0) this.addFloatingText({ x: cloud.x, y: cloud.y - 38, text: `PRISM SEEDS  +${echoCount}`, color: "#8fffd2", life: 1.2 });
    }
  }

  private spawnAuroraEcho(source: Cloud, index: number, count: number): void {
    const angle = source.phase + index / Math.max(1, count) * Math.PI * 2;
    const radius = 16 + Math.random() * 5;
    const health = CLOUDS.cumulus.health * (1 + this.run.mapRank * .2) * .75;
    this.clouds.push({
      id: ++this.cloudId, kind: "cumulus", x: source.x + Math.cos(angle) * 58, y: source.y + Math.sin(angle) * 44,
      vx: Math.cos(angle) * 105, vy: Math.sin(angle) * 82, radius, phase: Math.random() * Math.PI * 2,
      charged: false, age: 0, health, maxHealth: health, hurtFlash: 0, dense: false, front: false,
    });
  }

  private addFloatingText(text: FloatingText): void {
    if (this.texts.length >= MAX_FLOATING_TEXTS) this.texts.splice(0, this.texts.length - MAX_FLOATING_TEXTS + 1);
    this.texts.push(text);
  }

  private addShockwave(wave: Shockwave): void {
    if (this.shockwaves.length >= MAX_SHOCKWAVES) this.shockwaves.splice(0, this.shockwaves.length - MAX_SHOCKWAVES + 1);
    this.shockwaves.push(wave);
  }

  private addHarvestLink(link: HarvestLink): void {
    if (this.harvestLinks.length >= MAX_HARVEST_LINKS) this.harvestLinks.shift();
    this.harvestLinks.push(link);
  }

  private queueCascade(cloud: Cloud, depth: number): void {
    if (this.queuedCascadeIds.has(cloud.id)) return;
    this.queuedCascadeIds.add(cloud.id);
    cloud.health = Math.min(cloud.health, .01);
    cloud.hurtFlash = 1;
    this.cascadeCount = Math.max(1, this.cascadeCount);
    this.cascadeTimer = .72;
    const tempo = Math.max(.022, .068 - Math.min(5, depth) * .005 - this.run.skills.cascadeGrid * .014 - this.run.skills.chainReactor * .01);
    // A huge late-game chain used to accumulate several seconds of invisible-death delay.
    // Keep the rapid "popcorn" cadence, but guarantee every zero-HP cloud is removed promptly.
    this.cascadeTailDelay = (this.cascadeTailDelay + tempo + Math.random() * .012) % .34;
    if (this.cascadeTailDelay < .018) this.cascadeTailDelay += .018;
    this.cascadeQueue.push({ cloudId: cloud.id, delay: this.cascadeTailDelay, depth });
  }

  private collapseFormation(core: Cloud, cascadeDepth: number): void {
    const members = this.clouds.filter((cloud) => cloud.formationId === core.formationId);
    if (members.length === 0) return;
    this.addFloatingText({ x: core.x, y: core.y - 45, text: `FORMATION BREAK  ×${members.length + 1}`, color: "#ffcf67", life: 1.6 });
    this.addShockwave({ x: core.x, y: core.y, radius: 30, life: .9, maxLife: .9, color: "#ffad66" });
    this.burst(core.x, core.y, "#ffad66", 34, 360);
    for (const member of members) {
      member.health = 0;
      member.hurtFlash = 1;
      this.queueCascade(member, cascadeDepth + 1);
    }
  }

  private updateCascadeQueue(dt: number): boolean {
    if (this.cascadeQueue.length === 0) return false;
    this.cascadeTailDelay = Math.max(0, this.cascadeTailDelay - dt);
    const due: CascadeHarvest[] = [];
    const pending: CascadeHarvest[] = [];
    for (const item of this.cascadeQueue) {
      item.delay -= dt;
      (item.delay <= 0 ? due : pending).push(item);
    }
    this.cascadeQueue = pending;
    const cloudById = new Map(this.clouds.map((cloud) => [cloud.id, cloud]));
    let harvested = false;
    for (const item of due) {
      this.queuedCascadeIds.delete(item.cloudId);
      const cloud = cloudById.get(item.cloudId);
      if (!cloud) continue;
      this.collectCloud(cloud, item.depth, true, "cascade");
      harvested = true;
    }
    return harvested;
  }

  private clearCascade(resetDisplay = true): void {
    this.cascadeQueue = [];
    this.cascadeTailDelay = 0;
    this.queuedCascadeIds.clear();
    if (resetDisplay) {
      this.cascadeCount = 0;
      this.cascadeTimer = 0;
      this.cascadePunch = 0;
    }
  }

  private bankLevelUps(): void {
    let gained = 0;
    while (this.run.xp >= this.run.xpNext) {
      this.run.xp -= this.run.xpNext;
      this.run.level += 1;
      this.run.xpNext = Math.round(6 + (this.run.level - 1) * 4.5);
      gained += 1;
    }
    if (gained > 0) this.commit();
    this.onRunChange(this.getRunState());
    if (gained > 0) this.onToast(`COMPANY LEVEL ${this.run.level} — 성장 효율 상승`, "success");
  }

  private presentLevelUp(): void {
    if (!this.atFactory) return;
    this.pausedForLevel = true;
    this.onRunChange(this.getRunState());
    this.onLevelUp(0);
  }

  private triggerPressureSurge(x: number, y: number, protectEventTargets = false): void {
    const bonus = this.combo * 3;
    this.run.cargoBonus += bonus;
    if (!this.run.feverActive) {
      this.run.fever = Math.min(100, this.run.fever + 18);
      if (this.run.fever >= 100) this.startFever();
    }
    for (const nearby of this.clouds) {
      if (protectEventTargets && (nearby.archiveShard || nearby.solarCore || nearby.auroraNode)) continue;
      const distance = Math.hypot(nearby.x - x, nearby.y - y);
      if (distance > 250) continue;
      const force = 1 - distance / 250;
      nearby.health = Math.max(1, nearby.health - (14 + this.combo * 1.5) * force);
      nearby.hurtFlash = 1;
      const dx = nearby.x - x; const dy = nearby.y - y; const length = Math.hypot(dx, dy) || 1;
      nearby.vx += dx / length * 150 * force;
      nearby.vy += dy / length * 150 * force;
    }
    this.addFloatingText({ x, y: y - 35, text: `PRESSURE SURGE  +${bonus}`, color: "#fff36f", life: 1.45 });
    this.addShockwave({ x, y, radius: 28, life: .78, maxLife: .78, color: "#fff36f" });
    this.burst(x, y, "#fff36f", 42, 390);
    this.shake = this.run.feverActive ? .8 : 5;
    this.impactFlash = .9;
    this.impactFreeze = this.run.feverActive ? 0 : .035;
    this.playChord();
  }

  private completeCloudFront(x: number, y: number): void {
    const jackpot = this.goldenFront;
    const bonus = Math.round((45 + this.run.mapRank * 35) * FLIGHT_ROUTES[this.run.routeId].frontBonus * (jackpot ? 3 : 1));
    this.run.cargoBonus += bonus;
    if (!this.run.feverActive) {
      this.run.fever = Math.min(100, this.run.fever + (jackpot ? 60 : 28));
      if (this.run.fever >= 100) this.startFever();
    }
    this.frontActive = 0;
    if (jackpot) this.goldenFrontClaimed = true;
    this.frontBanner = 2.4;
    this.addFloatingText({ x, y: y - 42, text: `${jackpot ? "JACKPOT SECURED" : "FRONT CLEARED"}  +${bonus}`, color: jackpot ? "#fff36f" : "#8fffe4", life: 1.8 });
    this.addShockwave({ x, y, radius: 40, life: 1, maxLife: 1, color: "#71ffe0" });
    this.addShockwave({ x, y, radius: 16, life: .72, maxLife: .72, color: "#fff36f" });
    this.burst(x, y, "#71ffe0", 65, 430);
    this.burst(x, y, "#fff36f", 35, 360);
    this.shake = this.run.feverActive ? .8 : 22;
    this.impactFlash = 1;
    this.impactFreeze = this.run.feverActive ? 0 : .1;
    this.playChord();
  }

  private startFever(): void {
    this.run.feverActive = true;
    this.run.feverSeconds = 7 + this.run.skills.feverDrive * 2.5 + this.run.skills.stormCatalyst * 1.5
      + this.run.skills.goldenStorm * 3 + this.run.skills.sunStorm * 4 + this.run.skills.feverReserve * .8;
    this.shake = 1.2;
    this.impactFlash = .85;
    this.comboPunch = 1;
    this.onToast(this.run.skills.goldenStorm ? "황금 폭풍! 흡입력 360% · 가치 150%" : "SKY FEVER! 흡입력 265%", "success");
    this.burst(this.player.x, this.player.y, "#fff36f", 65, 310);
    this.playChord();
  }

  private spawnCloud(initial: boolean, forcedKind?: CloudKind): void {
    const zoom = this.getWorldZoom();
    const worldWidth = this.getWorldWidth();
    const worldHeight = this.getWorldHeight();
    const rank = RANKS[this.run.mapRank];
    let kind: CloudKind = forcedKind ?? "cumulus";
    if (!forcedKind) {
      const roll = Math.random();
      let cursor = 0;
      for (const candidate of Object.keys(rank.weights) as CloudKind[]) {
        cursor += rank.weights[candidate];
        if (roll <= cursor) { kind = candidate; break; }
      }
      const lowTierBias = FLIGHT_ROUTES[this.run.routeId].lowTierBias;
      if (this.run.mapRank > 0 && Math.random() < lowTierBias) {
        const highestFallback = Math.max(0, this.run.mapRank - 1);
        kind = CLOUD_ORDER[Math.floor(Math.random() * (highestFallback + 1))];
      }
    }
    const definition = CLOUDS[kind];
    const dense = Math.random() < .085 + this.run.mapRank * .018 + (this.run.flight - 1) * .035 + FLIGHT_ROUTES[this.run.routeId].denseBonus + this.run.skills.denseRadar * .03 + this.state.research.forecasting * .015;
    const radius = (definition.radius[0] + Math.random() * (definition.radius[1] - definition.radius[0])) * (dense ? 1.16 : 1);
    const scale = radius / ((definition.radius[0] + definition.radius[1]) * .5);
    let x = 90 / zoom + Math.random() * Math.max(100 / zoom, worldWidth - 180 / zoom);
    let y = 205 / zoom + Math.random() * Math.max(90 / zoom, worldHeight - 390 / zoom);
    const interiorSpawn = initial || Math.random() < .78;
    if (interiorSpawn) {
      for (let attempt = 0; attempt < 6 && Math.hypot(x - this.player.x, y - this.player.y) < 175; attempt += 1) {
        x = 90 / zoom + Math.random() * Math.max(100 / zoom, worldWidth - 180 / zoom);
        y = 205 / zoom + Math.random() * Math.max(90 / zoom, worldHeight - 390 / zoom);
      }
      if (x > worldWidth - 405 / zoom && y < 345 / zoom) y = 350 / zoom + Math.random() * Math.max(60 / zoom, worldHeight - 500 / zoom);
    } else {
      const side = Math.floor(Math.random() * 3);
      if (side === 0) { x = radius + 4 / zoom; y = 220 / zoom + Math.random() * Math.max(80 / zoom, worldHeight - 410 / zoom); }
      if (side === 1) { x = worldWidth - radius - 4 / zoom; y = 350 / zoom + Math.random() * Math.max(55 / zoom, worldHeight - 520 / zoom); }
      if (side === 2) { y = 180 / zoom + radius; x = 85 / zoom + Math.random() * Math.max(100 / zoom, worldWidth - 540 / zoom); }
    }
    const altitudeResistance = 1 + this.run.mapRank * .2;
    const health = definition.health * scale * (dense ? 1.65 : 1) * altitudeResistance;
    this.clouds.push({ id: ++this.cloudId, kind, x, y, vx: (Math.random() - .5) * 8, vy: (Math.random() - .5) * 6, radius, phase: Math.random() * Math.PI * 2, charged: false, age: initial ? .6 + Math.random() * 4.4 : 0, health, maxHealth: health, hurtFlash: 0, dense, front: false });
    this.announceCloudDiscovery(kind);
  }

  private announceCloudDiscovery(kind: CloudKind): void {
    if (kind === "cumulus" || this.discoveredCloudKinds.has(kind)) return;
    this.discoveredCloudKinds.add(kind);
    this.discoveryBanner = { kind, life: 2.8, maxLife: 2.8 };
    const definition = CLOUDS[kind];
    this.onToast(`${definition.icon} 신규 기상체 발견 — ${definition.name}!`, "success");
    this.playTone(460 + definition.unlockRank * 95, .16);
  }

  private spawnFormation(availableSlots: number): boolean {
    const zoom = this.getWorldZoom();
    const worldWidth = this.getWorldWidth();
    const worldHeight = this.getWorldHeight();
    const count = Math.min(availableSlots, 5 + (this.run.flight - 1) * 2 + (this.run.feverActive ? 2 : 0));
    if (count < 4) return false;
    const kinds: CloudFormationKind[] = ["ring", "stream", "cluster"];
    const formationKind = kinds[Math.floor(Math.random() * kinds.length)];
    const id = ++this.formationId;
    let centerX = 180 / zoom + Math.random() * Math.max(120 / zoom, worldWidth - 590 / zoom);
    let centerY = 245 / zoom + Math.random() * Math.max(80 / zoom, worldHeight - 470 / zoom);
    for (let attempt = 0; attempt < 5 && Math.hypot(centerX - this.player.x, centerY - this.player.y) < 210; attempt += 1) {
      centerX = 180 / zoom + Math.random() * Math.max(120 / zoom, worldWidth - 590 / zoom);
      centerY = 245 / zoom + Math.random() * Math.max(80 / zoom, worldHeight - 470 / zoom);
    }
    for (let index = 0; index < count; index += 1) {
      this.spawnCloud(false);
      const cloud = this.clouds[this.clouds.length - 1];
      const centered = index - (count - 1) / 2;
      if (formationKind === "ring") {
        const angle = index / count * Math.PI * 2;
        cloud.x = centerX + Math.cos(angle) * 92;
        cloud.y = centerY + Math.sin(angle) * 68;
      } else if (formationKind === "stream") {
        cloud.x = centerX + centered * 58;
        cloud.y = centerY + Math.sin(index * 1.25) * 42;
        cloud.vx += 13;
      } else {
        const angle = index * 2.4;
        const spread = 24 + Math.sqrt(index) * 34;
        cloud.x = centerX + Math.cos(angle) * spread;
        cloud.y = centerY + Math.sin(angle) * spread * .72;
      }
      cloud.x = Math.max(cloud.radius + 10 / zoom, Math.min(worldWidth - cloud.radius - 20 / zoom, cloud.x));
      cloud.y = Math.max(120 / zoom + cloud.radius, Math.min(worldHeight - 145 / zoom - cloud.radius, cloud.y));
      cloud.formationId = id;
      cloud.formationKind = formationKind;
      cloud.formationCore = index === Math.floor(count / 2);
      if (cloud.formationCore) {
        cloud.dense = true;
        cloud.maxHealth *= 1.75;
        cloud.health = cloud.maxHealth;
        cloud.radius *= 1.12;
      }
    }
    this.formationCooldown = this.run.feverActive ? 2.6 : Math.max(4.2, 7 - this.run.flight * .7);
    const label = formationKind === "ring" ? "CLOUD RING" : formationKind === "stream" ? "JETSTREAM PACK" : "PRESSURE CLUSTER";
    this.addFloatingText({ x: centerX, y: centerY - 90, text: `${label}  ·  CORE TARGET`, color: "#8fffe9", life: 1.5 });
    return true;
  }

  private startCloudFront(): void {
    const zoom = this.getWorldZoom();
    const worldWidth = this.getWorldWidth();
    const worldHeight = this.getWorldHeight();
    this.goldenFront = this.run.flight === 3 && !this.goldenFrontClaimed;
    this.frontTimer = this.goldenFront ? 20 : Math.max(24, 36 - this.run.mapRank * 4);
    this.frontActive = 11;
    this.frontBanner = 3.2;
    this.frontDirection = Math.random() < .5 ? 1 : -1;
    const count = (this.goldenFront ? 11 : 7) + this.run.mapRank * 2;
    for (let index = 0; index < count; index += 1) {
      this.spawnCloud(false);
      const cloud = this.clouds[this.clouds.length - 1];
      cloud.front = true;
      if (this.goldenFront && !cloud.dense) {
        cloud.dense = true;
        cloud.maxHealth *= 1.35;
        cloud.health = cloud.maxHealth;
      }
      cloud.x = this.frontDirection === 1 ? -cloud.radius : worldWidth + cloud.radius;
      const rows = Math.min(5, count);
      const routeTop = (this.frontDirection === -1 ? 350 : 215) / zoom;
      const routeBottom = Math.max(routeTop + 80 / zoom, worldHeight - 165 / zoom);
      cloud.y = routeTop + (index % rows) * ((routeBottom - routeTop) / Math.max(1, rows - 1)) + Math.floor(index / rows) * 18;
      cloud.vx = this.frontDirection * (62 + Math.random() * 32);
      cloud.vy = (Math.random() - .5) * 9;
    }
    this.shake = 10;
    this.onToast(this.goldenFront ? "GOLDEN HARVEST FRONT — 하루 최대 수익 구간!" : "구름 전선 접근 — 전부 수확하세요!", "success");
    this.playTone(this.goldenFront ? 220 : 145, .28);
  }

  private suctionParticle(cloud: Cloud): void {
    if (this.particles.length >= MAX_PARTICLES) return;
    const progress = Math.random();
    const x = cloud.x + (this.player.x - cloud.x) * progress + (Math.random() - .5) * cloud.radius;
    const y = cloud.y + (this.player.y - cloud.y) * progress + (Math.random() - .5) * cloud.radius;
    const dx = this.player.x - x;
    const dy = this.player.y - y;
    this.particles.push({ x, y, vx: dx * (1.8 + Math.random()), vy: dy * (1.8 + Math.random()), life: .32, maxLife: .32, size: 2 + Math.random() * 4, color: CLOUDS[cloud.kind].color });
  }

  private render(time: number): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    const cameraShake = this.run.feverActive ? Math.min(.8, this.shake) : this.shake;
    const smoothShake = this.run.feverActive || cameraShake <= 5;
    const sx = cameraShake ? (smoothShake ? Math.sin(time * 24) * cameraShake * .45 : (Math.random() - .5) * cameraShake) : 0;
    const sy = cameraShake ? (smoothShake ? Math.cos(time * 21) * cameraShake * .35 : (Math.random() - .5) * cameraShake) : 0;
    ctx.save();
    ctx.translate(sx, sy);
    if (this.atFactory) {
      this.drawBase(ctx, time);
      this.drawPlayer(ctx, time);
      ctx.restore();
      if (this.launching) this.drawLaunchTransition(ctx);
      return;
    }
    this.drawSky(ctx, time);
    const zoom = this.getWorldZoom();
    ctx.save();
    ctx.scale(zoom, zoom);
    this.drawIsland(ctx);
    this.drawFormationLinks(ctx, time);
    if (this.isSuctionActive()) this.drawSuctionField(ctx, time);
    this.drawCascadeLinks(ctx, time);
    for (const cloud of this.clouds) this.drawCloud(ctx, cloud, time);
    this.drawArchiveRelay(ctx, time);
    this.drawSolarEngine(ctx, time);
    this.drawOpenSkyCore(ctx, time);
    this.drawRivalHarvester(ctx, time);
    this.drawStormDroneBeams(ctx, time);
    this.drawHarvestLinks(ctx, time);
    for (const wave of this.shockwaves) {
      const alpha = Math.max(0, wave.life / wave.maxLife);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 3 + alpha * 7;
      ctx.beginPath(); ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    this.drawDrones(ctx);
    this.drawPlayer(ctx, time);
    if (this.pointer.visible && !this.touchDirect) this.drawAimReticle(ctx, time);
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.min(1, particle.life / particle.maxLife);
      const speed = Math.hypot(particle.vx, particle.vy);
      if (particle.shape === "drop") {
        ctx.save(); ctx.translate(particle.x, particle.y); ctx.rotate(Math.atan2(particle.vy, particle.vx) - Math.PI / 2);
        ctx.fillStyle = particle.color; ctx.beginPath(); ctx.ellipse(0, 0, particle.size * .58, particle.size * 1.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        continue;
      }
      if (particle.shape === "shard") {
        ctx.save(); ctx.translate(particle.x, particle.y); ctx.rotate(Math.atan2(particle.vy, particle.vx));
        ctx.fillStyle = particle.color; ctx.beginPath(); ctx.moveTo(particle.size * 1.9, 0); ctx.lineTo(-particle.size, particle.size * .7); ctx.lineTo(-particle.size * .45, -particle.size * .8); ctx.closePath(); ctx.fill(); ctx.restore();
        continue;
      }
      if (particle.shape === "ribbon") {
        ctx.strokeStyle = particle.color; ctx.lineWidth = Math.max(2, particle.size * .8); ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(particle.x, particle.y); ctx.quadraticCurveTo(particle.x - particle.vx * .03, particle.y - particle.vy * .01, particle.x - particle.vx * .065, particle.y - particle.vy * .055); ctx.stroke();
        continue;
      }
      if (speed > 90) {
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = Math.max(1.5, particle.size * .65);
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - particle.vx * .035, particle.y - particle.vy * .035);
        ctx.stroke();
      }
      ctx.fillStyle = particle.color;
      ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const text of this.texts) {
      ctx.globalAlpha = Math.min(1, text.life * 1.7);
      ctx.fillStyle = text.color;
      ctx.font = "900 18px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(25,63,93,.55)";
      ctx.lineWidth = 4;
      ctx.strokeText(text.text, text.x, text.y);
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    this.drawPlayerFuelBar(ctx, time, zoom);
    this.drawImpactOverlay(ctx, time);
    ctx.restore();
    if (this.returning) this.drawReturnTransition(ctx);
    if (this.launching) this.drawLaunchTransition(ctx);
  }

  private drawBase(ctx: CanvasRenderingContext2D, time: number): void {
    const wall = ctx.createLinearGradient(0, 0, 0, this.height);
    wall.addColorStop(0, "#0a2635"); wall.addColorStop(.58, "#1c4655"); wall.addColorStop(1, "#163541");
    ctx.fillStyle = wall; ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = "#081e2b";
    for (let x = -80; x < this.width + 100; x += 180) {
      ctx.save(); ctx.translate(x, 0); ctx.transform(1, 0, -.18, 1, 0, 0); ctx.fillRect(0, 0, 28, this.height * .62); ctx.restore();
    }
    ctx.fillStyle = "#285d69"; ctx.fillRect(0, 72, this.width, 18); ctx.fillRect(0, this.height * .58, this.width, 14);
    ctx.fillStyle = "#112f3d"; ctx.fillRect(this.width * .22, 98, this.width * .56, this.height * .47);
    ctx.strokeStyle = "#3e7380"; ctx.lineWidth = 4;
    for (let x = this.width * .22; x <= this.width * .78; x += this.width * .14) {
      ctx.beginPath(); ctx.moveTo(x, 98); ctx.lineTo(x, this.height * .55); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(126,217,220,.28)";
    for (let y = 135; y < this.height * .55; y += 62) { ctx.beginPath(); ctx.moveTo(this.width * .22, y); ctx.lineTo(this.width * .78, y); ctx.stroke(); }

    const floorTop = this.height * .6;
    const floor = ctx.createLinearGradient(0, floorTop, 0, this.height);
    floor.addColorStop(0, "#315764"); floor.addColorStop(1, "#102936"); ctx.fillStyle = floor; ctx.fillRect(0, floorTop, this.width, this.height - floorTop);
    ctx.strokeStyle = "rgba(126,217,220,.2)"; ctx.lineWidth = 2;
    for (let x = -this.width; x < this.width * 2; x += 90) { ctx.beginPath(); ctx.moveTo(this.width / 2, floorTop); ctx.lineTo(x, this.height); ctx.stroke(); }
    for (let y = floorTop + 30; y < this.height; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke(); }

    const tanks = [
      { x: 54, color: "#dff8ff", code: "CUM" }, { x: 112, color: "#7695ad", code: "RAN" }, { x: 170, color: "#8275cf", code: "ELC" },
      { x: this.width - 170, color: "#b9f3ff", code: "ICE" }, { x: this.width - 112, color: "#ffd86a", code: "SOL" }, { x: this.width - 54, color: "#8fffd2", code: "AUR" },
    ];
    for (const tank of tanks) {
      ctx.fillStyle = "#173c4a"; ctx.beginPath(); ctx.roundRect(tank.x - 23, 192, 46, 176, 16); ctx.fill();
      ctx.strokeStyle = tank.color; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = tank.color; ctx.globalAlpha = .72; ctx.fillRect(tank.x - 18, 292, 36, 62); ctx.globalAlpha = 1;
      ctx.fillStyle = "#dffaff"; ctx.textAlign = "center"; ctx.font = "900 9px Outfit, sans-serif"; ctx.fillText(tank.code, tank.x, 218);
    }
    ctx.fillStyle = "rgba(3,18,26,.5)"; ctx.beginPath(); ctx.ellipse(this.width * .5, this.height * .68, 150, 44, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#fff36f"; ctx.lineWidth = 5; ctx.setLineDash([18, 12]); ctx.lineDashOffset = -time * 28;
    ctx.beginPath(); ctx.ellipse(this.width * .5, this.height * .68, 130, 34, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#7ff5df"; ctx.textAlign = "center"; ctx.font = "900 15px Outfit, sans-serif"; ctx.fillText("CLOUD HARVEST BASE  01", this.width * .5, 125);
    if (this.returning) {
      ctx.fillStyle = "rgba(6,24,34,.72)"; ctx.beginPath(); ctx.roundRect(this.width * .5 - 190, this.height * .78, 380, 62, 16); ctx.fill();
      ctx.strokeStyle = "#7ff5df"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "#7ff5df"; ctx.font = "900 12px Outfit, sans-serif"; ctx.fillText("DOCKING COMPLETE", this.width * .5, this.height * .78 + 24);
      ctx.fillStyle = "#ffffff"; ctx.font = "900 18px Outfit, sans-serif"; ctx.fillText("화물 처리 베이 연결 중…", this.width * .5, this.height * .78 + 46);
    }
    for (let x = 42; x < this.width; x += 80) {
      ctx.fillStyle = Math.sin(time * 3 + x) > 0 ? "#7ff5df" : "#244c58";
      ctx.beginPath(); ctx.arc(x, 82, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  private drawReturnTransition(ctx: CanvasRenderingContext2D): void {
    const launch = Math.max(0, Math.min(1, (this.returnTimer - .66) / .89));
    if (launch <= 0) return;
    const wipe = Math.max(0, Math.min(1, (this.returnTimer - .92) / .63));
    ctx.save();
    ctx.fillStyle = `rgba(6,24,34,${wipe * .96})`;
    const edge = this.width * (1.25 - wipe * 1.45);
    ctx.beginPath(); ctx.moveTo(edge, 0); ctx.lineTo(this.width + 200, 0); ctx.lineTo(this.width + 200, this.height); ctx.lineTo(edge - 260, this.height); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = Math.min(1, launch * 2.2) * (1 - Math.max(0, (wipe - .82) * 5));
    ctx.strokeStyle = "rgba(255,243,111,.7)"; ctx.lineWidth = 5;
    for (let index = 0; index < 9; index += 1) {
      const y = this.height * .2 + index * 46;
      ctx.beginPath(); ctx.moveTo(this.width * .06, y + 70); ctx.lineTo(this.width * (.32 + launch * .35), y); ctx.stroke();
    }
    ctx.textAlign = "center"; ctx.fillStyle = "#ffffff"; ctx.font = "900 42px Outfit, sans-serif"; ctx.fillText("RETURN TO BASE", this.width * .5, this.height * .44);
    ctx.fillStyle = "#fff36f"; ctx.font = "900 15px Outfit, sans-serif"; ctx.fillText("FLIGHT COMPLETE  ·  CARGO SECURED", this.width * .5, this.height * .44 + 30);
    ctx.restore();
  }

  private drawLaunchTransition(ctx: CanvasRenderingContext2D): void {
    const closing = Math.max(0, Math.min(1, (this.launchTimer - .48) / .5));
    const opening = Math.max(0, Math.min(1, (this.launchTimer - 1.1) / .58));
    const cover = this.launchTimer < 1.1 ? closing : 1 - opening;
    ctx.save();
    if (cover > 0) {
      ctx.fillStyle = `rgba(5,22,31,${cover * .96})`;
      const edge = this.width * (1.32 - cover * 1.58);
      ctx.beginPath(); ctx.moveTo(edge, 0); ctx.lineTo(this.width + 220, 0); ctx.lineTo(this.width + 220, this.height); ctx.lineTo(edge - 270, this.height); ctx.closePath(); ctx.fill();
    }
    const titleAlpha = Math.min(1, Math.max(0, (this.launchTimer - .18) * 3.2)) * (1 - Math.max(0, opening - .45) / .55);
    ctx.globalAlpha = titleAlpha;
    ctx.textAlign = "center"; ctx.fillStyle = this.run.flight === 3 ? "#fff36f" : "#7ff5df"; ctx.font = "900 14px Outfit, sans-serif";
    ctx.fillText(`DAY ${this.run.day}  ·  FLIGHT ${this.run.flight}/3  ·  ${this.run.flight === 3 ? "FINAL HARVEST" : this.run.flight === 2 ? "PRESSURE RISING" : "CLEAR ROUTE"}`, this.width * .5, this.height * .43 - 30);
    ctx.fillStyle = "#ffffff"; ctx.font = "900 44px Outfit, sans-serif"; ctx.fillText(this.run.flight === 3 ? "JACKPOT SORTIE" : "SORTIE LAUNCHED", this.width * .5, this.height * .43 + 12);
    ctx.strokeStyle = "rgba(127,245,223,.62)"; ctx.lineWidth = 4;
    for (let index = 0; index < 7; index += 1) {
      const y = this.height * .22 + index * 52;
      ctx.beginPath(); ctx.moveTo(this.width * .08, y + 55); ctx.lineTo(this.width * (.3 + closing * .4), y); ctx.stroke();
    }
    ctx.restore();
  }

  private drawSky(ctx: CanvasRenderingContext2D, time: number): void {
    const rankSkies = [
      ["#75d7f5", "#dff8ff", "#fff4c9"],
      ["#3996bb", "#86c8dc", "#e5e5c5"],
      ["#4d579f", "#829ac9", "#e6c6aa"],
      ["#153f70", "#4e83a8", "#c8f5f2"],
      ["#5c327f", "#e47372", "#ffd271"],
      ["#07152f", "#173c65", "#3d7390"],
    ];
    const gradients = this.run.feverActive ? ["#7e73f2", "#64dfe3", "#fff0a8"] : rankSkies[this.run.mapRank];
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, gradients[0]); gradient.addColorStop(.7, gradients[1]); gradient.addColorStop(1, gradients[2]);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, this.width, this.height);
    if (!this.run.feverActive && this.run.flight > 1) {
      const phase = ctx.createLinearGradient(0, 0, this.width, this.height);
      if (this.run.flight === 3) {
        phase.addColorStop(0, "rgba(92,56,154,.42)"); phase.addColorStop(.48, "rgba(255,137,91,.2)"); phase.addColorStop(1, "rgba(255,231,107,.4)");
      } else {
        phase.addColorStop(0, "rgba(37,86,142,.28)"); phase.addColorStop(.55, "rgba(117,106,189,.12)"); phase.addColorStop(1, "rgba(255,203,117,.18)");
      }
      ctx.fillStyle = phase; ctx.fillRect(0, 0, this.width, this.height);
    }
    ctx.globalAlpha = this.run.feverActive ? .35 : .16;
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 24; i += 1) {
      const x = ((i * 149 + time * (9 + i % 4)) % (this.width + 100)) - 50;
      const y = 80 + (i * 71) % Math.max(110, this.height - 220);
      ctx.beginPath(); ctx.arc(x, y, 2 + i % 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!this.run.feverActive && this.run.mapRank === 3) {
      ctx.strokeStyle = "rgba(194,249,255,.42)"; ctx.lineWidth = 2;
      for (let crystal = 0; crystal < 16; crystal += 1) {
        const x = (crystal * 113 + time * 28) % (this.width + 100) - 50;
        const y = 120 + (crystal * 79) % Math.max(130, this.height - 280);
        ctx.beginPath(); ctx.moveTo(x - 11, y); ctx.lineTo(x, y - 18); ctx.lineTo(x + 11, y); ctx.lineTo(x, y + 18); ctx.closePath(); ctx.stroke();
      }
    }
    if (!this.run.feverActive && this.run.mapRank === 4) {
      const sun = ctx.createRadialGradient(this.width * .78, this.height * .22, 8, this.width * .78, this.height * .22, 130);
      sun.addColorStop(0, "rgba(255,255,210,.98)"); sun.addColorStop(.18, "rgba(255,231,103,.72)"); sun.addColorStop(1, "rgba(255,153,74,0)");
      ctx.fillStyle = sun; ctx.fillRect(0, 0, this.width, this.height);
    }
    if (!this.run.feverActive && this.run.mapRank >= 5) {
      ctx.globalCompositeOperation = "lighter"; ctx.lineWidth = 18; ctx.lineCap = "round";
      ["rgba(99,255,198,.18)", "rgba(147,115,255,.17)", "rgba(83,208,255,.15)"].forEach((color, ribbon) => {
        ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(-80, 145 + ribbon * 62);
        ctx.bezierCurveTo(this.width * .28, 40 + Math.sin(time + ribbon) * 35, this.width * .62, 330 + Math.cos(time * .7 + ribbon) * 55, this.width + 80, 95 + ribbon * 70); ctx.stroke();
      });
      ctx.globalCompositeOperation = "source-over";
    }
    if (this.run.mapRank >= 1 && !this.run.feverActive) {
      ctx.strokeStyle = this.run.mapRank === 2 ? "rgba(191,210,255,.22)" : "rgba(255,255,255,.2)";
      ctx.lineWidth = this.run.mapRank === 2 ? 2 : 1.5;
      for (let i = 0; i < 34; i += 1) {
        const x = (i * 91 + time * (this.run.mapRank === 2 ? 145 : 85)) % (this.width + 160) - 80;
        const y = 110 + (i * 53) % Math.max(120, this.height - 250);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 12, y + 30); ctx.stroke();
      }
    }
    if (this.run.feverActive) {
      const pulse = .76 + Math.sin(time * 7) * .08;
      const zoom = this.getWorldZoom();
      const playerScreenX = this.player.x * zoom;
      const playerScreenY = this.player.y * zoom;
      const halo = ctx.createRadialGradient(playerScreenX, playerScreenY, 20, playerScreenX, playerScreenY, Math.max(this.width, this.height) * .72);
      halo.addColorStop(0, `rgba(255,247,126,${pulse * .32})`);
      halo.addColorStop(.45, "rgba(113,245,236,.09)"); halo.addColorStop(1, "rgba(130,86,232,0)");
      ctx.fillStyle = halo; ctx.fillRect(0, 0, this.width, this.height);
      ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 3;
      for (let i = 0; i < 18; i += 1) {
        const angle = i * Math.PI * 2 / 18 + time * .35;
        const inner = 95 + (i % 3) * 18; const outer = Math.max(this.width, this.height) * .8;
        ctx.beginPath(); ctx.moveTo(playerScreenX + Math.cos(angle) * inner, playerScreenY + Math.sin(angle) * inner);
        ctx.lineTo(playerScreenX + Math.cos(angle) * outer, playerScreenY + Math.sin(angle) * outer); ctx.stroke();
      }
    }
    if (this.frontActive > 0) {
      ctx.strokeStyle = this.goldenFront ? "rgba(255,239,116,.78)" : "rgba(222,255,250,.58)"; ctx.lineWidth = this.goldenFront ? 4 : 2.5;
      const direction = this.frontDirection;
      for (let index = 0; index < 28; index += 1) {
        const travel = (time * (210 + index % 4 * 35) * direction + index * 137) % (this.width + 260);
        const x = direction === 1 ? travel - 130 : this.width - travel + 130;
        const y = 175 + (index * 47) % Math.max(120, this.height - 330);
        const length = 34 + index % 5 * 13;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - direction * length, y); ctx.stroke();
      }
    }
  }

  private drawIsland(ctx: CanvasRenderingContext2D): void {
    const worldWidth = this.getWorldWidth();
    const worldHeight = this.getWorldHeight();
    const zoom = this.getWorldZoom();
    const y = worldHeight - 68 / zoom;
    if (this.run.mapRank <= 1) {
      ctx.fillStyle = this.run.mapRank === 0 ? "#7fce64" : "#6b9f72";
      ctx.beginPath(); ctx.ellipse(worldWidth * .48, y, worldWidth * .52, 72 / zoom, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = this.run.mapRank === 0 ? "#73b754" : "#557f68"; ctx.fillRect(0, y, worldWidth, worldHeight - y);
      const buildings = Math.min(8, 2 + Math.floor(this.state.totalEarned / 100));
      for (let i = 0; i < buildings; i += 1) {
        const bx = (38 + i * 58) / zoom; const bh = (23 + i % 3 * 11) / zoom;
        ctx.fillStyle = ["#fff0b8", "#ffb5a7", "#bde0fe"][i % 3]; ctx.fillRect(bx, y - bh, 36 / zoom, bh);
        ctx.fillStyle = "#594f62"; ctx.beginPath(); ctx.moveTo(bx - 4 / zoom, y - bh); ctx.lineTo(bx + 18 / zoom, y - bh - 15 / zoom); ctx.lineTo(bx + 40 / zoom, y - bh); ctx.fill();
      }
    } else if (this.run.mapRank === 2) {
      ctx.fillStyle = "#263b60"; ctx.beginPath(); ctx.moveTo(0, y + 18 / zoom); ctx.lineTo(worldWidth * .18, y - 48 / zoom); ctx.lineTo(worldWidth * .34, y + 4 / zoom); ctx.lineTo(worldWidth * .56, y - 78 / zoom); ctx.lineTo(worldWidth * .77, y); ctx.lineTo(worldWidth, y - 38 / zoom); ctx.lineTo(worldWidth, worldHeight); ctx.lineTo(0, worldHeight); ctx.closePath(); ctx.fill();
    } else if (this.run.mapRank === 3) {
      ctx.fillStyle = "#8bcbd8"; ctx.beginPath(); ctx.moveTo(0, y + 5 / zoom); ctx.lineTo(worldWidth * .14, y - 25 / zoom); ctx.lineTo(worldWidth * .3, y + 2 / zoom); ctx.lineTo(worldWidth * .5, y - 46 / zoom); ctx.lineTo(worldWidth * .72, y - 8 / zoom); ctx.lineTo(worldWidth, y - 34 / zoom); ctx.lineTo(worldWidth, worldHeight); ctx.lineTo(0, worldHeight); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(235,255,255,.75)"; ctx.lineWidth = 4 / zoom; ctx.beginPath(); ctx.moveTo(0, y + 5 / zoom); ctx.lineTo(worldWidth * .14, y - 25 / zoom); ctx.lineTo(worldWidth * .3, y + 2 / zoom); ctx.lineTo(worldWidth * .5, y - 46 / zoom); ctx.lineTo(worldWidth * .72, y - 8 / zoom); ctx.lineTo(worldWidth, y - 34 / zoom); ctx.stroke();
    } else {
      const earth = ctx.createRadialGradient(worldWidth * .5, worldHeight + 210 / zoom, 100 / zoom, worldWidth * .5, worldHeight + 210 / zoom, worldWidth * .72);
      earth.addColorStop(.58, this.run.mapRank === 4 ? "#397ead" : "#214f80"); earth.addColorStop(.72, "#8bd6e4"); earth.addColorStop(.75, "rgba(202,249,255,.8)"); earth.addColorStop(.79, "rgba(130,210,255,.12)"); earth.addColorStop(1, "rgba(30,77,120,0)");
      ctx.fillStyle = earth; ctx.fillRect(0, 0, worldWidth, worldHeight);
    }
  }

  private drawOpenSkyCore(ctx: CanvasRenderingContext2D, time: number): void {
    const finale = this.run.openSky;
    if (finale.status === "inactive") return;
    const { x, y } = this.openSkyPosition();
    const instabilityRatio = finale.instability / Math.max(1, finale.instabilityLimit);
    const circuitRatio = finale.circuits / Math.max(1, finale.circuitTarget);
    const locked = finale.lockTime > 0;
    const pulse = 1 + Math.sin(time * (locked ? 8.5 : 3.4)) * (.03 + instabilityRatio * .04) + this.openSkyPulse * .08;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.globalAlpha = finale.status === "lost" ? .55 : 1;

    const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 112);
    glow.addColorStop(0, `rgba(255,255,255,${.46 + circuitRatio * .3})`);
    glow.addColorStop(.3, `rgba(137,234,255,${.32 + instabilityRatio * .26})`);
    glow.addColorStop(.62, `rgba(204,137,255,${.2 + instabilityRatio * .24})`);
    glow.addColorStop(1, "rgba(255,101,204,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 112, 0, Math.PI * 2); ctx.fill();

    for (let ring = 0; ring < 3; ring += 1) {
      ctx.save();
      ctx.rotate((ring % 2 ? -1 : 1) * time * (.55 + ring * .25) + ring * .7);
      ctx.strokeStyle = locked ? `rgba(255,112,196,${.9 - ring * .18})` : [`#9bf5ff`, "#d8b8ff", "#ffb3df"][ring];
      ctx.lineWidth = 5 - ring;
      ctx.setLineDash([15 + ring * 3, 8 + ring * 2]);
      ctx.beginPath(); ctx.ellipse(0, 0, 49 + ring * 12, 32 + ring * 8, ring * .5, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);
    ctx.shadowColor = locked ? "#ff67bc" : "#b9f7ff";
    ctx.shadowBlur = 30 + instabilityRatio * 28;
    const coreGradient = ctx.createLinearGradient(-28, -28, 28, 28);
    coreGradient.addColorStop(0, "#a5f8ff");
    coreGradient.addColorStop(.48, "#ffffff");
    coreGradient.addColorStop(1, locked ? "#ff78bf" : "#d6a8ff");
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    for (let point = 0; point < 8; point += 1) {
      const angle = point * Math.PI / 4 + time * .22;
      const radius = point % 2 ? 17 : 29;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.fillStyle = "rgba(24,26,58,.9)";
    ctx.strokeStyle = locked ? "#ff8fcf" : "#bdefff";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-78, 82, 156, 32, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = locked ? "#ffb3df" : "#f1e6ff";
    ctx.font = "900 11px Outfit, sans-serif";
    ctx.textAlign = "center";
    const label = finale.status === "won" ? "WEATHER CYCLE ONLINE" : finale.status === "lost" ? "SKYLOOP RESET" : locked ? `OVERLOAD LOCK ${finale.lockTime.toFixed(1)}s` : `SKYLOOP ${finale.circuits}/${finale.circuitTarget}`;
    ctx.fillText(label, 0, 103);
    ctx.restore();
  }

  private drawSolarEngine(ctx: CanvasRenderingContext2D, time: number): void {
    const engine = this.run.solarEngine;
    if (engine.status === "inactive") return;
    const { x, y } = this.solarEnginePosition();
    const heatRatio = engine.heat / Math.max(1, engine.heatLimit);
    const chargeRatio = engine.charge / Math.max(1, engine.chargeTarget);
    const locked = engine.lockTime > 0;
    const pulse = 1 + Math.sin(time * (locked ? 8 : 3.8)) * (.025 + heatRatio * .045) + this.solarEnginePulse * .08;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.globalAlpha = engine.status === "lost" ? .58 : 1;

    const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 92);
    glow.addColorStop(0, `rgba(255,244,171,${.38 + heatRatio * .35})`);
    glow.addColorStop(.48, `rgba(255,151,45,${.18 + heatRatio * .28})`);
    glow.addColorStop(1, "rgba(255,100,37,0)");
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 92, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.rotate(time * (locked ? -.35 : .7 + chargeRatio * 1.4));
    ctx.strokeStyle = locked ? "#ff7158" : "#ffcc63";
    ctx.lineWidth = 7;
    ctx.setLineDash([24, 10]);
    ctx.beginPath(); ctx.arc(0, 0, 61, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate(-time * (locked ? .24 : 1.05 + chargeRatio));
    ctx.strokeStyle = "rgba(255,246,193,.82)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 9]);
    ctx.beginPath(); ctx.arc(0, 0, 48, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    ctx.shadowColor = locked ? "#ff5b44" : "#ffb329";
    ctx.shadowBlur = 26 + heatRatio * 24;
    ctx.fillStyle = locked ? "#8e2f2a" : "#633b24";
    ctx.strokeStyle = "#fff0a3";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowColor = "transparent";
    for (let blade = 0; blade < 6; blade += 1) {
      const angle = blade * Math.PI / 3 + time * (locked ? .25 : 1.8 + chargeRatio * 2.2);
      ctx.save(); ctx.rotate(angle);
      ctx.fillStyle = locked ? "#ff745b" : "#ffd36b";
      ctx.beginPath(); ctx.moveTo(5, -4); ctx.lineTo(29, -10); ctx.lineTo(22, 7); ctx.lineTo(5, 5); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#fff8d5";
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "rgba(35,25,23,.88)";
    ctx.strokeStyle = locked ? "#ff8b69" : "#ffd36b";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-73, 75, 146, 31, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = locked ? "#ffb09c" : "#fff1ad";
    ctx.font = "900 11px Outfit, sans-serif";
    ctx.textAlign = "center";
    const label = engine.status === "won" ? "ENGINE APERTURE OPEN" : engine.status === "lost" ? "ENGINE RESET" : locked ? `THERMAL LOCK ${engine.lockTime.toFixed(1)}s` : `PRESSURE ENGINE ${Math.round(engine.charge)}%`;
    ctx.fillText(label, 0, 95);
    ctx.restore();
  }

  private drawArchiveRelay(ctx: CanvasRenderingContext2D, time: number): void {
    const archive = this.run.archiveRelay;
    if (archive.status === "inactive") return;
    const { x, y } = this.archiveRelayPosition();
    const active = archive.status === "active";
    const pulse = 1 + Math.sin(time * 3.2) * .035 + this.archiveRelayPulse * .12;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.globalAlpha = archive.status === "lost" ? .55 : 1;
    if (active || archive.status === "won") {
      ctx.strokeStyle = archive.status === "won" ? "rgba(255,255,255,.75)" : "rgba(158,238,255,.38)";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      ctx.lineDashOffset = -time * 34;
      ctx.beginPath(); ctx.arc(0, 0, 66 + Math.sin(time * 2.2) * 5, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.shadowColor = archive.status === "won" ? "#ffffff" : "#9eeeff";
    ctx.shadowBlur = archive.status === "lost" ? 0 : 26;
    ctx.fillStyle = "rgba(14,57,78,.94)";
    ctx.strokeStyle = "#bff8ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let point = 0; point < 6; point += 1) {
      const angle = point * Math.PI / 3 - Math.PI / 2;
      const px = Math.cos(angle) * 38;
      const py = Math.sin(angle) * 38;
      if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#d8fbff";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(0, -61); ctx.lineTo(19, -75); ctx.stroke();
    ctx.fillStyle = "#9eeeff";
    ctx.beginPath(); ctx.arc(22, -77, 6 + Math.sin(time * 7) * 1.5, 0, Math.PI * 2); ctx.fill();
    const cells = archive.fragmentTarget;
    for (let index = 0; index < cells; index += 1) {
      const filled = index < archive.fragments;
      ctx.fillStyle = filled ? "#ffffff" : "rgba(126,188,207,.24)";
      ctx.strokeStyle = filled ? "#ffffff" : "#6595a7";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-25 + index * 18, -9, 13, 26, 4); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = archive.status === "won" ? "#ffffff" : "#d8fbff";
    ctx.font = "900 11px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(archive.status === "won" ? "ARCHIVE ONLINE" : archive.status === "lost" ? "RELAY OFFLINE" : "FROZEN RELAY", 0, 57);
    ctx.font = "900 9px Outfit, sans-serif";
    ctx.fillText(`${archive.fragments}/${archive.fragmentTarget} FILES`, 0, 71);
    ctx.restore();
  }

  private drawCloud(ctx: CanvasRenderingContext2D, cloud: Cloud, time: number): void {
    const definition = CLOUDS[cloud.kind];
    const reducedEffects = this.clouds.length > 58 || this.particles.length > 560;
    const healthRatio = Math.max(0, cloud.health / cloud.maxHealth);
    const damageRatio = Math.max(.42, healthRatio);
    const pulse = cloud.hurtFlash > 0 ? 1 + Math.sin(time * 45) * .055 : 1;
    const suctionRadius = 112 + this.state.levels.radius * 18 + this.run.skills.wideIntake * 34 + this.run.skills.pressureChamber * 18
      + this.run.skills.blackHole * 80 + this.run.skills.eventHorizon * 140
      + (this.run.feverActive ? this.run.skills.cycloneCore * 120 + this.run.skills.goldenVacuum * 80 : 0);
    const toPlayerX = this.player.x - cloud.x;
    const toPlayerY = this.player.y - cloud.y;
    const playerDistance = Math.hypot(toPlayerX, toPlayerY);
    const beingSucked = this.isSuctionActive() && this.isCloudInSuctionArc(cloud, suctionRadius);
    const proximity = beingSucked ? Math.max(0, 1 - playerDistance / (suctionRadius + cloud.radius)) : 0;
    const stretch = beingSucked ? 1 + proximity * .55 + (1 - healthRatio) * .75 : 1;
    const squeeze = beingSucked ? Math.max(.42, 1 - proximity * .24 - (1 - healthRatio) * .34) : 1;
    const angle = Math.atan2(toPlayerY, toPlayerX);
    const spawnProgress = Math.min(1, cloud.age / .5);
    const arrivalScale = .68 + spawnProgress * .32;
    ctx.save();
    ctx.globalAlpha = spawnProgress;
    ctx.translate(cloud.x, cloud.y + Math.sin(time * 1.5 + cloud.phase) * 2);
    if (beingSucked) ctx.rotate(angle);
    ctx.scale(pulse * damageRatio * stretch * arrivalScale, pulse * damageRatio * squeeze * arrivalScale);
    ctx.shadowColor = reducedEffects ? "transparent" : cloud.hurtFlash > 0 ? "rgba(255,255,255,.85)" : "rgba(31,82,118,.2)"; ctx.shadowBlur = reducedEffects ? 0 : cloud.hurtFlash > 0 ? 25 : 14; ctx.shadowOffsetY = reducedEffects ? 0 : 7;
    ctx.fillStyle = definition.shadow; this.cloudPath(ctx, cloud.radius, 4); ctx.fill();
    ctx.shadowColor = "transparent"; ctx.translate(0, -4); ctx.fillStyle = definition.color; this.cloudPath(ctx, cloud.radius, 0); ctx.fill();
    if (!reducedEffects) {
      const shine = ctx.createRadialGradient(-cloud.radius * .3, -cloud.radius * .35, 1, 0, 0, cloud.radius);
      shine.addColorStop(0, "rgba(255,255,255,.8)"); shine.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = shine; this.cloudPath(ctx, cloud.radius, 0); ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.ellipse(-cloud.radius * .24, -cloud.radius * .22, cloud.radius * .22, cloud.radius * .13, -.35, 0, Math.PI * 2); ctx.fill();
    }
    if (cloud.dense) {
      ctx.strokeStyle = "#ffe76b"; ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]); ctx.lineDashOffset = -time * 24;
      ctx.beginPath(); ctx.ellipse(0, 0, cloud.radius * .72, cloud.radius * .58, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#2d7188"; ctx.beginPath();
      for (let point = 0; point < 6; point += 1) {
        const a = point * Math.PI / 3 - Math.PI / 2;
        const px = Math.cos(a) * cloud.radius * .23; const py = Math.sin(a) * cloud.radius * .23;
        if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff36f"; ctx.beginPath(); ctx.arc(0, 0, cloud.radius * .09, 0, Math.PI * 2); ctx.fill();
    }
    if (cloud.formationCore) {
      ctx.shadowColor = reducedEffects ? "transparent" : "#ffad66"; ctx.shadowBlur = reducedEffects ? 0 : 22;
      ctx.strokeStyle = "#ffad66"; ctx.lineWidth = 4;
      ctx.setLineDash([9, 6]); ctx.lineDashOffset = -time * 42;
      ctx.beginPath(); ctx.arc(0, 0, cloud.radius * 1.18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#fff5bd"; ctx.font = `900 ${Math.max(9, cloud.radius * .25)}px Outfit, sans-serif`; ctx.textAlign = "center";
      ctx.fillText("CORE", 0, -cloud.radius * .92);
      ctx.shadowColor = "transparent";
    }
    if (cloud.front) {
      if (this.goldenFront) {
        ctx.shadowColor = "#ffe76b"; ctx.shadowBlur = 24;
        ctx.fillStyle = "rgba(255,224,77,.22)"; this.cloudPath(ctx, cloud.radius * 1.04, 0); ctx.fill();
      }
      ctx.strokeStyle = this.goldenFront ? "#ffe76b" : "#6ff6e2"; ctx.lineWidth = this.goldenFront ? 4 : 2.5;
      ctx.setLineDash([7, 5]); ctx.lineDashOffset = time * 28;
      ctx.beginPath(); ctx.ellipse(0, 0, cloud.radius * 1.06, cloud.radius * .82, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = this.goldenFront ? "#ffef8c" : "#163f55";
      for (let marker = -1; marker <= 1; marker += 1) {
        const mx = marker * 12;
        ctx.beginPath(); ctx.moveTo(mx - 5, -cloud.radius * .9); ctx.lineTo(mx, -cloud.radius * 1.04); ctx.lineTo(mx + 5, -cloud.radius * .9); ctx.closePath(); ctx.fill();
      }
    }
    if (cloud.signalTarget) {
      const signalPulse = 1 + Math.sin(time * 6.5) * .08;
      ctx.shadowColor = reducedEffects ? "transparent" : "#d5b5ff";
      ctx.shadowBlur = reducedEffects ? 0 : 24;
      ctx.strokeStyle = "#d9bcff";
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -time * 58;
      ctx.beginPath();
      ctx.arc(0, 0, cloud.radius * 1.38 * signalPulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#f3e7ff";
      ctx.font = `900 ${Math.max(11, cloud.radius * .3)}px Outfit, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`SIGNAL ${this.run.signalTrace.progress + 1}/${this.run.signalTrace.target}`, 0, -cloud.radius * 1.42);
      ctx.shadowColor = "transparent";
    }
    if (cloud.archiveShard) {
      const archivePulse = 1 + Math.sin(time * 7 + cloud.phase) * .07;
      ctx.shadowColor = reducedEffects ? "transparent" : "#9eeeff";
      ctx.shadowBlur = reducedEffects ? 0 : 26;
      ctx.strokeStyle = "#bff8ff";
      ctx.lineWidth = 4;
      ctx.setLineDash([7, 5]);
      ctx.lineDashOffset = -time * 50;
      ctx.beginPath(); ctx.arc(0, 0, cloud.radius * 1.32 * archivePulse, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${Math.max(10, cloud.radius * .28)}px Outfit, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("MEMORY SHARD", 0, -cloud.radius * 1.38);
      ctx.shadowColor = "transparent";
    }
    if (cloud.solarCore) {
      const corePulse = 1 + Math.sin(time * 8 + cloud.phase) * .08;
      ctx.shadowColor = reducedEffects ? "transparent" : "#ffb329";
      ctx.shadowBlur = reducedEffects ? 0 : 30;
      ctx.strokeStyle = "#fff0a3";
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 6, 3, 6]);
      ctx.lineDashOffset = -time * 72;
      ctx.beginPath(); ctx.arc(0, 0, cloud.radius * 1.38 * corePulse, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#fff8d5";
      ctx.font = `900 ${Math.max(11, cloud.radius * .29)}px Outfit, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("PHOTON CORE", 0, -cloud.radius * 1.46);
      ctx.shadowColor = "transparent";
    }
    if (cloud.auroraNode) {
      const nodePulse = 1 + Math.sin(time * 8.8 + cloud.phase) * .09;
      const hue = 185 + (cloud.id * 47) % 120;
      ctx.shadowColor = reducedEffects ? "transparent" : `hsl(${hue} 95% 76%)`;
      ctx.shadowBlur = reducedEffects ? 0 : 32;
      ctx.strokeStyle = `hsl(${hue} 95% 84%)`;
      ctx.lineWidth = 5;
      ctx.setLineDash([9, 5, 2, 5]);
      ctx.lineDashOffset = -time * 76;
      ctx.beginPath(); ctx.arc(0, 0, cloud.radius * 1.42 * nodePulse, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 ${Math.max(11, cloud.radius * .29)}px Outfit, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`SKY NODE ${this.run.openSky.chain + 1}/${this.run.openSky.chainTarget}`, 0, -cloud.radius * 1.5);
      ctx.shadowColor = "transparent";
    }
    if (cloud.kind === "rain") { ctx.fillStyle = "#3d8cca"; for (let i = -1; i <= 1; i += 1) { ctx.beginPath(); ctx.ellipse(i * 13, cloud.radius * .65, 3, 7, .4, 0, Math.PI * 2); ctx.fill(); } }
    if (cloud.kind === "electric") { ctx.strokeStyle = "#ffe45e"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(2, cloud.radius * .2); ctx.lineTo(-8, cloud.radius * .56); ctx.lineTo(3, cloud.radius * .5); ctx.lineTo(-2, cloud.radius * .9); ctx.lineTo(14, cloud.radius * .4); ctx.stroke(); }
    if (cloud.kind === "ice") {
      ctx.strokeStyle = "#eaffff"; ctx.lineWidth = 3; ctx.shadowColor = reducedEffects ? "transparent" : "#72e7ff"; ctx.shadowBlur = reducedEffects ? 0 : 12;
      for (let arm = 0; arm < 3; arm += 1) {
        const angle = arm * Math.PI / 3;
        ctx.beginPath(); ctx.moveTo(-Math.cos(angle) * 17, -Math.sin(angle) * 17); ctx.lineTo(Math.cos(angle) * 17, Math.sin(angle) * 17); ctx.stroke();
      }
      ctx.shadowColor = "transparent";
    }
    if (cloud.kind === "solar") {
      ctx.strokeStyle = "#fff5a0"; ctx.lineWidth = 3; ctx.shadowColor = reducedEffects ? "transparent" : "#ffb84d"; ctx.shadowBlur = reducedEffects ? 0 : 16;
      ctx.beginPath(); ctx.arc(0, 0, cloud.radius * .42, 0, Math.PI * 2); ctx.stroke();
      for (let ray = 0; ray < 8; ray += 1) {
        const angle = ray * Math.PI / 4 + time * .4;
        ctx.beginPath(); ctx.moveTo(Math.cos(angle) * cloud.radius * .52, Math.sin(angle) * cloud.radius * .52); ctx.lineTo(Math.cos(angle) * cloud.radius * .72, Math.sin(angle) * cloud.radius * .72); ctx.stroke();
      }
      ctx.shadowColor = "transparent";
    }
    if (cloud.kind === "aurora") {
      ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.shadowColor = reducedEffects ? "transparent" : "#b48cff"; ctx.shadowBlur = reducedEffects ? 0 : 15;
      ["#8fffd2", "#c69cff", "#7bdcff"].forEach((color, ribbon) => {
        const offset = (ribbon - 1) * 9;
        ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(-cloud.radius * .55, offset);
        ctx.quadraticCurveTo(0, offset - 13 + Math.sin(time * 3 + ribbon) * 5, cloud.radius * .55, offset); ctx.stroke();
      });
      ctx.shadowColor = "transparent";
    }
    if (beingSucked) {
      ctx.globalAlpha = .45 + proximity * .4;
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2 / Math.max(.5, damageRatio);
      ctx.beginPath(); ctx.arc(-cloud.radius * .15, 0, cloud.radius * (.55 + Math.sin(time * 20) * .05), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
    if (cloud.age < .55) {
      const arrival = cloud.age / .55;
      ctx.globalAlpha = 1 - arrival;
      ctx.strokeStyle = cloud.dense ? "#ffe76b" : "#bff8ff";
      ctx.lineWidth = 4 * (1 - arrival) + 1;
      ctx.beginPath(); ctx.arc(cloud.x, cloud.y, cloud.radius * (.55 + arrival * 1.1), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (cloud.health < cloud.maxHealth) {
      const width = cloud.radius * 1.35;
      ctx.fillStyle = "rgba(25,54,74,.32)"; ctx.fillRect(cloud.x - width / 2, cloud.y + cloud.radius + 12, width, 5);
      ctx.fillStyle = definition.color; ctx.fillRect(cloud.x - width / 2, cloud.y + cloud.radius + 12, width * Math.max(0, cloud.health / cloud.maxHealth), 5);
    }
  }

  private cloudPath(ctx: CanvasRenderingContext2D, radius: number, offsetY: number): void {
    ctx.beginPath();
    ctx.arc(-radius * .48, offsetY, radius * .48, Math.PI * .72, Math.PI * 1.8);
    ctx.arc(-radius * .08, -radius * .28 + offsetY, radius * .58, Math.PI, Math.PI * 1.84);
    ctx.arc(radius * .44, -radius * .02 + offsetY, radius * .47, Math.PI * 1.15, Math.PI * 2.08);
    ctx.arc(radius * .05, radius * .24 + offsetY, radius * .72, 0, Math.PI);
    ctx.closePath();
  }

  private drawFormationLinks(ctx: CanvasRenderingContext2D, time: number): void {
    const cores = this.clouds.filter((cloud) => cloud.formationCore && cloud.formationId !== undefined);
    for (const core of cores) {
      const members = this.clouds.filter((cloud) => cloud.formationId === core.formationId && cloud.id !== core.id);
      ctx.save();
      ctx.strokeStyle = "rgba(143,255,233,.24)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 9]);
      ctx.lineDashOffset = -time * 24;
      for (const member of members) {
        ctx.beginPath(); ctx.moveTo(core.x, core.y); ctx.lineTo(member.x, member.y); ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawCascadeLinks(ctx: CanvasRenderingContext2D, time: number): void {
    if (!this.run.skills.cascadeGrid || this.cascadeQueue.length < 2) return;
    const cloudById = new Map(this.clouds.map((cloud) => [cloud.id, cloud]));
    const queued = this.cascadeQueue
      .map((item) => cloudById.get(item.cloudId))
      .filter((cloud): cloud is Cloud => Boolean(cloud));
    if (queued.length < 2) return;
    ctx.save();
    ctx.strokeStyle = "rgba(255,173,102,.88)";
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 7]);
    ctx.lineDashOffset = -time * 80;
    ctx.shadowColor = "#ffad66";
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(queued[0].x, queued[0].y);
    for (let index = 1; index < queued.length; index += 1) ctx.lineTo(queued[index].x, queued[index].y);
    ctx.stroke();
    ctx.restore();
  }

  private drawHarvestLinks(ctx: CanvasRenderingContext2D, time: number): void {
    if (this.harvestLinks.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const link of this.harvestLinks) {
      const alpha = Math.max(0, link.life / link.maxLife);
      const dx = link.targetX - link.x;
      const dy = link.targetY - link.y;
      const segments = 6;
      ctx.strokeStyle = link.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2.5 + alpha * 2;
      ctx.shadowColor = link.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(link.x, link.y);
      for (let index = 1; index < segments; index += 1) {
        const progress = index / segments;
        const jitter = Math.sin(time * 90 + index * 4.7 + link.x) * 9 * alpha;
        const length = Math.hypot(dx, dy) || 1;
        ctx.lineTo(link.x + dx * progress - dy / length * jitter, link.y + dy * progress + dx / length * jitter);
      }
      ctx.lineTo(link.targetX, link.targetY);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawStormDroneBeams(ctx: CanvasRenderingContext2D, time: number): void {
    if (this.droneBeams.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const beam of this.droneBeams) {
      const pulse = .72 + Math.sin(time * 34 + beam.x) * .2;
      ctx.strokeStyle = `rgba(141,255,209,${pulse})`;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = "#8dffd1";
      ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(beam.x, beam.y); ctx.lineTo(beam.targetX, beam.targetY); ctx.stroke();
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(beam.targetX, beam.targetY, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  private drawSuctionField(ctx: CanvasRenderingContext2D, time: number): void {
    const cycloneActive = this.run.feverActive && this.run.skills.cycloneCore > 0;
    const radius = 112 + this.state.levels.radius * 18 + this.run.skills.wideIntake * 34 + this.run.skills.pressureChamber * 18
      + this.run.skills.blackHole * 80 + this.run.skills.eventHorizon * 140 + (cycloneActive ? 120 : 0)
      + (this.run.feverActive ? this.run.skills.goldenVacuum * 80 : 0);
    const gradient = ctx.createRadialGradient(this.player.x, this.player.y, 20, this.player.x, this.player.y, radius);
    gradient.addColorStop(0, this.run.feverActive ? "rgba(255,224,70,.34)" : "rgba(23,111,153,.3)");
    gradient.addColorStop(.62, this.run.feverActive ? "rgba(255,168,64,.14)" : "rgba(31,145,176,.15)");
    gradient.addColorStop(1, this.run.feverActive ? "rgba(255,185,55,0)" : "rgba(18,91,133,0)");
    const aimAngle = this.getAimAngle();
    const halfAngle = this.getSuctionHalfAngle();
    const fullCircle = halfAngle >= Math.PI;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    if (fullCircle) ctx.arc(this.player.x, this.player.y, radius, 0, Math.PI * 2);
    else {
      ctx.moveTo(this.player.x, this.player.y);
      ctx.arc(this.player.x, this.player.y, radius, aimAngle - halfAngle, aimAngle + halfAngle);
      ctx.closePath();
    }
    ctx.fill();
    ctx.strokeStyle = this.overload > 0 ? "rgba(255,111,74,.92)" : this.run.feverActive ? "rgba(255,190,52,.95)" : "rgba(16,91,137,.9)";
    ctx.lineWidth = this.run.feverActive ? 6 : 4; ctx.setLineDash([12, 9]); ctx.lineDashOffset = -time * (this.run.feverActive ? 90 : 48);
    const pulseRadius = radius * (.88 + Math.sin(time * 6) * .03);
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, pulseRadius, fullCircle ? 0 : aimAngle - halfAngle, fullCircle ? Math.PI * 2 : aimAngle + halfAngle);
    if (!fullCircle) {
      ctx.moveTo(this.player.x, this.player.y);
      ctx.lineTo(this.player.x + Math.cos(aimAngle - halfAngle) * pulseRadius, this.player.y + Math.sin(aimAngle - halfAngle) * pulseRadius);
      ctx.moveTo(this.player.x, this.player.y);
      ctx.lineTo(this.player.x + Math.cos(aimAngle + halfAngle) * pulseRadius, this.player.y + Math.sin(aimAngle + halfAngle) * pulseRadius);
    }
    ctx.stroke(); ctx.setLineDash([]);
    if (cycloneActive) {
      ctx.save(); ctx.translate(this.player.x, this.player.y); ctx.rotate(time * 2.4);
      ctx.strokeStyle = "rgba(115,232,255,.76)"; ctx.lineWidth = 3; ctx.shadowColor = "#73e8ff"; ctx.shadowBlur = 10;
      for (let arm = 0; arm < 3; arm += 1) {
        ctx.beginPath();
        for (let step = 0; step <= 36; step += 1) {
          const progress = step / 36;
          const spiralRadius = 20 + progress * radius * .84;
          const angle = arm * Math.PI * 2 / 3 + progress * Math.PI * 2.6;
          const x = Math.cos(angle) * spiralRadius;
          const y = Math.sin(angle) * spiralRadius;
          if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawAimReticle(ctx: CanvasRenderingContext2D, time: number): void {
    const pulse = 1 + Math.sin(time * 7) * .08;
    ctx.save();
    ctx.translate(this.pointer.x, this.pointer.y);
    ctx.strokeStyle = this.isSuctionActive() ? "rgba(255,239,105,.95)" : "rgba(255,255,255,.82)";
    ctx.fillStyle = "rgba(22,66,87,.35)";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 13 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (let tick = 0; tick < 4; tick += 1) {
      const angle = tick * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 18, Math.sin(angle) * 18);
      ctx.lineTo(Math.cos(angle) * 25, Math.sin(angle) * 25);
      ctx.stroke();
    }
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, time: number): void {
    const powerLevel = this.state.levels.power;
    const radiusLevel = this.state.levels.radius;
    const valueLevel = this.state.levels.value;
    const insulationLevel = this.state.levels.insulation;
    const totalParts = powerLevel + radiusLevel + valueLevel + this.state.levels.drone + insulationLevel;
    const shipScale = 1 + Math.min(.25, totalParts * .018);
    ctx.save();
    ctx.translate(this.player.x, this.player.y + Math.sin(time * 4) * (this.atFactory ? .6 : 3));
    if (!this.atFactory && !this.returning && !this.launching && this.pointer.visible && !this.touchDirect) ctx.rotate(this.getAimAngle());
    ctx.scale(shipScale, shipScale);
    if (this.run.feverActive) { ctx.shadowColor = "#fff36f"; ctx.shadowBlur = 34; }

    if (insulationLevel > 0) {
      ctx.strokeStyle = `rgba(134,232,255,${.36 + insulationLevel * .2})`; ctx.lineWidth = 3 + insulationLevel;
      ctx.setLineDash([9, 7]); ctx.lineDashOffset = -time * 38;
      ctx.beginPath(); ctx.ellipse(0, 0, 66, 44, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }

    const cinematicBoost = (this.returning && !this.atFactory) || this.launching;
    if (this.isSuctionActive() || Math.hypot(this.playerVelocity.x, this.playerVelocity.y) > 30 || cinematicBoost) {
      const exhaustColor = this.run.feverActive || cinematicBoost ? "#fff36f" : "#8ff5ff";
      ctx.fillStyle = exhaustColor;
      const feverBoost = this.run.feverActive && !cinematicBoost;
      const exhaustCount = cinematicBoost ? 8 : feverBoost ? 7 + Math.min(3, powerLevel) : 3 + Math.min(3, powerLevel);
      for (let i = 0; i < exhaustCount; i += 1) {
        const trailSpeed = cinematicBoost ? 330 : feverBoost ? 285 : 170;
        const trailLength = cinematicBoost ? 88 : feverBoost ? 68 : 34;
        const trail = 16 + ((time * trailSpeed + i * 19) % trailLength);
        ctx.globalAlpha = .8 - i * .08;
        ctx.beginPath(); ctx.ellipse(-54 - trail, (i - exhaustCount / 2) * 4, (cinematicBoost ? 20 : feverBoost ? 17 : 12) + powerLevel * 1.5, cinematicBoost ? 4 : feverBoost ? 3.5 : 3, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#244f67"; ctx.beginPath(); ctx.roundRect(-55, -17, 24, 34, 9); ctx.fill();
    ctx.strokeStyle = "#80d9e4"; ctx.lineWidth = 3;
    for (let ring = 0; ring < 2 + Math.min(3, powerLevel); ring += 1) {
      const angle = time * (5 + powerLevel) + ring * Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(-43 + Math.cos(angle) * 13, Math.sin(angle) * 13); ctx.lineTo(-43 - Math.cos(angle) * 13, -Math.sin(angle) * 13); ctx.stroke();
    }
    ctx.fillStyle = "#ff735b"; ctx.beginPath(); ctx.arc(-43, 0, 6, 0, Math.PI * 2); ctx.fill();

    const bodyGradient = ctx.createLinearGradient(-38, -20, 42, 22);
    bodyGradient.addColorStop(0, this.overload > 0 ? "#ee8b61" : "#ffd969"); bodyGradient.addColorStop(1, this.run.feverActive ? "#fff07a" : "#f3ad35");
    ctx.fillStyle = bodyGradient; ctx.beginPath(); ctx.ellipse(0, 0, 43, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(111,76,34,.28)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#e56b55"; ctx.beginPath(); ctx.moveTo(-30, -18); ctx.lineTo(-46, -30); ctx.lineTo(-9, -23); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#d7534b"; ctx.beginPath(); ctx.moveTo(-28, 19); ctx.lineTo(-43, 31); ctx.lineTo(-7, 24); ctx.closePath(); ctx.fill();

    ctx.fillStyle = "#f4ffff"; ctx.beginPath(); ctx.arc(-4, -7, 21, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#2f7898"; ctx.beginPath(); ctx.ellipse(-4, 0, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(183,245,255,.75)"; ctx.beginPath(); ctx.arc(-8, -4, 4, 0, Math.PI * 2); ctx.fill();

    if (valueLevel > 0) {
      const tankWidth = 21 + Math.min(10, valueLevel * 2);
      ctx.fillStyle = "#dff9ff"; ctx.beginPath(); ctx.roundRect(6, -39, tankWidth, 19, 7); ctx.fill();
      ctx.fillStyle = "#4bc2d6"; ctx.beginPath(); ctx.roundRect(9, -32, tankWidth - 6, 9, 4); ctx.fill();
      ctx.strokeStyle = "#396b7e"; ctx.lineWidth = 2; ctx.strokeRect(13, -20, 4, 5);
    }

    const nozzleLength = 16 + Math.min(18, radiusLevel * 3);
    ctx.fillStyle = "#e9fbfb"; ctx.beginPath(); ctx.roundRect(34, -9, nozzleLength, 18, 6); ctx.fill();
    ctx.fillStyle = "#39748c"; ctx.fillRect(40, -8, 5, 16);
    ctx.strokeStyle = this.run.feverActive ? "#fff36f" : "#8de6ed"; ctx.lineWidth = 3 + Math.min(4, radiusLevel);
    ctx.beginPath(); ctx.ellipse(35 + nozzleLength, 0, 5 + radiusLevel, 13 + radiusLevel * 1.2, 0, 0, Math.PI * 2); ctx.stroke();

    ctx.restore();
  }

  private drawRivalHarvester(ctx: CanvasRenderingContext2D, time: number): void {
    const race = this.run.rivalRace;
    if (race.status === "inactive") return;
    const rival = this.rivalHarvester;

    if (rival.beamTarget) {
      const muzzleX = rival.x + Math.cos(rival.angle) * 43;
      const muzzleY = rival.y + Math.sin(rival.angle) * 43;
      const beamGradient = ctx.createLinearGradient(muzzleX, muzzleY, rival.beamTarget.x, rival.beamTarget.y);
      beamGradient.addColorStop(0, "rgba(255,101,120,.95)");
      beamGradient.addColorStop(1, "rgba(255,224,143,.75)");
      ctx.save();
      ctx.strokeStyle = beamGradient;
      ctx.lineWidth = 4 + Math.sin(time * 20) * 1.2;
      ctx.setLineDash([12, 7]);
      ctx.lineDashOffset = -time * 72;
      ctx.shadowColor = "#ff6578";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(muzzleX, muzzleY);
      ctx.lineTo(rival.beamTarget.x, rival.beamTarget.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#fff1a8";
      ctx.beginPath();
      ctx.arc(rival.beamTarget.x, rival.beamTarget.y, 5 + Math.sin(time * 17) * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(rival.x, rival.y + Math.sin(time * 5.2 + 1.4) * 2.5);
    ctx.rotate(rival.angle);
    const defeated = race.status === "won";
    ctx.globalAlpha = defeated ? .82 : 1;
    ctx.shadowColor = defeated ? "#9eb8c2" : "#ff6578";
    ctx.shadowBlur = defeated ? 10 : 20 + Math.sin(time * 6) * 5;

    if (!defeated && (Math.hypot(rival.vx, rival.vy) > 22 || rival.beamTarget)) {
      ctx.fillStyle = "#ff6578";
      for (let index = 0; index < 4; index += 1) {
        const trail = 12 + ((time * 190 + index * 17) % 45);
        ctx.globalAlpha = .72 - index * .12;
        ctx.beginPath();
        ctx.ellipse(-49 - trail, (index - 1.5) * 4, 14, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#142331";
    ctx.beginPath();
    ctx.roundRect(-48, -18, 25, 36, 8);
    ctx.fill();
    ctx.strokeStyle = "#ff6578";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-36, 0, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ff6578";
    ctx.beginPath();
    ctx.arc(-36, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    const rivalBody = ctx.createLinearGradient(-30, -20, 44, 22);
    rivalBody.addColorStop(0, defeated ? "#65727e" : "#293542");
    rivalBody.addColorStop(1, defeated ? "#36434f" : "#101820");
    ctx.fillStyle = rivalBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, 43, 27, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = defeated ? "#82929e" : "#ff6578";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = defeated ? "#63717c" : "#c73f59";
    ctx.beginPath();
    ctx.moveTo(-26, -18);
    ctx.lineTo(-43, -33);
    ctx.lineTo(2, -23);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-26, 18);
    ctx.lineTo(-43, 33);
    ctx.lineTo(2, 23);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#e9f5f6";
    ctx.beginPath();
    ctx.arc(-2, -6, 19, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = defeated ? "#627581" : "#8e3150";
    ctx.beginPath();
    ctx.ellipse(-2, 0, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.beginPath();
    ctx.arc(-6, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = defeated ? "#98a7ae" : "#ff6578";
    ctx.beginPath();
    ctx.roundRect(33, -10, 20, 20, 6);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "900 10px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("QS", 43, 0);
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.font = "900 11px Outfit, sans-serif";
    ctx.fillStyle = race.status === "lost" ? "#fff36f" : "#ff6578";
    ctx.strokeStyle = "rgba(7,22,31,.82)";
    ctx.lineWidth = 5;
    const label = race.status === "lost" ? "RIVAL WIN" : race.status === "won" ? "RETREATING" : "쾌청산업";
    ctx.strokeText(label, rival.x, rival.y - 40);
    ctx.fillText(label, rival.x, rival.y - 40);
    ctx.restore();
  }

  private drawPlayerFuelBar(ctx: CanvasRenderingContext2D, time: number, zoom: number): void {
    if (this.atFactory || this.returning || this.launching) return;
    const ratio = Math.max(0, Math.min(1, this.run.fuel / Math.max(1, this.getFuelCapacity())));
    const critical = ratio <= .15;
    const low = ratio <= .35;
    const barWidth = this.getFuelRecoveryLimit() > 0 ? 172 : Math.min(124, Math.max(96, this.width * .1));
    const barHeight = 11;
    const playerX = this.player.x * zoom;
    const bob = Math.sin(time * 4) * 3 * zoom;
    const playerY = this.player.y * zoom + bob;
    const barX = playerX - barWidth * .5;
    const barY = playerY + Math.max(29, 39 * zoom);
    const color = this.fuelPickupFlash > 0 ? "#fff36f" : critical ? "#ff6258" : low ? "#ffd15e" : "#63e3bd";
    const pulse = this.fuelPickupFlash > 0 ? .88 + Math.sin(time * 18) * .12 : low ? .72 + (Math.sin(time * (critical ? 15 : 9)) + 1) * .14 : 1;

    ctx.save();
    ctx.globalAlpha = pulse;
    if (low) { ctx.shadowColor = color; ctx.shadowBlur = critical ? 22 : 14; }
    ctx.fillStyle = "rgba(9,35,48,.9)";
    ctx.beginPath(); ctx.roundRect(barX - 6, barY - 19, barWidth + 12, 38, 12); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = low ? color : "#dffaff";
    ctx.font = "900 11px Outfit, sans-serif";
    const recovery = this.getFuelRecoveryLimit() > 0 ? `  CELL ${this.run.fuelRecovered.toFixed(0)}/${this.getFuelRecoveryLimit()}` : "";
    ctx.fillText(`${critical ? "! " : ""}FUEL  ${Math.ceil(this.run.fuel)} / ${Math.round(this.getFuelCapacity())}${recovery}`, playerX, barY - 10);
    ctx.fillStyle = "rgba(198,225,229,.26)";
    ctx.beginPath(); ctx.roundRect(barX, barY, barWidth, barHeight, 6); ctx.fill();
    if (ratio > 0) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(barX, barY, Math.max(4, barWidth * ratio), barHeight, 6); ctx.fill();
    }
    ctx.strokeStyle = low ? color : "rgba(228,255,252,.72)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(barX, barY, barWidth, barHeight, 6); ctx.stroke();
    ctx.restore();
  }

  private drawImpactOverlay(ctx: CanvasRenderingContext2D, time: number): void {
    if (this.impactFlash > 0) {
      const zoom = this.getWorldZoom();
      const playerScreenX = this.player.x * zoom;
      const playerScreenY = this.player.y * zoom;
      const flash = ctx.createRadialGradient(playerScreenX, playerScreenY, 20, playerScreenX, playerScreenY, Math.max(this.width, this.height) * .65);
      flash.addColorStop(0, `rgba(255,249,174,${this.impactFlash * .34})`);
      flash.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = flash; ctx.fillRect(0, 0, this.width, this.height);
    }
    if (this.discoveryBanner) {
      const definition = CLOUDS[this.discoveryBanner.kind];
      const progress = this.discoveryBanner.life / this.discoveryBanner.maxLife;
      const alpha = Math.min(1, (1 - progress) * 6, progress * 2.8);
      const scale = .94 + (1 - progress) * .06;
      ctx.save(); ctx.translate(this.width * .5, this.height * .58); ctx.scale(scale, scale); ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(7,31,44,.9)"; ctx.beginPath(); ctx.roundRect(-235, -52, 470, 104, 22); ctx.fill();
      ctx.strokeStyle = definition.color; ctx.lineWidth = 4; ctx.shadowColor = definition.color; ctx.shadowBlur = 20; ctx.stroke();
      ctx.shadowBlur = 0; ctx.textAlign = "center"; ctx.fillStyle = definition.color; ctx.font = "900 13px Outfit, sans-serif";
      ctx.fillText("NEW WEATHER SIGNATURE", 0, -23);
      ctx.fillStyle = "#ffffff"; ctx.font = "900 31px Nunito, sans-serif"; ctx.fillText(`${definition.icon} ${definition.name}`, 0, 16);
      ctx.fillStyle = "#cce7ed"; ctx.font = "800 12px Outfit, sans-serif"; ctx.fillText("새로운 수집 반응이 활성화되었습니다", 0, 38);
      ctx.restore();
    }
    if (this.combo >= 3 && this.comboTimer > 0) {
      const fade = Math.min(1, this.comboTimer * 1.6);
      const punch = 1 + this.comboPunch * .42;
      ctx.save(); ctx.translate(this.width * .5, this.height * .28); ctx.scale(punch, punch);
      ctx.globalAlpha = fade;
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(25,52,71,.58)"; ctx.lineWidth = 9;
      ctx.font = `900 ${38 + Math.min(32, this.combo * 1.4)}px Outfit, sans-serif`;
      ctx.strokeText(`${this.combo} COMBO`, 0, 0);
      ctx.fillStyle = this.run.feverActive ? "#fff36f" : "#ffffff"; ctx.fillText(`${this.combo} COMBO`, 0, 0);
      ctx.font = "900 13px Outfit, sans-serif"; ctx.letterSpacing = "4px";
      ctx.fillStyle = "#ffdc66"; ctx.fillText(this.run.feverActive ? "FEVER HARVEST" : "PRESSURE CHAIN", 0, 24);
      ctx.restore();
    }
    if (this.cascadeCount >= 2 && this.cascadeTimer > 0) {
      const alpha = Math.min(1, this.cascadeTimer * 3);
      const scale = 1 + this.cascadePunch * .24;
      ctx.save(); ctx.translate(this.width * .5, this.height * .39); ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.font = `900 ${30 + Math.min(34, this.cascadeCount * 1.5)}px Outfit, sans-serif`;
      ctx.strokeStyle = "rgba(22,55,71,.72)"; ctx.lineWidth = 8;
      ctx.strokeText(`CASCADE ×${this.cascadeCount}`, 0, 0);
      ctx.fillStyle = this.cascadeCount >= 10 ? "#fff36f" : "#8fffe9";
      ctx.fillText(`CASCADE ×${this.cascadeCount}`, 0, 0);
      ctx.font = "900 12px Outfit, sans-serif";
      ctx.letterSpacing = "3px";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(this.run.skills.blackHole ? "BLACK HOLE COLLAPSE" : "PRESSURE POP CHAIN", 0, 24);
      ctx.restore();
    }
    const frontRemaining = this.clouds.filter((cloud) => cloud.front).length;
    if (frontRemaining > 0) {
      const badgeWidth = this.goldenFront ? 360 : 280;
      ctx.fillStyle = "rgba(18,57,75,.82)";
      ctx.beginPath(); ctx.roundRect(this.width / 2 - badgeWidth / 2, this.height - 140, badgeWidth, 55, 16); ctx.fill();
      ctx.strokeStyle = this.goldenFront ? "rgba(255,231,107,.95)" : "rgba(111,246,226,.8)"; ctx.lineWidth = this.goldenFront ? 3 : 2; ctx.stroke();
      ctx.textAlign = "center"; ctx.fillStyle = this.goldenFront ? "#fff36f" : "#9effea"; ctx.font = "900 13px Outfit, sans-serif";
      ctx.fillText(this.goldenFront ? "GOLDEN HARVEST TARGETS · 3× FRONT BONUS" : "CLOUD FRONT TARGETS", this.width / 2, this.height - 117);
      ctx.fillStyle = "#ffffff"; ctx.font = "900 19px Outfit, sans-serif";
      ctx.fillText(`${frontRemaining} REMAINING`, this.width / 2, this.height - 96);
    }
    if (this.frontBanner > 0) {
      const entering = frontRemaining > 0;
      const alpha = Math.min(1, this.frontBanner * 1.5);
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.translate(this.width * (this.goldenFront ? .39 : .5), this.height * (this.goldenFront ? .42 : .34));
      ctx.fillStyle = "rgba(16,48,66,.76)"; ctx.beginPath(); ctx.roundRect(-260, -49, 520, 98, 20); ctx.fill();
      ctx.strokeStyle = this.goldenFront ? "#fff36f" : entering ? "#70f4df" : "#fff36f"; ctx.lineWidth = 3; ctx.stroke();
      ctx.textAlign = "center"; ctx.fillStyle = this.goldenFront ? "#fff36f" : entering ? "#8fffe9" : "#fff36f";
      ctx.font = "900 13px Outfit, sans-serif"; ctx.fillText(this.goldenFront ? (entering ? "FINAL SORTIE JACKPOT" : "JACKPOT SECURED") : entering ? "WEATHER ALERT" : "SECTOR SECURED", 0, -18);
      ctx.fillStyle = "#ffffff"; ctx.font = "900 36px Outfit, sans-serif";
      ctx.fillText(this.goldenFront ? (entering ? "GOLDEN HARVEST FRONT" : "GOLDEN FRONT CLEARED") : entering ? "CLOUD FRONT" : "FRONT CLEARED", 0, 20);
      ctx.restore();
    }
    if (this.rankReveal > 0) {
      const progress = this.rankReveal / 3.2;
      const alpha = Math.min(1, (1 - progress) * 5, progress * 1.3);
      ctx.fillStyle = `rgba(15,45,65,${alpha * .42})`; ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = alpha; ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(16,53,72,.6)"; ctx.lineWidth = 10;
      ctx.font = "900 52px Nunito, sans-serif";
      ctx.strokeText(RANKS[this.run.mapRank].name, this.width / 2, this.height / 2 - 4);
      ctx.fillStyle = "#ffffff"; ctx.fillText(RANKS[this.run.mapRank].name, this.width / 2, this.height / 2 - 4);
      ctx.font = "900 17px Outfit, sans-serif"; ctx.fillStyle = "#fff178";
      ctx.fillText(`ALTITUDE ${RANKS[this.run.mapRank].altitude}`, this.width / 2, this.height / 2 + 31);
      ctx.globalAlpha = 1;
    }
    void time;
  }

  private drawDrones(ctx: CanvasRenderingContext2D): void {
    for (const drone of this.harvestDrones) {
      const angle = Math.atan2(drone.vy, drone.vx || 1);
      ctx.save(); ctx.translate(drone.x, drone.y); ctx.rotate(angle);
      ctx.shadowColor = "#62f2d8"; ctx.shadowBlur = 13;
      ctx.fillStyle = "#efffff"; ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(-9, -10); ctx.lineTo(-14, 0); ctx.lineTo(-9, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#2c7188"; ctx.beginPath(); ctx.ellipse(-2, 0, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#70ffe0"; ctx.beginPath(); ctx.arc(4, 0, 3.5, 0, Math.PI * 2); ctx.fill();
      if (Math.hypot(drone.vx, drone.vy) > 45) {
        ctx.strokeStyle = "rgba(112,255,224,.72)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(-25, -4); ctx.moveTo(-14, 4); ctx.lineTo(-25, 4); ctx.stroke();
      }
      ctx.restore();
    }
  }

  private burst(x: number, y: number, color: string, count: number, maxSpeed: number, shape: Particle["shape"] = "spark", gravity = 0): void {
    const available = Math.max(0, MAX_PARTICLES - this.particles.length);
    const renderCount = Math.min(Math.round(count), available);
    for (let i = 0; i < renderCount; i += 1) {
      const angle = Math.random() * Math.PI * 2; const speed = 35 + Math.random() * maxSpeed;
      const life = .4 + Math.random() * .55;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, size: 2 + Math.random() * 5, color, shape, gravity });
    }
  }

  private getCargoCount(): number {
    return (Object.values(this.run.cargo) as number[]).reduce((total, amount) => total + amount, 0);
  }

  private getFuelCapacity(): number {
    // 첫 튜토리얼 비행은 의도한 5~6개 수확 리듬을 유지하고,
    // 해금 이후 저고도 순풍 회랑을 다시 찾을 때만 항로 연료 보너스를 적용한다.
    const routeFuelBonus = this.state.rank > 0 ? FLIGHT_ROUTES[this.run.routeId].fuelBonus : 0;
    return 9 + routeFuelBonus + this.run.skills.auxTank * 3 + this.run.skills.recoveryReservoir * 3 + this.state.infiniteResearch.fuel * .75;
  }

  private getMaxClouds(): number {
    return 22 + this.run.mapRank * 7 + (this.run.flight - 1) * 6 + this.state.levels.radius * 3 + this.run.skills.wideIntake * 4
      + this.run.skills.massInduction * 6 + this.run.skills.blackHole * 8 + this.run.skills.eventHorizon * 12
      + (this.run.feverActive ? this.run.skills.cycloneCore * 6 + this.run.skills.cargoCyclone * 14 : 0);
  }

  private getMinimumClouds(): number {
    const maxClouds = this.getMaxClouds();
    const ratio = this.run.feverActive ? .78 : .55;
    const feverReserve = this.run.feverActive ? 3 + this.run.skills.stormCatalyst * 2 + this.run.skills.cargoCyclone * 8 : 0;
    return Math.min(maxClouds, Math.max(12, Math.ceil(maxClouds * ratio) + feverReserve));
  }

  private replenishCloudFloor(): void {
    const minimumClouds = this.getMinimumClouds();
    while (this.clouds.length < minimumClouds) this.spawnCloud(false);
  }

  private getCloudSpawnInterval(): number {
    const flightPressure = this.run.flight - 1;
    const permanentInduction = Math.max(.58, 1 - this.state.levels.radius * .05);
    const cycloneInduction = this.run.feverActive ? this.run.skills.cycloneCore * .45 : 0;
    const runInduction = Math.max(.28, 1 - this.run.skills.wideIntake * .08 - this.run.skills.massInduction * .06
      - this.run.skills.blackHole * .15 - this.run.skills.eventHorizon * .12 - cycloneInduction);
    return Math.max(.11, (0.78 - this.run.mapRank * .08) * FLIGHT_ROUTES[this.run.routeId].spawnInterval * (1 - flightPressure * .14) * permanentInduction * runInduction);
  }

  private emitAll(): void { this.onStateChange(this.getState()); this.onRunChange(this.getRunState()); }

  private growthMissionProgress(id: GrowthMissionId): number {
    switch (id) {
      case "collect": return this.state.harvested;
      case "return": return this.state.growthMission.safeReturns;
      case "contract": return this.state.growthMission.contractsSigned;
      case "ship": return this.state.growthMission.shipmentsClaimed;
      case "skill": return (Object.values(this.run.skills) as number[]).filter((level) => level > 0).length;
      case "upgrade": return (Object.values(this.state.levels) as number[]).reduce((total, level) => total + level, 0);
      case "promote": return this.state.rank;
      case "rain": return this.state.growthMission.rainHarvested;
    }
  }

  private advanceGrowthMissions(notify = true): boolean {
    const completed: string[] = [];
    while (this.state.growthMission.step < GROWTH_MISSIONS.length) {
      const mission = GROWTH_MISSIONS[this.state.growthMission.step];
      if (this.growthMissionProgress(mission.id) < mission.target) break;
      if (mission.reward.money) {
        this.state.money += mission.reward.money;
        this.state.totalEarned += mission.reward.money;
      }
      (Object.entries(mission.reward.materials ?? {}) as [CloudKind, number][]).forEach(([kind, amount]) => {
        this.state.materials[kind] += amount;
      });
      this.state.growthMission.step += 1;
      completed.push(mission.title);
    }
    if (completed.length === 0) return false;
    if (!notify) return true;
    const message = completed.length > 1
      ? `성장 미션 ${completed.length}개 연속 완료 · 보상 자동 지급!`
      : `JOB COMPLETE · ${completed[0]} · 보상 자동 지급!`;
    window.setTimeout(() => this.onToast(message, "success"), 100);
    [660, 880, 1040].forEach((frequency, index) => window.setTimeout(() => this.playTone(frequency, .07), 90 + index * 55));
    return true;
  }

  private syncCareerProgress(): void {
    this.state.career = {
      day: this.run.day,
      level: this.run.level,
      xp: this.run.xp,
      xpNext: this.run.xpNext,
      pendingPicks: 0,
      skills: structuredClone(this.run.skills),
    };
  }

  private restoreCareerProgress(): void {
    const career = this.state.career;
    this.run.day = career.day;
    this.run.level = career.level;
    this.run.xp = career.xp;
    this.run.xpNext = career.xpNext;
    this.run.pendingPicks = 0;
    this.run.skills = { ...this.run.skills, ...structuredClone(career.skills) };
    this.run.infiniteResearch = { ...this.run.infiniteResearch, ...structuredClone(this.state.infiniteResearch) };
    (Object.keys(this.run.skills) as RunSkillId[]).forEach((id) => {
      this.run.skills[id] = this.run.skills[id] > 0 ? 1 : 0;
    });
    this.state.selectedMap = Math.max(0, Math.min(this.state.rank, this.state.selectedMap ?? this.state.rank));
    this.run.mapRank = this.state.selectedMap;
    this.run.routeId = RANKS[this.run.mapRank].routeId;
  }

  private commit(): void {
    this.advanceGrowthMissions();
    this.syncCareerProgress();
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    this.onStateChange(this.getState());
  }
  private loadState(): GameState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return structuredClone(INITIAL_STATE);
      const parsed = JSON.parse(raw) as Partial<GameState>;
      const loaded: GameState = {
        ...structuredClone(INITIAL_STATE),
        ...parsed,
        selectedMap: parsed.selectedMap ?? parsed.rank ?? 0,
        levels: { ...INITIAL_STATE.levels, ...parsed.levels },
        research: { ...INITIAL_STATE.research, ...parsed.research },
        materials: { ...INITIAL_STATE.materials, ...parsed.materials },
        processing: {
          ...structuredClone(INITIAL_STATE.processing),
          ...parsed.processing,
          jobs: Array.isArray(parsed.processing?.jobs) ? parsed.processing.jobs : [],
          completedMaterials: { ...INITIAL_STATE.processing.completedMaterials, ...parsed.processing?.completedMaterials },
          lastUpdatedAt: parsed.processing?.lastUpdatedAt ?? Date.now(),
        },
        growthMission: { ...INITIAL_STATE.growthMission, ...parsed.growthMission },
        infiniteResearch: { ...INITIAL_STATE.infiniteResearch, ...parsed.infiniteResearch },
        story: {
          ...INITIAL_STATE.story,
          ...parsed.story,
          seen: Array.isArray(parsed.story?.seen) ? parsed.story.seen : [],
        },
        career: {
          ...structuredClone(INITIAL_STATE.career),
          ...parsed.career,
          skills: { ...INITIAL_STATE.career.skills, ...parsed.career?.skills },
        },
      };
      if (loaded.levels.fuelTank > 0) loaded.career.skills.auxTank = 1;
      if (loaded.levels.fuelSaver > 0) {
        loaded.career.skills.auxTank = 1;
        loaded.career.skills.aeroDrive = 1;
        loaded.career.skills.ecoThrusters = 1;
      }
      loaded.levels.fuelTank = 0;
      loaded.levels.fuelSaver = 0;
      return loaded;
    } catch { return structuredClone(INITIAL_STATE); }
  }

  private ensureAudio(): void { if (this.state.sound && !this.audioContext) this.audioContext = new AudioContext(); }
  private playTransitionWhoosh(rising: boolean): void {
    if (!this.state.sound) return;
    this.ensureAudio();
    if (!this.audioContext) return;
    const context = this.audioContext;
    const duration = .52;
    const now = context.currentTime;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index += 1) {
      const progress = index / samples.length;
      const envelope = Math.sin(Math.PI * progress) * (1 - progress * .38);
      samples[index] = (Math.random() * 2 - 1) * envelope;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    const tone = context.createOscillator();
    const toneGain = context.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.Q.value = .58;
    filter.frequency.setValueAtTime(rising ? 420 : 1800, now);
    filter.frequency.exponentialRampToValueAtTime(rising ? 2450 : 360, now + duration);
    noiseGain.gain.setValueAtTime(.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(.048, now + .075);
    noiseGain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    tone.type = "triangle";
    tone.frequency.setValueAtTime(rising ? 360 : 920, now);
    tone.frequency.exponentialRampToValueAtTime(rising ? 1080 : 340, now + .3);
    if (rising) tone.frequency.exponentialRampToValueAtTime(760, now + duration);
    toneGain.gain.setValueAtTime(.0001, now);
    toneGain.gain.exponentialRampToValueAtTime(.072, now + .055);
    toneGain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    source.connect(filter).connect(noiseGain).connect(context.destination);
    tone.connect(toneGain).connect(context.destination);
    source.start(now);
    tone.start(now);
    source.stop(now + duration);
    tone.stop(now + duration);
    source.addEventListener("ended", () => {
      source.disconnect(); filter.disconnect(); noiseGain.disconnect(); tone.disconnect(); toneGain.disconnect();
    }, { once: true });
  }
  private playHarvestTone(kind: CloudKind, cascadeDepth: number): void {
    const now = performance.now();
    const minimumGap = cascadeDepth > 0 ? 58 : 38;
    if (now - this.lastHarvestToneAt < minimumGap) return;
    this.lastHarvestToneAt = now;
    const baseFrequency: Record<CloudKind, number> = { cumulus: 390, rain: 270, electric: 610, ice: 740, solar: 880, aurora: 1040 };
    this.playTone(baseFrequency[kind] + Math.min(360, this.combo * 18 + cascadeDepth * 34), cascadeDepth > 0 ? .035 : .055);
  }
  private playTone(frequency: number, duration: number): void {
    if (!this.state.sound) return;
    this.ensureAudio(); if (!this.audioContext) return;
    const oscillator = this.audioContext.createOscillator(); const gain = this.audioContext.createGain();
    oscillator.type = "sine"; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.045, this.audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, this.audioContext.currentTime + duration);
    oscillator.connect(gain).connect(this.audioContext.destination); oscillator.start(); oscillator.stop(this.audioContext.currentTime + duration);
    oscillator.addEventListener("ended", () => { oscillator.disconnect(); gain.disconnect(); }, { once: true });
  }
  private playChord(): void { [392,523,659,784].forEach((frequency,index) => window.setTimeout(() => this.playTone(frequency,.18), index * 70)); }
}
