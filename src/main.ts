import "./styles.css";
import { CLOUDS, FLIGHT_ROUTES, PROCESSING_CONTRACTS, RANKS, RESEARCH_PROJECTS, RUN_SKILL_COSTS, RUN_SKILLS, SKILL_TREE_BRANCHES, UPGRADES, upgradeCost } from "./config";
import { CloudHarvestGame } from "./game";
import type { ContractId, FlightRouteId, GameState, ResearchId, RunSkillId, RunState, UpgradeId } from "./types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app 요소를 찾을 수 없습니다.");

app.innerHTML = `
  <main class="game-shell">
    <section class="game-stage">
      <canvas id="gameCanvas" aria-label="구름 수확 게임 화면"></canvas>

      <header class="game-hud-top">
        <div class="brand">
          <div class="brand-mark">☁</div>
          <div><span>SKY HARVEST</span><h1>구름 수확</h1><small id="rankName">골목 기상소</small></div>
        </div>

        <div class="rank-chip">
          <small>현재 고도</small>
          <strong id="altitude">해발 120m</strong>
        </div>

        <div class="resource-hud">
          <div class="mini-stat coin-stat"><span>◈</span><strong id="money">0</strong></div>
          <div class="mini-stat cargo-stat"><span>▣</span><strong id="harvested">0/16</strong></div>
          <div class="mini-stat combo-stat"><span>COMBO</span><strong id="combo">0</strong></div>
          <button class="icon-button" id="soundButton" aria-label="소리 켜기 또는 끄기">🔊</button>
          <button class="icon-button reset-button" id="resetButton" aria-label="새 회사 시작">↻</button>
        </div>
      </header>

      <div class="run-meter">
        <span class="level-badge" id="runLevel">LV.1</span>
        <div class="meter-group xp-group"><small>FLIGHT XP</small><div class="meter-track"><i id="xpFill"></i></div><b id="xpText">0 / 6</b></div>
        <div class="meter-group fever-group"><small>SKY FEVER</small><div class="meter-track"><i id="feverFill"></i></div><b id="feverText">0%</b></div>
        <div class="route-status"><small id="dayFlight">DAY 1 · FLIGHT 1/3</small><b id="routeName">순풍 회랑</b></div>
      </div>

      <div class="tutorial" id="tutorial"><b>WASD 이동 · 마우스 조준</b><span>좌클릭 또는 Space로 흡입 · 터치는 누르고 이동</span></div>
      <div class="cloud-legend" id="cloudLegend"></div>
      <div class="toast" id="toast" aria-live="polite"></div>

      <aside class="promotion-card">
        <div class="promotion-icon">↥</div>
        <div class="promotion-copy">
          <span class="eyebrow">NEXT SKY</span>
          <strong id="promotionTitle">지역 하늘지사</strong>
          <p id="promotionDescription">비구름 발견!</p>
        </div>
        <div class="promotion-requirements" id="promotionRequirements"></div>
        <button class="promote-button" id="promoteButton">고도 승급</button>
      </aside>

      <button class="garage-button" id="garageButton"><span>MK</span><b>정비소</b><small>영구 강화</small></button>
      <button class="return-button" id="returnButton" disabled><span>RTB</span><b>기지 귀환</b><small id="cargoValue">예상 ◈0</small></button>

      <section class="garage-overlay" id="garageOverlay" aria-label="비행선 정비소">
        <div class="garage-panel">
          <header class="garage-heading">
            <div><span>SHIP WORKSHOP</span><h2>비행선 정비소</h2><p>수확한 코인으로 다음 비행까지 이어지는 영구 장비를 강화하세요.</p></div>
            <button id="garageCloseButton" aria-label="정비소 닫기">×</button>
          </header>
          <div class="upgrade-list" id="upgradeList"></div>
          <div class="garage-tip">NOTE // 정비소 장비와 장기 스킬트리는 날짜가 바뀌어도 모두 유지됩니다.</div>
        </div>
      </section>

      <section class="factory-overlay" id="factoryOverlay" aria-label="구름 가공 공장">
        <div class="factory-panel">
          <header class="factory-heading">
            <span>PROCESSING BAY // FLIGHT COMPLETE</span>
            <h2>구름 가공 계약을 선택하세요</h2>
            <p>화물 구성에 맞는 납품처를 고르면 코인이 정산되고 다음 비행이 시작됩니다.</p>
          </header>
          <div class="factory-manifest" id="factoryManifest"></div>
          <div class="contract-list" id="contractList"></div>
          <div class="factory-tip">계약마다 구름 종류별 단가가 다릅니다. 현재 화물에서 가장 높은 정산액을 비교하세요.</div>
          <section class="factory-receipt" id="factoryReceipt">
            <span id="receiptKicker">FLIGHT 1/3 COMPLETE</span>
            <h3 id="receiptContract">납품 완료</h3>
            <strong id="receiptPayout">◈ 0</strong>
            <p id="receiptDescription">레벨과 장비를 유지한 채 다음 비행으로 이어집니다.</p>
            <section class="day-research" id="dayResearch">
              <small>DAY COMPLETE // PERMANENT RESEARCH</small>
              <h4>오늘의 연구 성과를 하나 선택하세요</h4>
              <div class="research-list" id="researchList"></div>
            </section>
            <div class="base-actions">
              <button id="baseGarageButton"><b>MK</b><span>정비소 방문</span></button>
              <button id="skillTreeButton"><b>TREE</b><span>특성 트리</span></button>
              <button class="launch-button" id="launchButton"><b>TAKE OFF</b><span>다음 비행 출격</span></button>
            </div>
          </section>
        </div>
      </section>

      <section class="route-overlay" id="routeOverlay" aria-label="오늘의 비행 항로 선택">
        <div class="route-panel">
          <header><span>NEXT SORTIE // ROUTE SELECT</span><h2>오늘의 항로를 선택하세요</h2><p>항로마다 이번 비행의 위험도와 수익 구조가 달라집니다.</p></header>
          <div class="route-list" id="routeList"></div>
          <button class="route-back" id="routeBackButton">← 정산 결과로 돌아가기</button>
        </div>
      </section>

      <section class="levelup-overlay" id="levelUpOverlay" aria-label="장기 성장 특성 트리">
        <div class="levelup-panel skill-tree-panel">
          <span class="levelup-kicker">CAREER SYSTEM BLUEPRINT // 34 NODE GRID</span>
          <h2 id="levelUpTitle">회사의 장기 성장 설계도</h2>
          <p id="levelUpDescription">연결된 노드를 따라 영구 유지되는 수확 장치를 조립하세요.</p>
          <div class="skill-point-bank"><span>CLOUD STOCKPILE</span><strong id="skillPointCount">☁ 0 · 🌧 0 · ⚡ 0 · ❄ 0 · ☀ 0 · ✦ 0</strong><small>정산한 구름을 보관하고 노드 해금에 직접 사용합니다.</small></div>
          <div class="skill-choices skill-tree-network-shell" id="skillChoices"></div>
          <button class="skill-tree-close" id="skillTreeCloseButton">기지로 돌아가기</button>
        </div>
      </section>
    </section>
  </main>
`;

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`${selector} 요소를 찾을 수 없습니다.`);
  return element;
}

