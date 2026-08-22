import type { CloudDefinition, CloudKind, FlightRouteDefinition, FlightRouteId, GrowthMissionDefinition, InfiniteResearchDefinition, InfiniteResearchId, ProcessingContract, ProcessingJob, RankDefinition, ResearchDefinition, ResearchId, RunSkillCost, RunSkillDefinition, RunSkillId, SkillTreeBranch, StorySceneId, UpgradeDefinition } from "./types";

export const GROWTH_MISSIONS: GrowthMissionDefinition[] = [
  { id: "collect", code: "JOB 01", title: "첫 수확을 시작하세요", description: "뭉게구름 6개를 수확", target: 6, reward: { money: 4 }, rewardLabel: "◈ 4" },
  { id: "return", code: "JOB 02", title: "연료를 남기고 귀환하세요", description: "RTB로 안전 귀환 1회", target: 1, reward: { materials: { cumulus: 2 } }, rewardLabel: "☁ 원재료 2" },
  { id: "contract", code: "JOB 03", title: "첫 가공 계약을 체결하세요", description: "구름 가공 라인에 화물 적재", target: 1, reward: { money: 8 }, rewardLabel: "◈ 8" },
  { id: "ship", code: "JOB 04", title: "완제품을 출하하세요", description: "가공동에서 일괄 출하 1회", target: 1, reward: { money: 12 }, rewardLabel: "◈ 12" },
  { id: "skill", code: "JOB 05", title: "첫 특성을 설계하세요", description: "특성 설계실에서 노드 1개 해금", target: 1, reward: { money: 20 }, rewardLabel: "◈ 20" },
  { id: "upgrade", code: "JOB 06", title: "비행선을 강화하세요", description: "장비 정비소에서 부품 1회 강화", target: 1, reward: { money: 40 }, rewardLabel: "◈ 40" },
  { id: "promote", code: "JOB 07", title: "다음 고도를 해금하세요", description: "지역 하늘지사로 승급", target: 1, reward: { money: 40 }, rewardLabel: "◈ 40" },
  { id: "rain", code: "JOB 08", title: "비구름 수확선을 만드세요", description: "비구름 5개를 수확", target: 5, reward: { money: 60, materials: { rain: 2 } }, rewardLabel: "◈ 60 · 🌧 2" },
];

export const RESEARCH_PROJECTS: Record<ResearchId, ResearchDefinition> = {
  logistics: {
    id: "logistics", code: "CRG", name: "적운 물류망", color: "#71d8ef",
    description: "회수 동선과 보급 규격을 표준화해 가공 묶음과 처리 효율을 늘립니다.",
    effect: "가공 묶음 +2 · 가공 속도 +2%",
  },
  refining: {
    id: "refining", code: "YLD", name: "초임계 정제", color: "#ffd15e",
    description: "구름 압축 순도를 높여 가공 판매가와 컨베이어 효율을 함께 올립니다.",
    effect: "영구 판매가 +5% · 가공 속도 +4%",
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
    description: "저고도 구름 무리가 끊임없이 밀려오는 콤보 항로입니다. 부족한 초급 재료를 다시 모으기 좋습니다.",
    effect: "연료 +2 · 유입 48%↑ · 하위 구름↑ · 콤보 +0.9초", fuelBonus: 2, denseBonus: 0,
    spawnInterval: .52, valueMultiplier: 1, frontDelay: 14, frontBonus: 1, comboWindowBonus: .9, dronePower: 1, startingFever: 0, lowTierBias: .26,
  },
  pressureMine: {
    id: "pressureMine", code: "DNS", name: "고기압 광맥", color: "#ffd15e",
    description: "단단한 고밀도 구름을 드론 편대로 절단하는 채굴 항로입니다. 느리지만 한 덩어리의 가치가 큽니다.",
    effect: "고밀도 +22% · 가치 28%↑ · 드론 화력 60%↑", fuelBonus: 0, denseBonus: .22,
    spawnInterval: 1.08, valueMultiplier: 1.28, frontDelay: 14, frontBonus: 1, comboWindowBonus: 0, dronePower: 1.6, startingFever: 0, lowTierBias: 0,
  },
  frontline: {
    id: "frontline", code: "FRT", name: "전선 추적로", color: "#a98bff",
    description: "피버 상태로 출발해 연속 전선을 추격하는 폭발형 항로입니다. 짧은 시간에 화면 전체를 쓸어 담습니다.",
    effect: "시작 피버 40% · 전선 2.3배 · 초고속 재등장", fuelBonus: 0, denseBonus: .05,
    spawnInterval: .88, valueMultiplier: 1.08, frontDelay: 3.5, frontBonus: 2.3, comboWindowBonus: .25, dronePower: 1.15, startingFever: 40, lowTierBias: 0,
  },
};

