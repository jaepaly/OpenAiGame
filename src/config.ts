import type { CloudDefinition, CloudKind, FlightRouteDefinition, FlightRouteId, ProcessingContract, RankDefinition, ResearchDefinition, ResearchId, RunSkillDefinition, RunSkillId, SkillTreeBranch, UpgradeDefinition } from "./types";

export const RESEARCH_PROJECTS: Record<ResearchId, ResearchDefinition> = {
  logistics: {
    id: "logistics", code: "CRG", name: "적운 물류망", color: "#71d8ef",
    description: "회수 동선을 표준화해 모든 항로의 기본 적재량을 늘립니다.",
    effect: "영구 화물칸 +4",
  },
  refining: {
    id: "refining", code: "YLD", name: "초임계 정제", color: "#ffd15e",
    description: "구름 압축 순도를 높여 모든 납품 계약의 원재료 가치를 올립니다.",
    effect: "영구 판매가 +5%",
  },
  forecasting: {
    id: "forecasting", code: "DNS", name: "고밀도 예보망", color: "#b695ff",
    description: "밀도 변화를 먼저 포착해 희귀한 고밀도 구름을 더 자주 만납니다.",
    effect: "영구 고밀도 확률 +1.5%",
  },
};

export const FLIGHT_ROUTES: Record<FlightRouteId, FlightRouteDefinition> = {
  tailwind: {
    id: "tailwind", code: "WND", name: "순풍 회랑", color: "#6fe3ca",
    description: "넓고 안정적인 항로입니다. 화물칸을 늘리고 구름이 빠르게 유입됩니다.",
    effect: "화물 +8 · 구름 유입 35%↑", capacityBonus: 8, denseBonus: 0,
    spawnInterval: .65, valueMultiplier: 1, frontDelay: 14, frontBonus: 1,
  },
  pressureMine: {
    id: "pressureMine", code: "DNS", name: "고기압 광맥", color: "#ffd15e",
    description: "고밀도 구름이 뭉치는 수익형 항로입니다. 어렵지만 단가가 높습니다.",
    effect: "고밀도 +13% · 가치 15%↑", capacityBonus: 0, denseBonus: .13,
    spawnInterval: 1, valueMultiplier: 1.15, frontDelay: 14, frontBonus: 1,
  },
  frontline: {
    id: "frontline", code: "FRT", name: "전선 추적로", color: "#a98bff",
    description: "구름 전선을 쫓는 고위험 항로입니다. 전선 보너스를 자주 노릴 수 있습니다.",
    effect: "전선 조기 출현 · 보너스 50%↑", capacityBonus: 0, denseBonus: .04,
    spawnInterval: .92, valueMultiplier: 1.05, frontDelay: 6, frontBonus: 1.5,
  },
};

export const PROCESSING_CONTRACTS: ProcessingContract[] = [
  { id: "water", code: "H2O", name: "생수 병입 라인", description: "맑은 구름을 프리미엄 생수로 가공합니다.", multipliers: { cumulus: 1.45, rain: 1.05, electric: .85 } },
  { id: "climate", code: "CLM", name: "기상 솔루션", description: "비구름 중심의 농업·기상 서비스 계약입니다.", multipliers: { cumulus: 1.12, rain: 1.55, electric: 1.05 } },
  { id: "energy", code: "NRG", name: "에너지 연구소", description: "전기구름을 고밀도 에너지 셀로 변환합니다.", multipliers: { cumulus: .9, rain: 1.2, electric: 1.9 } },
];

export const CLOUDS: Record<CloudKind, CloudDefinition> = {
  cumulus: {
    kind: "cumulus",
    name: "뭉게구름",
    icon: "☁",
    value: 2,
    resistance: 1,
    radius: [20, 32],
    color: "#fffdf6",
    shadow: "#b8daf0",
    unlockRank: 0,
    health: 22,
  },
  rain: {
    kind: "rain",
    name: "비구름",
    icon: "🌧",
    value: 9,
    resistance: 2.5,
    radius: [25, 37],
    color: "#8ea7bf",
    shadow: "#536b86",
    unlockRank: 1,
    health: 72,
  },
  electric: {
    kind: "electric",
    name: "전기구름",
    icon: "⚡",
    value: 28,
    resistance: 4.2,
    radius: [28, 41],
    color: "#6659a9",
    shadow: "#312b69",
    unlockRank: 2,
    health: 165,
  },
};

export const RANKS: RankDefinition[] = [
  {
    name: "골목 기상소",
    altitude: "해발 120m",
    promotionCost: 0,
    requiredHarvest: 0,
    weights: { cumulus: 1, rain: 0, electric: 0 },
    description: "가벼운 뭉게구름으로 수확의 기본을 익히세요.",
  },
  {
    name: "지역 하늘지사",
    altitude: "상공 2,000m",
    promotionCost: 120,
    requiredHarvest: 22,
    weights: { cumulus: 0.62, rain: 0.38, electric: 0 },
    description: "무겁지만 가치 높은 비구름이 유입됩니다.",
  },
  {
    name: "전국 기상기업",
    altitude: "상공 5,500m",
    promotionCost: 650,
    requiredHarvest: 65,
    weights: { cumulus: 0.28, rain: 0.47, electric: 0.25 },
    description: "위험하고 짜릿한 전기구름이 나타납니다.",
  },
];

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: "power",
    name: "진공 터빈",
    description: "흡입력을 높여 구름을 더 빠르게 분해합니다.",
    icon: "TBN",
    baseCost: 16,
    maxLevel: 8,
  },
  {
    id: "radius",
    name: "확장 흡입구",
    description: "흡입 범위와 기압 유도 출력을 높여 구름을 더 빠르고 많이 불러옵니다.",
    icon: "INT",
    baseCost: 22,
    maxLevel: 6,
  },
  {
    id: "value",
    name: "고순도 압축",
    description: "모든 구름의 판매 가격을 높입니다.",
    icon: "CMP",
    baseCost: 28,
    maxLevel: 7,
  },
  {
    id: "drone",
    name: "수확 드론",
    description: "드론이 가장 가까운 구름을 자동으로 흡입합니다.",
    icon: "DRN",
    baseCost: 90,
    maxLevel: 4,
  },
  {
    id: "insulation",
    name: "절연 코팅",
    description: "전기구름의 과부하를 막고 보너스를 얻습니다.",
    icon: "ISO",
    baseCost: 230,
    maxLevel: 2,
  },
];