const canvas = required<HTMLCanvasElement>("#gameCanvas");
const money = required<HTMLElement>("#money");
const harvested = required<HTMLElement>("#harvested");
const combo = required<HTMLElement>("#combo");
const altitude = required<HTMLElement>("#altitude");
const rankName = required<HTMLElement>("#rankName");
const promotionTitle = required<HTMLElement>("#promotionTitle");
const promotionDescription = required<HTMLElement>("#promotionDescription");
const promotionRequirements = required<HTMLElement>("#promotionRequirements");
const promoteButton = required<HTMLButtonElement>("#promoteButton");
const upgradeList = required<HTMLElement>("#upgradeList");
const cloudLegend = required<HTMLElement>("#cloudLegend");
const toast = required<HTMLElement>("#toast");
const soundButton = required<HTMLButtonElement>("#soundButton");
const resetButton = required<HTMLButtonElement>("#resetButton");
const tutorial = required<HTMLElement>("#tutorial");
const runLevel = required<HTMLElement>("#runLevel");
const xpFill = required<HTMLElement>("#xpFill");
const xpText = required<HTMLElement>("#xpText");
const feverFill = required<HTMLElement>("#feverFill");
const feverText = required<HTMLElement>("#feverText");
const routeName = required<HTMLElement>("#routeName");
const dayFlight = required<HTMLElement>("#dayFlight");
const levelUpOverlay = required<HTMLElement>("#levelUpOverlay");
const skillChoices = required<HTMLElement>("#skillChoices");
const levelUpTitle = required<HTMLElement>("#levelUpTitle");
const levelUpDescription = required<HTMLElement>("#levelUpDescription");
const skillPointCount = required<HTMLElement>("#skillPointCount");
const skillTreeCloseButton = required<HTMLButtonElement>("#skillTreeCloseButton");
const garageButton = required<HTMLButtonElement>("#garageButton");
const garageOverlay = required<HTMLElement>("#garageOverlay");
const garageCloseButton = required<HTMLButtonElement>("#garageCloseButton");
const returnButton = required<HTMLButtonElement>("#returnButton");
const cargoValue = required<HTMLElement>("#cargoValue");
const factoryOverlay = required<HTMLElement>("#factoryOverlay");
const factoryManifest = required<HTMLElement>("#factoryManifest");
const contractList = required<HTMLElement>("#contractList");
const factoryPanel = required<HTMLElement>(".factory-panel");
const factoryReceipt = required<HTMLElement>("#factoryReceipt");
const receiptContract = required<HTMLElement>("#receiptContract");
const receiptPayout = required<HTMLElement>("#receiptPayout");
const receiptKicker = required<HTMLElement>("#receiptKicker");
const receiptDescription = required<HTMLElement>("#receiptDescription");
const dayResearch = required<HTMLElement>("#dayResearch");
const researchList = required<HTMLElement>("#researchList");
const baseGarageButton = required<HTMLButtonElement>("#baseGarageButton");
const launchButton = required<HTMLButtonElement>("#launchButton");
const skillTreeButton = required<HTMLButtonElement>("#skillTreeButton");
const routeOverlay = required<HTMLElement>("#routeOverlay");
const routeList = required<HTMLElement>("#routeList");
const routeBackButton = required<HTMLButtonElement>("#routeBackButton");