export const PROCESSING_CONTRACTS: ProcessingContract[] = [
  { id: "water", code: "H2O", name: "생수 병입 라인", description: "맑은 구름을 프리미엄 생수로 가공합니다.", multipliers: { cumulus: 1.45, rain: 1.05, electric: .85, ice: .82, solar: .72, aurora: .68 } },
  { id: "climate", code: "CLM", name: "기상 솔루션", description: "비구름 중심의 농업·기상 서비스 계약입니다.", multipliers: { cumulus: 1.12, rain: 1.55, electric: 1.05, ice: 1.1, solar: .84, aurora: .8 } },
  { id: "priority", code: "P-1", name: "우선 항로 납품", description: "쾌청산업을 꺾은 수확사에게만 개방되는 고수익 비구름 긴급 계약입니다.", multipliers: { cumulus: 1.05, rain: 1.92, electric: 1.18, ice: 1.04, solar: .88, aurora: .82 } },
  { id: "energy", code: "NRG", name: "에너지 연구소", description: "전기구름을 고밀도 에너지 셀로 변환합니다.", multipliers: { cumulus: .9, rain: 1.2, electric: 1.9, ice: 1.15, solar: 1.35, aurora: 1.25 } },
  { id: "cryogenic", code: "CRY", name: "극저온 소재국", description: "빙정구름을 초전도 냉각재로 정제합니다.", multipliers: { cumulus: .72, rain: .9, electric: 1.15, ice: 2.05, solar: 1.05, aurora: 1.18 } },
  { id: "stellar", code: "SOL", name: "태양광 연성로", description: "태양구름을 고효율 광자 연료로 가공합니다.", multipliers: { cumulus: .68, rain: .76, electric: 1.08, ice: 1.05, solar: 2.2, aurora: 1.35 } },
  { id: "spectrum", code: "AUR", name: "오로라 스펙트럼국", description: "오로라구름의 희귀 입자를 최고가로 매입합니다.", multipliers: { cumulus: .62, rain: .7, electric: .92, ice: 1.1, solar: 1.35, aurora: 2.45 } },
];

export const PROCESSING_SECONDS: Record<CloudKind, number> = {
  cumulus: 1.1,
  rain: 1.8,
  electric: 3,
  ice: 4.5,
  solar: 6.8,
  aurora: 10,
};

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
  ice: {
    kind: "ice", name: "빙정구름", icon: "❄", value: 58, resistance: 5.5,
    radius: [30, 43], color: "#b9f3ff", shadow: "#5b9ab6", unlockRank: 3, health: 250,
  },
  solar: {
    kind: "solar", name: "태양구름", icon: "☀", value: 135, resistance: 7,
    radius: [33, 46], color: "#ffd86a", shadow: "#d36f45", unlockRank: 4, health: 390,
  },
  aurora: {
    kind: "aurora", name: "오로라구름", icon: "✦", value: 310, resistance: 9,
    radius: [36, 50], color: "#8fffd2", shadow: "#6750b7", unlockRank: 5, health: 600,
  },
};

