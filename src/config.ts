import type { CloudDefinition, CloudKind, ProcessingContract, RankDefinition, RunSkillDefinition, RunSkillId, UpgradeDefinition } from "./types";

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
    description: "한 번에 더 넓은 범위의 구름을 흡입합니다.",
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
  overclock: { id: "overclock", name: "터빈 과충전", description: "흡입력이 45% 강해집니다.", icon: "OVR", color: "#ff8a5b", maxStacks: 3 },
  wideIntake: { id: "wideIntake", name: "광역 흡입구", description: "흡입 범위가 크게 넓어집니다.", icon: "RNG", color: "#55c7df", maxStacks: 3 },
  chainBurst: { id: "chainBurst", name: "연쇄 기압폭발", description: "구름 수확 시 주변 구름도 피해를 입습니다.", icon: "CHN", color: "#ffca5c", maxStacks: 3 },
  profitRain: { id: "profitRain", name: "황금 빗방울", description: "구름 가치가 40% 증가합니다.", icon: "YLD", color: "#f6c74f", maxStacks: 3 },
  feverDrive: { id: "feverDrive", name: "피버 드라이브", description: "피버 충전 속도와 지속시간이 증가합니다.", icon: "FVR", color: "#a788ff", maxStacks: 3 },
  twinDrone: { id: "twinDrone", name: "지원 드론", description: "자동으로 구름을 분해하는 드론이 출격합니다.", icon: "DRN", color: "#65d6b4", maxStacks: 3 },
};

export const INITIAL_STATE = {
  money: 0,
  totalEarned: 0,
  harvested: 0,
  rank: 0,
  levels: { power: 0, radius: 0, value: 0, drone: 0, insulation: 0 },
  bestCombo: 0,
  sound: true,
} as const;

export function upgradeCost(baseCost: number, level: number): number {
  return Math.round(baseCost * Math.pow(1.72, level));
}