let toastTimer = 0;
const showToast = (message: string, tone: "normal" | "success" | "warning" = "normal") => {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast show ${tone}`;
  toastTimer = window.setTimeout(() => { toast.className = "toast"; }, 2200);
};

const game = new CloudHarvestGame(canvas, renderState, renderRunState, showLevelUp, showFactory, showToast);
if (import.meta.env.DEV) {
  (window as typeof window & { __cloudHarvestGame?: CloudHarvestGame }).__cloudHarvestGame = game;
}

const SKILL_NODE_LAYOUT: Record<RunSkillId, { x: number; y: number; branch: "vacuum" | "fever" | "automation" | "hybrid" }> = {
  overclock: { x: 50, y: 150, branch: "vacuum" },
  intakeServo: { x: 50, y: 320, branch: "vacuum" },
  wideIntake: { x: 50, y: 490, branch: "vacuum" },
  pressureChamber: { x: 50, y: 660, branch: "vacuum" },
  massInduction: { x: 50, y: 830, branch: "vacuum" },
  blackHole: { x: 50, y: 1000, branch: "vacuum" },
  eventHorizon: { x: 50, y: 1170, branch: "vacuum" },
  vacuumMomentum: { x: 50, y: 1340, branch: "vacuum" },
  denseRadar: { x: 50, y: 1510, branch: "vacuum" },
  profitRain: { x: 445, y: 150, branch: "fever" },
  comboCapacitor: { x: 445, y: 320, branch: "fever" },
  feverDrive: { x: 445, y: 490, branch: "fever" },
  feverInjector: { x: 445, y: 660, branch: "fever" },
  stormCatalyst: { x: 445, y: 830, branch: "fever" },
  goldenStorm: { x: 445, y: 1000, branch: "fever" },
  sunStorm: { x: 445, y: 1170, branch: "fever" },
  jackpotPulse: { x: 445, y: 1340, branch: "fever" },
  yieldBoost: { x: 340, y: 1510, branch: "fever" },
  feverReserve: { x: 550, y: 1510, branch: "fever" },
  twinDrone: { x: 840, y: 150, branch: "automation" },
  droneAI: { x: 840, y: 320, branch: "automation" },
  chainBurst: { x: 840, y: 490, branch: "automation" },
  relayBurst: { x: 840, y: 660, branch: "automation" },
  salvageProtocol: { x: 840, y: 830, branch: "automation" },
  droneFleet: { x: 840, y: 1000, branch: "automation" },
  nanoSwarm: { x: 840, y: 1170, branch: "automation" },
  swarmMatrix: { x: 840, y: 1340, branch: "automation" },
  cargoBay: { x: 840, y: 1510, branch: "automation" },
  cycloneCore: { x: 150, y: 1720, branch: "hybrid" },
  stormDrones: { x: 445, y: 1720, branch: "hybrid" },
  cascadeGrid: { x: 740, y: 1720, branch: "hybrid" },
  goldenVacuum: { x: 150, y: 1900, branch: "hybrid" },
  cargoCyclone: { x: 445, y: 1900, branch: "hybrid" },
  chainReactor: { x: 740, y: 1900, branch: "hybrid" },
};

const CLOUD_ORDER = Object.keys(CLOUDS) as (keyof GameState["materials"])[];
const CLOUD_CODES: Record<keyof GameState["materials"], string> = {
  cumulus: "CUM", rain: "RAN", electric: "ELC", ice: "ICE", solar: "SOL", aurora: "AUR",
};

function skillCostLabel(id: RunSkillId): string {
  const cost = RUN_SKILL_COSTS[id];
  return CLOUD_ORDER
    .filter((kind) => (cost[kind] ?? 0) > 0)
    .map((kind) => `${CLOUDS[kind].icon} ${cost[kind]}`)
    .join(" · ");
}

function canAffordSkill(id: RunSkillId, state: { materials: GameState["materials"] }): boolean {
  return (Object.entries(RUN_SKILL_COSTS[id]) as [keyof GameState["materials"], number][])
    .every(([kind, amount]) => state.materials[kind] >= amount);
}

function renderRunState(state: RunState): void {
  runLevel.textContent = `LV.${state.level}`;
  runLevel.classList.remove("ready");
  const treeCode = skillTreeButton.querySelector<HTMLElement>("b");
  const affordableSkill = (Object.keys(RUN_SKILLS) as RunSkillId[]).some((id) => {
    const requirementsMet = RUN_SKILLS[id].requirements?.every((requirement) => state.skills[requirement] >= 1) ?? true;
    return state.skills[id] < 1 && requirementsMet && canAffordSkill(id, state);
  });
  if (treeCode) treeCode.textContent = affordableSkill ? "TREE!" : "TREE";
  skillTreeButton.classList.toggle("ready", affordableSkill);
  xpFill.style.width = `${Math.min(100, state.xp / state.xpNext * 100)}%`;
  xpText.textContent = `${Math.floor(state.xp)} / ${state.xpNext}`;
  feverFill.style.width = `${Math.min(100, state.fever)}%`;
  feverText.textContent = state.feverActive ? `${Math.max(0, state.feverSeconds).toFixed(1)}s` : `${Math.floor(state.fever)}%`;
  dayFlight.textContent = `DAY ${state.day} · FLIGHT ${state.flight}/3`;
  document.body.classList.toggle("flight-two", state.flight === 2);
  document.body.classList.toggle("flight-three", state.flight === 3);
  routeName.textContent = FLIGHT_ROUTES[state.routeId].name;
  combo.textContent = state.combo > 0 ? `×${state.combo}` : "—";
  combo.parentElement?.classList.toggle("active", state.combo >= 2);
  const cargoCount = (Object.values(state.cargo) as number[]).reduce((total, amount) => total + amount, 0);
  const estimatedValue = (Object.values(state.cargoValue) as number[]).reduce((total, amount) => total + amount, state.cargoBonus);
  harvested.textContent = `${cargoCount}/${state.cargoCapacity}`;
  cargoValue.textContent = `예상 ◈${Math.floor(estimatedValue).toLocaleString()}`;
  returnButton.disabled = cargoCount <= 0;
  garageButton.disabled = cargoCount > 0;
  returnButton.classList.toggle("full", cargoCount >= state.cargoCapacity);
  document.body.classList.toggle("fever-active", state.feverActive);
}

function showFactory(state: RunState): void {
  document.body.classList.remove("returning");
  factoryPanel.classList.remove("settled");
  factoryReceipt.classList.remove("show");
  factoryManifest.innerHTML = (Object.values(CLOUDS)).map((cloud) => `
    <div class="manifest-item ${cloud.kind}">
      <span>${CLOUD_CODES[cloud.kind]}</span>
      <b>${cloud.name}</b>
      <strong>${state.cargo[cloud.kind]} UNIT</strong>
      <small>기본 ◈${Math.floor(state.cargoValue[cloud.kind]).toLocaleString()}</small>
    </div>
  `).join("") + `<div class="manifest-bonus"><span>FLIGHT BONUS</span><b>콤보·전선 운항 보너스</b><strong>+ ◈${Math.floor(state.cargoBonus).toLocaleString()}</strong></div>`;
  const availableContracts = PROCESSING_CONTRACTS.filter((_, index) => index < 3 || index <= game.getState().rank);
  const payouts = availableContracts.map((contract) => game.getContractPayout(contract.id));
  const bestPayout = Math.max(...payouts);
  const unlockedClouds = Object.values(CLOUDS).filter((cloud) => cloud.unlockRank <= game.getState().rank);
  contractList.innerHTML = availableContracts.map((contract) => {
    const payout = game.getContractPayout(contract.id);
    return `<button class="contract-card ${payout === bestPayout ? "best" : ""}" data-contract="${contract.id}">
      <span class="contract-code">${contract.code}</span>
      ${payout === bestPayout ? `<em class="best-offer">BEST OFFER</em>` : ""}
      <span class="contract-copy"><b>${contract.name}</b><small>${contract.description}</small></span>
      <span class="contract-rates">${unlockedClouds.map((cloud) => `${cloud.icon} ×${contract.multipliers[cloud.kind].toFixed(2)}`).join(" · ")}</span>
      <strong class="contract-payout">◈ ${payout.toLocaleString()} 정산</strong>
    </button>`;
  }).join("");
  factoryOverlay.classList.add("show");
}

function showLevelUp(_pendingPicks: number): void {
  const state = game.getRunState();
  const companyState = game.getState();
  const stock = companyState.materials;
  const totalStock = (Object.values(stock) as number[]).reduce((total, amount) => total + amount, 0);
  skillPointCount.textContent = CLOUD_ORDER.map((kind) => `${CLOUDS[kind].icon} ${stock[kind]}`).join(" · ");
  levelUpTitle.textContent = "보관한 구름으로 시스템을 해금하세요";
  levelUpDescription.textContent = "고도가 오를수록 빙정·태양·오로라구름이 열리고, 새로운 구름은 더 깊은 시스템의 재료가 됩니다.";
  skillTreeCloseButton.textContent = "기지로 돌아가기";
  const roots = new Set<RunSkillId>(["overclock", "profitRain", "twinDrone"]);
  const center = { x: 540, y: 83 };
  const nodeCenter = (id: RunSkillId) => ({ x: SKILL_NODE_LAYOUT[id].x + 95, y: SKILL_NODE_LAYOUT[id].y + 65 });
  const connectors = (Object.keys(SKILL_NODE_LAYOUT) as RunSkillId[]).flatMap((id) => {
    const skill = RUN_SKILLS[id];
    const target = nodeCenter(id);
    const sources = roots.has(id) ? [center] : (skill.requirements ?? []).map(nodeCenter);
    const active = roots.has(id) || (skill.requirements?.every((requirement) => state.skills[requirement] >= 1) ?? false);
    return sources.map((source) => `<line class="skill-link ${active ? "active" : ""}" x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" style="--link-color:${skill.color}" />`);
  }).join("");
  const investedNodes = (Object.keys(state.skills) as RunSkillId[]).filter((id) => state.skills[id] > 0).length;
  skillChoices.innerHTML = `
    <div class="skill-tree-legend">
      ${SKILL_TREE_BRANCHES.map((branch) => `<span style="--branch-color:${branch.color}"><b>${branch.code}</b><em>${branch.name}</em></span>`).join("")}
      <strong>${investedNodes} / ${Object.keys(SKILL_NODE_LAYOUT).length} SYSTEMS ONLINE</strong>
    </div>
    <div class="skill-tree-scroll-hint">SCROLL BLUEPRINT · CONNECT ADJACENT SYSTEMS</div>
    <div class="skill-tree-network">
      <div class="skill-tree-grid-glow"></div>
      <svg class="skill-tree-links" viewBox="0 0 1080 2070" aria-hidden="true">${connectors}</svg>
      <div class="skill-tree-core"><small>CAREER CLOUD RESERVE</small><strong>${totalStock}</strong><span>CLOUDS</span></div>
      ${(Object.keys(SKILL_NODE_LAYOUT) as RunSkillId[]).map((id) => {
        const skill = RUN_SKILLS[id];
        const layout = SKILL_NODE_LAYOUT[id];
        const stack = state.skills[id];
        const maxed = stack >= 1;
        const unlocked = skill.requirements?.every((requirement) => state.skills[requirement] >= 1) ?? true;
        const available = game.canChooseSkill(id);
        const requirement = skill.requirements?.map((requirementId) => RUN_SKILLS[requirementId].name).join(" + ") ?? "중앙 코어";
        const tier = skill.category === "evolution" ? "BREAKTHROUGH" : skill.category === "overdrive" ? "ADVANCED SYSTEM" : skill.category === "synergy" ? "CROSS SYNERGY" : "SYSTEM";
        const action = maxed ? "UNLOCKED" : !unlocked ? `${requirement} 필요` : !canAffordSkill(id, companyState) ? `${skillCostLabel(id)} 필요` : `${skillCostLabel(id)}로 해금`;
        const pips = `<i class="${maxed ? "on" : ""}"></i>`;
        return `<button class="skill-node network-node ${skill.category} branch-${layout.branch} ${stack > 0 ? "invested" : ""} ${maxed ? "maxed" : ""} ${!unlocked ? "locked" : ""}" data-skill="${id}" style="--skill-color:${skill.color};left:${layout.x}px;top:${layout.y}px" ${available ? "" : "disabled"} title="${skill.description}">
          <span class="skill-node-icon" data-icon="${skill.icon}">${skill.icon}</span>
          <span class="skill-node-copy"><small>${tier}</small><strong>${skill.name}</strong><p>${skill.description}</p></span>
          <span class="skill-node-pips">${pips}</span><b>${action}</b>
        </button>`;
      }).join("")}
    </div>`;
  levelUpOverlay.classList.add("show");
}