export const RANKS: RankDefinition[] = [
  {
    code: "CUM", icon: "☁", color: "#71d8ef", fuelDrain: 1, valueMultiplier: 1, routeId: "tailwind", identity: "TRAINING SKY · CUMULUS FARM",
    name: "골목 기상소",
    altitude: "해발 120m",
    promotionCost: 0,
    requiredHarvest: 0,
    weights: { cumulus: 1, rain: 0, electric: 0, ice: 0, solar: 0, aurora: 0 },
    description: "가벼운 뭉게구름으로 수확의 기본을 익히세요.",
  },
  {
    code: "RAN", icon: "🌧", color: "#69b7e8", fuelDrain: 1.28, valueMultiplier: 1.12, routeId: "tailwind", identity: "RAIN BELT · LONG COMBO",
    name: "지역 하늘지사",
    altitude: "상공 2,000m",
    promotionCost: 120,
    requiredHarvest: 18,
    weights: { cumulus: 0.62, rain: 0.38, electric: 0, ice: 0, solar: 0, aurora: 0 },
    description: "무겁지만 가치 높은 비구름이 유입됩니다.",
  },
  {
    code: "ELC", icon: "⚡", color: "#b695ff", fuelDrain: 1.62, valueMultiplier: 1.3, routeId: "pressureMine", identity: "CHARGED MINE · DENSE VALUE",
    name: "전국 기상기업",
    altitude: "상공 5,500m",
    promotionCost: 650,
    requiredHarvest: 45,
    weights: { cumulus: 0.28, rain: 0.47, electric: 0.25, ice: 0, solar: 0, aurora: 0 },
    description: "위험하고 짜릿한 전기구름이 나타납니다.",
  },
  {
    code: "ICE", icon: "❄", color: "#9eeeff", fuelDrain: 2.05, valueMultiplier: 1.55, routeId: "pressureMine", identity: "STRATOSPHERE · HARD CRYSTAL",
    name: "성층권 수확본부",
    altitude: "상공 15,000m",
    promotionCost: 2800,
    requiredHarvest: 90,
    weights: { cumulus: 0.12, rain: 0.28, electric: 0.38, ice: 0.22, solar: 0, aurora: 0 },
    description: "차갑고 단단한 빙정구름이 나타나는 성층권 항로를 개척합니다.",
  },
  {
    code: "SOL", icon: "☀", color: "#ffd15e", fuelDrain: 2.55, valueMultiplier: 1.9, routeId: "frontline", identity: "JET STREAM · SOLAR RUSH",
    name: "제트기류 산업연합",
    altitude: "상공 30,000m",
    promotionCost: 11500,
    requiredHarvest: 180,
    weights: { cumulus: 0.06, rain: 0.18, electric: 0.3, ice: 0.28, solar: 0.18, aurora: 0 },
    description: "빛나는 태양구름과 초고속 제트기류를 산업화합니다.",
  },
  {
    code: "AUR", icon: "✦", color: "#7ff5df", fuelDrain: 3.15, valueMultiplier: 2.35, routeId: "frontline", identity: "IONOSPHERE · SPECTRUM JACKPOT",
    name: "전리층 기상공단",
    altitude: "상공 60,000m",
    promotionCost: 48000,
    requiredHarvest: 360,
    weights: { cumulus: 0.03, rain: 0.09, electric: 0.18, ice: 0.25, solar: 0.27, aurora: 0.18 },
    description: "대기가 끝나는 곳에서 오로라구름을 최고급 자원으로 회수합니다.",
  },
];

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: "power",
    name: "진공 터빈",
    description: "흡입력을 높여 구름을 더 빠르게 분해합니다.",
    icon: "TBN",
    baseCost: 16,
    maxLevel: 24,
  },
  {
    id: "radius",
    name: "확장 흡입구",
    description: "흡입 범위와 구름 유입량을 함께 늘립니다.",
    icon: "INT",
    baseCost: 22,
    maxLevel: 20,
  },
  {
    id: "value",
    name: "고순도 압축",
    description: "모든 구름의 판매 가격을 높입니다.",
    icon: "CMP",
    baseCost: 28,
    maxLevel: 22,
  },
  {
    id: "drone",
    name: "수확 드론",
    description: "드론이 가장 가까운 구름을 자동으로 흡입합니다.",
    icon: "DRN",
    baseCost: 90,
    maxLevel: 12,
  },
  {
    id: "insulation",
    name: "절연 코팅",
    description: "전기·태양·오로라구름의 과부하를 안정화해 보너스를 얻습니다.",
    icon: "ISO",
    baseCost: 230,
    maxLevel: 10,
  },
  {
    id: "conveyor",
    name: "고속 컨베이어",
    description: "비행 중에도 돌아가는 가공 라인의 처리 속도를 높입니다.",
    icon: "CVR",
    baseCost: 48,
    maxLevel: 18,
  },
  {
    id: "processingLine",
    name: "병렬 응축 라인",
    description: "동시에 처리할 수 있는 구름 묶음을 한 줄씩 늘립니다.",
    icon: "LIN",
    baseCost: 180,
    maxLevel: 4,
  },
  {
    id: "hopper",
    name: "대형 적재 호퍼",
    description: "한 묶음에 투입하는 구름 수를 늘려 대기열을 압축합니다.",
    icon: "HPR",
    baseCost: 70,
    maxLevel: 14,
  },
];