export const RUN_SKILLS: Record<RunSkillId, RunSkillDefinition> = {
  overclock: { id: "overclock", name: "터빈 과충전", description: "흡입력이 45% 강해집니다.", icon: "OVR", color: "#ff8a5b", maxStacks: 3, category: "core" },
  wideIntake: { id: "wideIntake", name: "광역 흡입구", description: "흡입 범위가 넓어지고 단계마다 구름 최대 수 +4, 유입 속도 +8%를 얻습니다.", icon: "RNG", color: "#55c7df", maxStacks: 3, category: "core", requirements: ["overclock"] },
  chainBurst: { id: "chainBurst", name: "연쇄 기압폭발", description: "구름 수확 시 주변 구름도 피해를 입습니다.", icon: "CHN", color: "#ffca5c", maxStacks: 3, category: "core", requirements: ["twinDrone"] },
  profitRain: { id: "profitRain", name: "황금 빗방울", description: "구름 가치가 40% 증가합니다.", icon: "YLD", color: "#f6c74f", maxStacks: 3, category: "core" },
  feverDrive: { id: "feverDrive", name: "피버 드라이브", description: "피버 충전 속도와 지속시간이 증가합니다.", icon: "FVR", color: "#a788ff", maxStacks: 3, category: "core", requirements: ["profitRain"] },
  twinDrone: { id: "twinDrone", name: "지원 드론", description: "자동으로 구름을 분해하는 드론이 출격합니다.", icon: "DRN", color: "#65d6b4", maxStacks: 3, category: "core" },
  blackHole: { id: "blackHole", name: "블랙홀 압축기", description: "흡입장이 거대해지고 수확 폭발이 넓게 연쇄됩니다.", icon: "BLK", color: "#45e1df", maxStacks: 1, category: "evolution", requirements: ["wideIntake"] },
  goldenStorm: { id: "goldenStorm", name: "황금 폭풍", description: "피버가 강화되고 피버 중 모든 구름 가치가 50% 증가합니다.", icon: "GLD", color: "#ffe05f", maxStacks: 1, category: "evolution", requirements: ["feverDrive"] },
  droneFleet: { id: "droneFleet", name: "과급 드론 편대", description: "과충전 드론 3대가 추가 출격해 구름을 집중 분해합니다.", icon: "FLT", color: "#79f0bd", maxStacks: 1, category: "evolution", requirements: ["chainBurst"] },
  cargoBay: { id: "cargoBay", name: "화물칸 오버드라이브", description: "이번 하루의 화물 용량이 6칸 증가합니다.", icon: "CRG", color: "#71d8ef", maxStacks: Number.POSITIVE_INFINITY, category: "overdrive", requirements: ["droneFleet"] },
  yieldBoost: { id: "yieldBoost", name: "수익 오버드라이브", description: "모든 구름의 가치가 추가로 10% 증가합니다.", icon: "YLD+", color: "#ffd15e", maxStacks: Number.POSITIVE_INFINITY, category: "overdrive", requirements: ["goldenStorm"] },
  denseRadar: { id: "denseRadar", name: "고밀도 레이더", description: "고밀도 구름 출현 확률이 추가로 3% 증가합니다.", icon: "DNS+", color: "#ff9b69", maxStacks: Number.POSITIVE_INFINITY, category: "overdrive", requirements: ["blackHole"] },
  feverReserve: { id: "feverReserve", name: "피버 예비전력", description: "피버 지속시간이 추가로 0.8초 증가합니다.", icon: "FVR+", color: "#b695ff", maxStacks: Number.POSITIVE_INFINITY, category: "overdrive", requirements: ["goldenStorm"] },
};

export const SKILL_TREE_BRANCHES: SkillTreeBranch[] = [
  { id: "vacuum", code: "VAC", name: "흡입 폭주", description: "구름 물량과 광역 연쇄를 폭발시킵니다.", color: "#55c7df", nodes: ["overclock", "wideIntake", "blackHole", "denseRadar"] },
  { id: "fever", code: "GLD", name: "황금 피버", description: "가치와 피버 시간을 극한까지 끌어올립니다.", color: "#ffd15e", nodes: ["profitRain", "feverDrive", "goldenStorm", "yieldBoost", "feverReserve"] },
  { id: "automation", code: "AUT", name: "자동 수확", description: "드론 편대와 화물칸으로 장기 수확합니다.", color: "#79f0bd", nodes: ["twinDrone", "chainBurst", "droneFleet", "cargoBay"] },
];

export const INITIAL_STATE = {
  money: 0,
  totalEarned: 0,
  harvested: 0,
  rank: 0,
  levels: { power: 0, radius: 0, value: 0, drone: 0, insulation: 0 },
  research: { logistics: 0, refining: 0, forecasting: 0 },
  bestCombo: 0,
  sound: true,
} as const;

export function upgradeCost(baseCost: number, level: number): number {
  return Math.round(baseCost * Math.pow(1.72, level));
}