function equipmentEffect(id: UpgradeId, level: number): string {
  switch (id) {
    case "power": return `흡입력 ${36 + level * 15}`;
    case "radius": return `흡입 ${112 + level * 18}px · 구름 +${level * 3}`;
    case "value": return `판매 보너스 +${level * 24}%`;
    case "drone": return level === 0 ? "드론 미배치" : `지원 드론 ${level}대`;
    case "insulation": return level === 0 ? "보호 장치 없음" : `절연 출력 ${level}단계`;
  }
}

function renderState(state: GameState): void {
  money.textContent = Math.floor(state.money).toLocaleString();
  altitude.textContent = RANKS[state.rank].altitude;
  rankName.textContent = RANKS[state.rank].name;
  soundButton.textContent = state.sound ? "🔊" : "🔇";
  if (state.harvested > 2) tutorial.classList.add("hidden");

  cloudLegend.innerHTML = (Object.values(CLOUDS))
    .filter((cloud) => cloud.unlockRank <= state.rank)
    .map((cloud) => `<span class="legend-item ${cloud.kind}">${cloud.icon} ${cloud.name}<b>${cloud.value}+</b></span>`)
    .join("");

  upgradeList.innerHTML = UPGRADES.map((upgrade, index) => {
    const level = state.levels[upgrade.id];
    const maxed = level >= upgrade.maxLevel;
    const cost = upgradeCost(upgrade.baseCost, level);
    const locked = upgrade.id === "insulation" && state.rank < 2;
    const disabled = maxed || locked || state.money < cost;
    const status = locked ? "LOCKED" : maxed ? "MASTERED" : level > 0 ? "EQUIPPED" : "NEW PART";
    const action = locked ? "전국 등급 필요" : maxed ? "강화 완료" : state.money < cost ? "코인 부족" : "장비 강화";
    const tierPips = Array.from({ length: upgrade.maxLevel }, (_, tier) =>
      `<i class="${tier < level ? "filled" : tier === level && !maxed ? "next" : ""}"></i>`
    ).join("");
    return `
      <button class="equipment-slot ${locked ? "locked" : ""}" style="--part-index:${index}" data-upgrade="${upgrade.id}" ${disabled ? "disabled" : ""}>
        <span class="equipment-status"><b>PART 0${index + 1}</b><em>${status}</em></span>
        <span class="equipment-visual"><i>${upgrade.icon}</i><small>LV.${level}</small></span>
        <span class="equipment-info"><strong>${upgrade.name}</strong><small>${upgrade.description}</small></span>
        <span class="equipment-output">
          <small>현재 성능</small><b>${equipmentEffect(upgrade.id, level)}</b>
          ${maxed ? "" : `<span>→ ${equipmentEffect(upgrade.id, level + 1)}</span>`}
        </span>
        <span class="equipment-tiers">${tierPips}</span>
        <span class="equipment-action"><b>${maxed || locked ? "" : `◈ ${cost.toLocaleString()}`}</b><strong>${action}</strong></span>
      </button>
    `;
  }).join("");

  const next = RANKS[state.rank + 1];
  if (!next) {
    promotionTitle.textContent = "전리층 산업권 달성";
    promotionDescription.textContent = "고도 승급은 완료됐지만 장비·연구·스킬 성장은 계속됩니다.";
    promotionRequirements.innerHTML = `<span class="done">✓ 최고 항로 개방 · 무한 성장 진행 중</span>`;
    promoteButton.textContent = "장기 성장 계속";
    promoteButton.disabled = true;
  } else {
    promotionTitle.textContent = next.name;
    promotionDescription.textContent = next.description;
    const moneyDone = state.money >= next.promotionCost;
    const harvestDone = state.harvested >= next.requiredHarvest;
    promotionRequirements.innerHTML = `
      <span class="${moneyDone ? "done" : ""}">◈ ${Math.floor(state.money).toLocaleString()} / ${next.promotionCost.toLocaleString()}</span>
      <span class="${harvestDone ? "done" : ""}">☁ ${state.harvested} / ${next.requiredHarvest}</span>
    `;
    promoteButton.disabled = !(state.money >= next.promotionCost && state.harvested >= next.requiredHarvest);
    promoteButton.textContent = `${next.altitude} 승급`;
  }
}