export const RUN_SKILLS: Record<RunSkillId, RunSkillDefinition> = {
  overclock: { id: "overclock", name: "터빈 과충전", description: "흡입력이 45% 강해집니다.", icon: "OVR", color: "#ff8a5b", maxStacks: 1, category: "core" },
  intakeServo: { id: "intakeServo", name: "추진 서보", description: "조준각이 넓어지고 비행선 이동 속도가 22% 증가합니다.", icon: "SPD", color: "#66d5ec", maxStacks: 1, category: "core", requirements: ["overclock"] },
  wideIntake: { id: "wideIntake", name: "광역 흡입구", description: "흡입 범위가 넓어지고 구름 최대 수 +4, 유입 속도 +8%를 얻습니다.", icon: "RNG", color: "#55c7df", maxStacks: 1, category: "core", requirements: ["intakeServo"] },
  pressureChamber: { id: "pressureChamber", name: "다단 압축실", description: "흡입력과 흡입 반경을 동시에 강화합니다.", icon: "PRS", color: "#4ad7e3", maxStacks: 1, category: "core", requirements: ["wideIntake"] },
  massInduction: { id: "massInduction", name: "대량 기압유도", description: "최대·최소 구름 수와 생성 속도를 크게 높입니다.", icon: "MAS", color: "#46c9d3", maxStacks: 1, category: "core", requirements: ["pressureChamber"] },
  vacuumMomentum: { id: "vacuumMomentum", name: "진공 관성", description: "비행선 이동 속도가 추가로 28% 증가하고 콤보 유지시간이 늘어납니다.", icon: "V-M", color: "#63ecf0", maxStacks: 1, category: "core", requirements: ["eventHorizon"] },
  chainBurst: { id: "chainBurst", name: "연쇄 기압폭발", description: "수확 폭발이 주변 구름을 차례로 터뜨려 실제 연쇄 수확을 일으킵니다.", icon: "CHN", color: "#ffca5c", maxStacks: 1, category: "core", requirements: ["droneAI"] },
  profitRain: { id: "profitRain", name: "황금 빗방울", description: "구름 가치가 40% 증가합니다.", icon: "YLD", color: "#f6c74f", maxStacks: 1, category: "core" },
  comboCapacitor: { id: "comboCapacitor", name: "콤보 축전기", description: "콤보 유지시간과 피버 충전량을 높입니다.", icon: "CAP", color: "#e6b85b", maxStacks: 1, category: "core", requirements: ["profitRain"] },
  feverDrive: { id: "feverDrive", name: "피버 드라이브", description: "피버 충전 속도와 지속시간이 증가합니다.", icon: "FVR", color: "#a788ff", maxStacks: 1, category: "core", requirements: ["comboCapacitor"] },
  feverInjector: { id: "feverInjector", name: "피버 인젝터", description: "피버 흡입력과 비행 가속을 증폭합니다.", icon: "INJ", color: "#b092ff", maxStacks: 1, category: "core", requirements: ["feverDrive"] },
  stormCatalyst: { id: "stormCatalyst", name: "폭풍 촉매", description: "피버 지속시간과 피버 중 구름 재고선을 높입니다.", icon: "CAT", color: "#c09dff", maxStacks: 1, category: "core", requirements: ["feverInjector"] },
  jackpotPulse: { id: "jackpotPulse", name: "잭팟 펄스", description: "피버 중 구름 가치가 15% 증가합니다.", icon: "JPT", color: "#ffd866", maxStacks: 1, category: "core", requirements: ["sunStorm"] },
  twinDrone: { id: "twinDrone", name: "지원 드론", description: "자동으로 구름을 분해하는 드론이 출격합니다.", icon: "DRN", color: "#65d6b4", maxStacks: 1, category: "core" },
  droneAI: { id: "droneAI", name: "드론 표적 AI", description: "드론 분해력과 탐색 효율을 강화합니다.", icon: "A-I", color: "#76dfbe", maxStacks: 1, category: "core", requirements: ["twinDrone"] },
  relayBurst: { id: "relayBurst", name: "폭발 중계기", description: "연쇄 폭발의 범위와 피해를 크게 높입니다.", icon: "RLY", color: "#ffbd61", maxStacks: 1, category: "core", requirements: ["chainBurst"] },
  salvageProtocol: { id: "salvageProtocol", name: "회수 프로토콜", description: "드론 수확 가치와 표적 전환 속도를 높입니다.", icon: "SLV", color: "#86e5bd", maxStacks: 1, category: "core", requirements: ["relayBurst"] },
  swarmMatrix: { id: "swarmMatrix", name: "군집 매트릭스", description: "지원 드론 2대와 무인 가공 라인 1개를 추가합니다.", icon: "SWM", color: "#7ff5c4", maxStacks: 1, category: "core", requirements: ["nanoSwarm"] },
  blackHole: { id: "blackHole", name: "블랙홀 압축기", description: "흡입장이 거대해지고 반 화면의 구름을 연속 붕괴시킵니다.", icon: "BLK", color: "#45e1df", maxStacks: 1, category: "evolution", requirements: ["massInduction"] },
  eventHorizon: { id: "eventHorizon", name: "사건의 지평선", description: "흡입장이 다시 확장되고 구름 수용량이 폭증합니다.", icon: "EVT", color: "#7afcff", maxStacks: 1, category: "evolution", requirements: ["blackHole"] },
  goldenStorm: { id: "goldenStorm", name: "황금 폭풍", description: "피버가 강화되고 피버 중 모든 구름 가치가 50% 증가합니다.", icon: "GLD", color: "#ffe05f", maxStacks: 1, category: "evolution", requirements: ["stormCatalyst"] },
  sunStorm: { id: "sunStorm", name: "태양 폭풍", description: "피버가 더 오래 지속되고 흡입력·가치가 다시 폭증합니다.", icon: "SUN", color: "#fff07a", maxStacks: 1, category: "evolution", requirements: ["goldenStorm"] },
  droneFleet: { id: "droneFleet", name: "과급 드론 편대", description: "과충전 드론 3대가 추가 출격해 구름을 집중 분해합니다.", icon: "FLT", color: "#79f0bd", maxStacks: 1, category: "evolution", requirements: ["salvageProtocol"] },
  nanoSwarm: { id: "nanoSwarm", name: "나노 구름 군집", description: "지원 드론 5대와 드론 분해력 50%를 추가합니다.", icon: "N-S", color: "#a0ffd0", maxStacks: 1, category: "evolution", requirements: ["droneFleet"] },
  cargoBay: { id: "cargoBay", name: "초대형 화물 베이", description: "가공 묶음 용량 +12와 드론 회수 가치를 얻습니다.", icon: "C-B", color: "#71d8ef", maxStacks: 1, category: "overdrive", requirements: ["droneFleet"] },
  yieldBoost: { id: "yieldBoost", name: "수익 오버드라이브", description: "모든 구름 가치 +10%와 가공 속도 +25%를 얻습니다.", icon: "YLD+", color: "#ffd15e", maxStacks: 1, category: "overdrive", requirements: ["goldenStorm"] },
  denseRadar: { id: "denseRadar", name: "고밀도 레이더", description: "고밀도 구름 출현 확률이 추가로 3% 증가합니다.", icon: "DNS+", color: "#ff9b69", maxStacks: 1, category: "overdrive", requirements: ["blackHole"] },
  feverReserve: { id: "feverReserve", name: "피버 예비전력", description: "피버 지속시간이 추가로 0.8초 증가합니다.", icon: "FVR+", color: "#b695ff", maxStacks: 1, category: "overdrive", requirements: ["goldenStorm"] },
  cycloneCore: { id: "cycloneCore", name: "사이클론 코어", description: "피버 중 흡입장이 확장되고 구름 유입 속도가 45% 증가합니다.", icon: "CYC", color: "#73e8ff", maxStacks: 1, category: "synergy", requirements: ["pressureChamber", "feverInjector"] },
  cascadeGrid: { id: "cascadeGrid", name: "연쇄 수확망", description: "연쇄 폭발의 범위와 피해가 크게 증가하고 폭발 박자가 빨라집니다.", icon: "NET", color: "#ffad66", maxStacks: 1, category: "synergy", requirements: ["massInduction", "relayBurst"] },
  stormDrones: { id: "stormDrones", name: "폭풍 드론 프로토콜", description: "피버 중 지원 드론 2대가 추가되고 분해 속도가 세 배가 됩니다.", icon: "SDR", color: "#8dffd1", maxStacks: 1, category: "synergy", requirements: ["stormCatalyst", "salvageProtocol"] },
  goldenVacuum: { id: "goldenVacuum", name: "황금 진공로", description: "피버 중 흡입 반경·흡입력·수익이 동시에 증가합니다.", icon: "G-V", color: "#ffe878", maxStacks: 1, category: "synergy", requirements: ["eventHorizon", "sunStorm"] },
  chainReactor: { id: "chainReactor", name: "연쇄 반응로", description: "연쇄 폭발이 더 멀리 퍼지고 피해량이 크게 증가합니다.", icon: "RXR", color: "#ff9f68", maxStacks: 1, category: "synergy", requirements: ["eventHorizon", "nanoSwarm"] },
  cargoCyclone: { id: "cargoCyclone", name: "연료 사이클론", description: "피버 중 연료 소모가 28% 감소하고 최소 구름 재고가 대폭 확장됩니다.", icon: "F-C", color: "#a8ffbe", maxStacks: 1, category: "synergy", requirements: ["sunStorm", "nanoSwarm"] },
  auxTank: { id: "auxTank", name: "보조 압력탱크", description: "최대 연료가 3 증가합니다. 항법 계통의 시작 노드입니다.", icon: "TNK", color: "#ff9f68", maxStacks: 1, category: "core" },
  aeroDrive: { id: "aeroDrive", name: "항공 기어", description: "비행선 이동 속도가 18% 증가합니다.", icon: "SPD", color: "#ffad72", maxStacks: 1, category: "core", requirements: ["auxTank"] },
  ecoThrusters: { id: "ecoThrusters", name: "순환 추진기", description: "이동에 드는 연료가 22% 감소합니다.", icon: "ECO", color: "#ffbd78", maxStacks: 1, category: "core", requirements: ["aeroDrive"] },
  vacuumRecycler: { id: "vacuumRecycler", name: "진공 회수관", description: "흡입에 드는 연료가 22% 감소합니다.", icon: "REC", color: "#ffc985", maxStacks: 1, category: "core", requirements: ["ecoThrusters"] },
  fuelCondenser: { id: "fuelCondenser", name: "연료 응축기", description: "직접 수확한 구름이 연료 셀을 만들기 시작합니다. 비행마다 회수량 제한이 있습니다.", icon: "CEL", color: "#ffe07b", maxStacks: 1, category: "evolution", requirements: ["vacuumRecycler"] },
  comboGenerator: { id: "comboGenerator", name: "콤보 발전기", description: "직접 수확 콤보가 길수록 연료 셀이 더 자주 발생합니다.", icon: "GEN", color: "#ffe879", maxStacks: 1, category: "core", requirements: ["fuelCondenser"] },
  recoveryReservoir: { id: "recoveryReservoir", name: "회수 저장조", description: "최대 연료 +3, 비행당 연료 회수 한도 +4를 얻습니다.", icon: "RSV", color: "#fff08a", maxStacks: 1, category: "overdrive", requirements: ["comboGenerator"] },
  stormFuel: { id: "stormFuel", name: "폭풍 연료핵", description: "전기 이상 구름의 연료 셀 효율과 회수 한도가 크게 증가합니다.", icon: "ION", color: "#fff7a8", maxStacks: 1, category: "evolution", requirements: ["recoveryReservoir"] },
};

export const RUN_SKILL_COSTS: Record<RunSkillId, RunSkillCost> = {
  overclock: { cumulus: 8 }, intakeServo: { cumulus: 12 }, wideIntake: { cumulus: 20 },
  pressureChamber: { cumulus: 24, rain: 6 }, massInduction: { cumulus: 30, rain: 14 },
  blackHole: { cumulus: 40, rain: 28 }, eventHorizon: { electric: 18, ice: 8 },
  vacuumMomentum: { electric: 24, ice: 16 }, denseRadar: { electric: 20, ice: 20 },
  profitRain: { cumulus: 8 }, comboCapacitor: { cumulus: 12 }, feverDrive: { cumulus: 20 },
  feverInjector: { cumulus: 20, rain: 8 }, stormCatalyst: { cumulus: 25, rain: 16 },
  goldenStorm: { cumulus: 35, rain: 30 }, sunStorm: { electric: 18, ice: 8 },
  jackpotPulse: { electric: 24, ice: 16 }, yieldBoost: { electric: 20, solar: 10 },
  feverReserve: { electric: 22, ice: 18 },
  twinDrone: { cumulus: 8 }, droneAI: { cumulus: 12 }, chainBurst: { cumulus: 20 },
  relayBurst: { cumulus: 20, rain: 8 }, salvageProtocol: { cumulus: 25, rain: 16 },
  droneFleet: { cumulus: 35, rain: 30 }, nanoSwarm: { electric: 18, ice: 8 },
  swarmMatrix: { electric: 24, ice: 16 }, cargoBay: { electric: 20, solar: 10 },
  cycloneCore: { cumulus: 30, rain: 24 }, cascadeGrid: { rain: 28, electric: 14, ice: 8 },
  stormDrones: { rain: 28, electric: 14, ice: 8 }, goldenVacuum: { ice: 28, solar: 12 },
  cargoCyclone: { solar: 28, aurora: 8 }, chainReactor: { solar: 28, aurora: 8 },
  auxTank: { cumulus: 10 }, aeroDrive: { cumulus: 14 }, ecoThrusters: { cumulus: 20, rain: 4 },
  vacuumRecycler: { cumulus: 20, rain: 6 }, fuelCondenser: { cumulus: 24, rain: 10 },
  comboGenerator: { rain: 18, electric: 6 }, recoveryReservoir: { rain: 24, electric: 10 },
  stormFuel: { electric: 18, ice: 8 },
};