upgradeList.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-upgrade]");
  if (!button) return;
  game.buyUpgrade(button.dataset.upgrade as UpgradeId);
});

promoteButton.addEventListener("click", () => game.promote());
soundButton.addEventListener("click", () => game.toggleSound());
garageButton.addEventListener("click", () => garageOverlay.classList.add("show"));
const closeGarage = () => {
  garageOverlay.classList.remove("show");
  if (game.isAtFactory() && factoryPanel.classList.contains("settled")) factoryOverlay.classList.add("show");
};
garageCloseButton.addEventListener("click", closeGarage);
garageOverlay.addEventListener("click", (event) => {
  if (event.target === garageOverlay) closeGarage();
});
returnButton.addEventListener("click", () => {
  if (!game.requestReturn()) return;
  document.body.classList.add("returning");
  returnButton.disabled = true;
});
contractList.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-contract]");
  if (!button) return;
  const payout = game.settleCargo(button.dataset.contract as ContractId);
  if (payout > 0) {
    factoryPanel.classList.add("settled");
    factoryReceipt.classList.add("show");
    receiptContract.textContent = `${button.querySelector(".contract-copy b")?.textContent ?? "가공 계약"} 납품 완료`;
    receiptPayout.textContent = `◈ ${payout.toLocaleString()}`;
    const run = game.getRunState();
    const dayComplete = game.isDayComplete();
    const completedFlight = dayComplete ? 3 : run.flight - 1;
    receiptKicker.textContent = `DAY ${run.day} // FLIGHT ${completedFlight}/3 COMPLETE`;
    receiptDescription.textContent = dayComplete
      ? "세 번의 출격을 마쳤습니다. 연구를 선택해도 레벨·구름 재고·스킬망은 그대로 다음 날까지 이어집니다."
      : `레벨 ${run.level}과 선택한 장비를 유지한 채 FLIGHT ${run.flight}/3으로 이어집니다.`;
    dayResearch.classList.toggle("show", dayComplete);
    baseGarageButton.disabled = dayComplete;
    launchButton.disabled = dayComplete;
    if (dayComplete) {
      const state = game.getState();
      researchList.innerHTML = Object.values(RESEARCH_PROJECTS).map((research) => `
        <button class="research-card" data-research="${research.id}" style="--research-color:${research.color}">
          <span>${research.code}</span><small>RESEARCH LV.${state.research[research.id]}</small>
          <strong>${research.name}</strong><p>${research.description}</p>
          <b>${research.effect}</b><em>회사 연구에 영구 적용</em>
        </button>
      `).join("");
    }
  }
});
researchList.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-research]");
  if (!button || !game.completeDay(button.dataset.research as ResearchId)) return;
  const run = game.getRunState();
  dayResearch.classList.remove("show");
  baseGarageButton.disabled = false;
  launchButton.disabled = false;
  receiptKicker.textContent = `DAY ${run.day} READY // CAREER CONTINUES`;
  receiptDescription.textContent = "연구와 기존 스킬망이 모두 유지됩니다. 더 깊은 시스템을 연결할 시간입니다.";
});
baseGarageButton.addEventListener("click", () => {
  factoryOverlay.classList.remove("show");
  garageOverlay.classList.add("show");
});
launchButton.addEventListener("click", () => {
  routeList.innerHTML = Object.values(FLIGHT_ROUTES).map((route) => `
    <button class="route-card" data-route="${route.id}" style="--route-color:${route.color}">
      <span class="route-code">${route.code}</span>
      <small>FLIGHT PLAN</small>
      <strong>${route.name}</strong>
      <p>${route.description}</p>
      <b>${route.effect}</b>
      <em>이 항로로 출격</em>
    </button>
  `).join("");
  routeOverlay.classList.add("show");
});
routeBackButton.addEventListener("click", () => routeOverlay.classList.remove("show"));
routeList.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-route]");
  if (!button || !game.launchFlight(button.dataset.route as FlightRouteId)) return;
  routeOverlay.classList.remove("show");
  factoryOverlay.classList.remove("show");
  factoryPanel.classList.remove("settled");
  factoryReceipt.classList.remove("show");
  document.body.classList.remove("returning");
  document.body.classList.add("launching");
  window.setTimeout(() => document.body.classList.remove("launching"), 1850);
});
skillChoices.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-skill]");
  if (!button) return;
  skillChoices.querySelectorAll<HTMLButtonElement>("button").forEach((choice) => { choice.disabled = true; });
  game.chooseSkill(button.dataset.skill as RunSkillId);
});
skillTreeCloseButton.addEventListener("click", () => {
  game.closeSkillTree();
  levelUpOverlay.classList.remove("show");
});
skillTreeButton.addEventListener("click", () => game.openSkillTree());
resetButton.addEventListener("click", () => {
  if (window.confirm("현재 회사의 진행 상황을 지우고 처음부터 시작할까요?")) game.reset();
});

window.addEventListener("beforeunload", () => game.destroy());