export const SKILL_TREE_BRANCHES: SkillTreeBranch[] = [
  { id: "vacuum", code: "VAC", name: "흡입 폭주", description: "구름 물량과 광역 연쇄를 폭발시킵니다.", color: "#55c7df", nodes: ["overclock", "intakeServo", "wideIntake", "pressureChamber", "massInduction", "blackHole", "eventHorizon", "vacuumMomentum", "denseRadar"] },
  { id: "fever", code: "GLD", name: "황금 피버", description: "가치와 피버 시간을 극한까지 끌어올립니다.", color: "#ffd15e", nodes: ["profitRain", "comboCapacitor", "feverDrive", "feverInjector", "stormCatalyst", "goldenStorm", "sunStorm", "jackpotPulse", "yieldBoost", "feverReserve"] },
  { id: "automation", code: "AUT", name: "자동 수확", description: "드론 편대와 연쇄 반응으로 자동 수확합니다.", color: "#79f0bd", nodes: ["twinDrone", "droneAI", "chainBurst", "relayBurst", "salvageProtocol", "droneFleet", "nanoSwarm", "swarmMatrix", "cargoBay"] },
  { id: "navigation", code: "NAV", name: "연료·항법", description: "새 고도의 연료 압박을 성장과 직접 수확으로 돌파합니다.", color: "#ffad72", nodes: ["auxTank", "aeroDrive", "ecoThrusters", "vacuumRecycler", "fuelCondenser", "comboGenerator", "recoveryReservoir", "stormFuel"] },
];

export const INFINITE_RESEARCH: Record<InfiniteResearchId, InfiniteResearchDefinition> = {
  speed: {
    id: "speed", code: "SPD", name: "초광속 추진 연구", icon: "»", color: "#6fdcff", baseCost: 140, costScale: 1.48,
    description: "비행 제어 알고리즘을 끝없이 개선해 최고 이동 속도를 높입니다.", effectPerLevel: "최고 속도 +2.5% / LEVEL",
  },
  power: {
    id: "power", code: "VAC", name: "무한 진공 압축", icon: "◎", color: "#8fffe4", baseCost: 160, costScale: 1.5,
    description: "흡입 터빈의 압력 한계를 반복 갱신해 모든 구름을 더 빠르게 터뜨립니다.", effectPerLevel: "흡입 출력 +4% / LEVEL",
  },
  fuel: {
    id: "fuel", code: "FUL", name: "차원 연료 저장고", icon: "▰", color: "#ffb36f", baseCost: 200, costScale: 1.52,
    description: "구름을 고밀도 연료 셀로 압축해 매 비행의 연료 총량을 늘립니다.", effectPerLevel: "연료 용량 +0.75 / LEVEL",
  },
  drone: {
    id: "drone", code: "DRN", name: "자율 편대 학습", icon: "◇", color: "#b69cff", baseCost: 190, costScale: 1.5,
    description: "수확 데이터를 편대 AI에 재학습시켜 모든 드론의 절단 출력을 높입니다.", effectPerLevel: "드론 출력 +4% / LEVEL",
  },
  yield: {
    id: "yield", code: "YLD", name: "초임계 가치 증폭", icon: "◈", color: "#fff36f", baseCost: 240, costScale: 1.54,
    description: "회수한 구름의 압축 순도를 무한히 높여 모든 화물의 가치를 증폭합니다.", effectPerLevel: "수확 가치 +3% / LEVEL",
  },
};

export function infiniteResearchCost(id: InfiniteResearchId, level: number): number {
  const research = INFINITE_RESEARCH[id];
  return Math.min(Number.MAX_SAFE_INTEGER, Math.round(research.baseCost * Math.pow(research.costScale, level)));
}

export const INITIAL_STATE = {
  money: 0,
  totalEarned: 0,
  harvested: 0,
  rank: 0,
  selectedMap: 0,
  rankHarvested: 0,
  rankFlights: 0,
  levels: { power: 0, radius: 0, value: 0, drone: 0, insulation: 0, conveyor: 0, processingLine: 0, hopper: 0, fuelTank: 0, fuelSaver: 0 },
  research: { logistics: 0, refining: 0, forecasting: 0 },
  bestCombo: 0,
  sound: true,
  materials: { cumulus: 0, rain: 0, electric: 0, ice: 0, solar: 0, aurora: 0 },
  processing: {
    jobs: [] as ProcessingJob[], completedCoins: 0, totalProcessed: 0, nextJobId: 1, lastUpdatedAt: Date.now(),
  },
  growthMission: { step: 0, safeReturns: 0, contractsSigned: 0, shipmentsClaimed: 0, rainHarvested: 0 },
  infiniteResearch: { speed: 0, power: 0, fuel: 0, drone: 0, yield: 0 },
  story: { seen: [] as StorySceneId[], rivalBeaten: false },
  career: {
    day: 1, level: 1, xp: 0, xpNext: 6, pendingPicks: 0,
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
  },
} as const;

export function upgradeCost(baseCost: number, level: number): number {
  return Math.round(baseCost * Math.pow(1.72, level));
}
