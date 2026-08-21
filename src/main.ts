import "./styles.css";
import { CLOUDS, FLIGHT_ROUTES, PROCESSING_CONTRACTS, PROCESSING_SECONDS, RANKS, RESEARCH_PROJECTS, RUN_SKILL_COSTS, RUN_SKILLS, SKILL_TREE_BRANCHES, UPGRADES, upgradeCost } from "./config";
import { CloudHarvestGame } from "./game";
import type { ContractId, GameState, ResearchId, RunSkillId, RunState, UpgradeId } from "./types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app 요소를 찾을 수 없습니다.");

app.innerHTML = `
  <main class="game-shell">
    <section class="game-stage">
      <canvas id="gameCanvas" tabindex="0" aria-label="구름 수확 게임 화면"></canvas>

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
          <div class="mini-stat cargo-stat"><span>▣</span><strong id="harvested">0</strong></div>
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

      <div class="tutorial" id="tutorial"><b>WASD 이동 · 마우스 조준</b><span>이동과 흡입은 연료를 소모합니다 · 0% 전에 RTB로 귀환</span></div>
      <div class="cloud-legend" id="cloudLegend"></div>
      <div class="toast" id="toast" aria-live="polite"></div>
      <div class="fuel-warning" id="fuelWarning">
        <small id="fuelWarningKicker">LOW FUEL</small>
        <strong>연료가 0이 되면 화물을 전부 버리고 비상 귀환합니다</strong>
        <span id="fuelWarningValue">연료 35%</span>
      </div>

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
            <span>PROCESSING BAY // CARGO ARRIVAL</span>
            <h2>구름을 어느 가공 라인에 맡길까요?</h2>
            <p>적재한 구름은 다음 비행 중에도 계속 가공되며, 완성품이 되어야 코인으로 출하할 수 있습니다.</p>
          </header>
          <div class="factory-manifest" id="factoryManifest"></div>
          <div class="contract-list" id="contractList"></div>
          <div class="factory-tip">등급이 높은 구름은 더 오래 걸립니다. 정비소에서 처리 속도·동시 라인·묶음 용량을 영구 강화할 수 있습니다.</div>
          <section class="factory-receipt" id="factoryReceipt">
            <span id="receiptKicker">FLIGHT 1/3 COMPLETE</span>
            <h3 id="receiptContract">가공 라인 적재 완료</h3>
            <strong id="receiptPayout">◈ 0</strong>
            <p id="receiptDescription">가공기는 다음 비행 중에도 멈추지 않습니다.</p>
            <section class="day-research" id="dayResearch">
              <small>DAY COMPLETE // PERMANENT RESEARCH</small>
              <h4>오늘의 연구 성과를 하나 선택하세요</h4>
              <div class="research-list" id="researchList"></div>
            </section>
          </section>
        </div>
      </section>

      <section class="processing-overlay" id="processingOverlay" aria-label="구름 가공 시설">
        <div class="processing-panel">
          <header class="processing-heading">
            <div><span>FACILITY 03 // CLOUD PROCESSING</span><h2>구름 가공동</h2><p>비행 중에도 자동으로 돌아가는 가공 라인을 관리하고 완성품을 출하합니다.</p></div>
            <button id="processingCloseButton" aria-label="가공동 닫기">×</button>
          </header>
          <div class="processing-overview"><span>FACTORY STATUS</span><strong id="processingSummary">1 LINE · 대기 없음</strong></div>
          <div class="processing-floor">
            <section class="processing-machine" aria-label="구름 응축 캡슐">
              <div class="processing-rail"><span><i></i> RAW CLOUD FEED</span><b>자동 응축 설비 가동 중</b><span>OUTPUT <i></i></span></div>
              <div class="processing-lanes" id="processingLanes"></div>
            </section>
            <aside class="processing-console">
              <div class="processing-console-head"><span>LINE CONTROL</span><i></i><i></i><i></i></div>
              <div class="processing-output" id="processingOutput"></div>
              <button class="processing-claim" id="claimProcessingButton" disabled><span>완성품 일괄 출하</span><strong id="claimProcessingValue">◈ 0</strong></button>
            </aside>
          </div>
          <div class="processing-facility-tip">정비소의 고속 컨베이어·병렬 응축 라인·대형 적재 호퍼로 공장 처리량을 확장할 수 있습니다.</div>
        </div>
      </section>

      <nav class="base-hub" id="baseHub" aria-label="구름 수확 기지 시설">
        <div class="base-hub-status"><small>DOCKING COMPLETE</small><strong id="baseHubStatus">화물 정산 완료 · 다음 작전을 준비하세요</strong></div>
        <button class="base-facility workshop" id="baseGarageButton"><b>MK · FACILITY 01</b><span>장비 정비소</span><small>영구 장비를 장착하고 강화합니다.</small><em>정비소 입장 →</em></button>
        <button class="base-facility blueprint" id="skillTreeButton"><b>TREE · FACILITY 02</b><span>특성 설계실</span><small>수확한 구름으로 시스템을 해금합니다.</small><em>특성 트리 열기 →</em></button>
        <button class="base-facility processing" id="processingFacilityButton"><b>PROC · FACILITY 03</b><span>구름 가공동</span><small>진행 중인 가공과 완성품을 관리합니다.</small><em>가공동 입장 →</em></button>
        <button class="base-facility launch" id="launchButton"><b>GO · FACILITY 04</b><span>출격 관제문</span><small>해금한 고도를 선택하고 다음 비행을 시작합니다.</small><em>출격지 선택 →</em></button>
      </nav>

      <section class="route-overlay" id="routeOverlay" aria-label="출격 고도 선택">
        <div class="route-panel">
          <header><span>NEXT SORTIE // ALTITUDE SELECT</span><h2>어느 하늘로 출격할까요?</h2><p>높은 고도일수록 연료가 빠르게 줄지만 희귀 구름과 수익 배율이 커집니다.</p></header>
          <div class="route-list" id="routeList"></div>
          <button class="route-back" id="routeBackButton">← 기지 격납고로 돌아가기</button>
        </div>
      </section>

      <section class="levelup-overlay" id="levelUpOverlay" aria-label="장기 성장 특성 트리">
        <div class="levelup-panel skill-tree-panel">
          <span class="levelup-kicker">CAREER SYSTEM BLUEPRINT // 42 NODE GRID</span>
          <h2 id="levelUpTitle">회사의 장기 성장 설계도</h2>
          <p id="levelUpDescription">연결된 노드를 따라 영구 유지되는 수확 장치를 조립하세요.</p>
          <div class="skill-point-bank"><span>CLOUD STOCKPILE</span><strong id="skillPointCount">☁ 0 · 🌧 0 · ⚡ 0 · ❄ 0 · ☀ 0 · ✦ 0</strong><small>상위 구름 1개는 바로 아래 단계 구름 4개 가치로 자동 대체됩니다.</small></div>
          <div class="skill-choices skill-tree-network-shell" id="skillChoices"></div>
          <button class="skill-tree-close" id="skillTreeCloseButton">기지로 돌아가기</button>
        </div>
      </section>
      <aside class="skill-hover-card" id="skillHoverCard" aria-hidden="true"></aside>
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
const fuelWarning = required<HTMLElement>("#fuelWarning");
const fuelWarningKicker = required<HTMLElement>("#fuelWarningKicker");
const fuelWarningValue = required<HTMLElement>("#fuelWarningValue");
const altitude = required<HTMLElement>("#altitude");
const rankName = required<HTMLElement>("#rankName");
const promotionTitle = required<HTMLElement>("#promotionTitle");
const promotionDescription = required<HTMLElement>("#promotionDescription");
const promotionRequirements = required<HTMLElement>("#promotionRequirements");
const promoteButton = required<HTMLButtonElement>("#promoteButton");
const upgradeList = required<HTMLElement>("#upgradeList");
const cloudLegend = required<HTMLElement>("#cloudLegend");
const toast = required<HTMLElement>("#toast");
const processingOverlay = required<HTMLElement>("#processingOverlay");
const processingSummary = required<HTMLElement>("#processingSummary");
const processingLanes = required<HTMLElement>("#processingLanes");
const processingOutput = required<HTMLElement>("#processingOutput");
const claimProcessingButton = required<HTMLButtonElement>("#claimProcessingButton");
const claimProcessingValue = required<HTMLElement>("#claimProcessingValue");
const processingCloseButton = required<HTMLButtonElement>("#processingCloseButton");
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
const skillHoverCard = required<HTMLElement>("#skillHoverCard");
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
const processingFacilityButton = required<HTMLButtonElement>("#processingFacilityButton");
const baseHub = required<HTMLElement>("#baseHub");
const baseHubStatus = required<HTMLElement>("#baseHubStatus");
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

const CLOUD_ORDER = Object.keys(CLOUDS) as (keyof GameState["materials"])[];
const CLOUD_CODES: Record<keyof GameState["materials"], string> = {
  cumulus: "CUM", rain: "RAN", electric: "ELC", ice: "ICE", solar: "SOL", aurora: "AUR",
};
let processingLayoutKey = "";
let processingOutputKey = "";

const game = new CloudHarvestGame(canvas, renderState, renderRunState, showLevelUp, showFactory, showToast);
if (import.meta.env.DEV) {
  (window as typeof window & { __cloudHarvestGame?: CloudHarvestGame }).__cloudHarvestGame = game;
}

const SKILL_NODE_LAYOUT: Record<RunSkillId, { x: number; y: number; branch: "vacuum" | "fever" | "automation" | "navigation" | "hybrid" }> = {
  overclock: { x: 40, y: 150, branch: "vacuum" },
  intakeServo: { x: 40, y: 320, branch: "vacuum" },
  wideIntake: { x: 40, y: 490, branch: "vacuum" },
  pressureChamber: { x: 40, y: 660, branch: "vacuum" },
  massInduction: { x: 40, y: 830, branch: "vacuum" },
  blackHole: { x: 40, y: 1000, branch: "vacuum" },
  eventHorizon: { x: 40, y: 1170, branch: "vacuum" },
  vacuumMomentum: { x: 40, y: 1340, branch: "vacuum" },
  denseRadar: { x: 40, y: 1510, branch: "vacuum" },
  profitRain: { x: 410, y: 150, branch: "fever" },
  comboCapacitor: { x: 410, y: 320, branch: "fever" },
  feverDrive: { x: 410, y: 490, branch: "fever" },
  feverInjector: { x: 410, y: 660, branch: "fever" },
  stormCatalyst: { x: 410, y: 830, branch: "fever" },
  goldenStorm: { x: 410, y: 1000, branch: "fever" },
  sunStorm: { x: 410, y: 1170, branch: "fever" },
  jackpotPulse: { x: 410, y: 1340, branch: "fever" },
  yieldBoost: { x: 285, y: 1510, branch: "fever" },
  feverReserve: { x: 535, y: 1510, branch: "fever" },
  twinDrone: { x: 780, y: 150, branch: "automation" },
  droneAI: { x: 780, y: 320, branch: "automation" },
  chainBurst: { x: 780, y: 490, branch: "automation" },
  relayBurst: { x: 780, y: 660, branch: "automation" },
  salvageProtocol: { x: 780, y: 830, branch: "automation" },
  droneFleet: { x: 780, y: 1000, branch: "automation" },
  nanoSwarm: { x: 780, y: 1170, branch: "automation" },
  swarmMatrix: { x: 780, y: 1340, branch: "automation" },
  cargoBay: { x: 780, y: 1510, branch: "automation" },
  auxTank: { x: 1150, y: 150, branch: "navigation" },
  aeroDrive: { x: 1150, y: 320, branch: "navigation" },
  ecoThrusters: { x: 1150, y: 490, branch: "navigation" },
  vacuumRecycler: { x: 1150, y: 660, branch: "navigation" },
  fuelCondenser: { x: 1150, y: 830, branch: "navigation" },
  comboGenerator: { x: 1150, y: 1000, branch: "navigation" },
  recoveryReservoir: { x: 1150, y: 1170, branch: "navigation" },
  stormFuel: { x: 1150, y: 1340, branch: "navigation" },
  cycloneCore: { x: 170, y: 1720, branch: "hybrid" },
  stormDrones: { x: 625, y: 1720, branch: "hybrid" },
  cascadeGrid: { x: 1080, y: 1720, branch: "hybrid" },
  goldenVacuum: { x: 170, y: 1900, branch: "hybrid" },
  cargoCyclone: { x: 625, y: 1900, branch: "hybrid" },
  chainReactor: { x: 1080, y: 1900, branch: "hybrid" },
};

function skillCostLabel(id: RunSkillId): string {
  const cost = RUN_SKILL_COSTS[id];
  return CLOUD_ORDER
    .filter((kind) => (cost[kind] ?? 0) > 0)
    .map((kind) => `${CLOUDS[kind].icon} ${cost[kind]}`)
    .join(" · ");
}

function canAffordSkill(id: RunSkillId, _state: { materials: GameState["materials"] }): boolean {
  const available = { ..._state.materials };
  const cost = RUN_SKILL_COSTS[id];
  for (let targetIndex = CLOUD_ORDER.length - 1; targetIndex >= 0; targetIndex -= 1) {
    const target = CLOUD_ORDER[targetIndex];
    let remaining = cost[target] ?? 0;
    for (let sourceIndex = targetIndex; sourceIndex < CLOUD_ORDER.length && remaining > 0; sourceIndex += 1) {
      const source = CLOUD_ORDER[sourceIndex];
      const exchangeValue = 4 ** (sourceIndex - targetIndex);
      const used = Math.min(available[source], Math.ceil(remaining / exchangeValue));
      available[source] -= used;
      remaining -= used * exchangeValue;
    }
    if (remaining > 0) return false;
  }
  return true;
}

function renderRunState(state: RunState): void {
  runLevel.textContent = `LV.${state.level}`;
  runLevel.classList.remove("ready");
  const treeCode = skillTreeButton.querySelector<HTMLElement>("b");
  const affordableSkill = (Object.keys(RUN_SKILLS) as RunSkillId[]).some((id) => {
    const requirementsMet = RUN_SKILLS[id].requirements?.every((requirement) => state.skills[requirement] >= 1) ?? true;
    return state.skills[id] < 1 && requirementsMet && canAffordSkill(id, state);
  });
  if (treeCode) treeCode.textContent = affordableSkill
    ? "TREE! · FACILITY 02"
    : "TREE · FACILITY 02";
  skillTreeButton.classList.toggle("ready", affordableSkill);
  xpFill.style.width = `${Math.min(100, state.xp / state.xpNext * 100)}%`;
  xpText.textContent = `${Math.floor(state.xp)} / ${state.xpNext}`;
  feverFill.style.width = `${Math.min(100, state.fever)}%`;
  feverText.textContent = state.feverActive ? `${Math.max(0, state.feverSeconds).toFixed(1)}s` : `${Math.floor(state.fever)}%`;
  dayFlight.textContent = `DAY ${state.day} · FLIGHT ${state.flight}/3`;
  document.body.classList.toggle("flight-two", state.flight === 2);
  document.body.classList.toggle("flight-three", state.flight === 3);
  altitude.textContent = RANKS[state.mapRank].altitude;
  routeName.textContent = RANKS[state.mapRank].name;
  combo.textContent = state.combo > 0 ? `×${state.combo}` : "—";
  combo.parentElement?.classList.toggle("active", state.combo >= 2);
  const cargoCount = (Object.values(state.cargo) as number[]).reduce((total, amount) => total + amount, 0);
  const fuelRatio = Math.max(0, Math.min(1, state.fuel / Math.max(1, state.fuelCapacity)));
  harvested.textContent = cargoCount.toLocaleString();
  cargoValue.textContent = `화물 ${cargoCount} · 연료 ${Math.ceil(fuelRatio * 100)}%`;
  returnButton.disabled = state.emergencyReturn;
  garageButton.disabled = cargoCount > 0;
  document.body.classList.toggle("fuel-low", fuelRatio <= .35);
  document.body.classList.toggle("fuel-critical", fuelRatio <= .15);
  const showFuelWarning = fuelRatio <= .35 && state.fuel > 0 && !state.emergencyReturn;
  fuelWarning.classList.toggle("show", showFuelWarning);
  fuelWarning.classList.toggle("critical", fuelRatio <= .15);
  fuelWarningKicker.textContent = fuelRatio <= .15 ? "FUEL CRITICAL // EMERGENCY RETURN" : "LOW FUEL // RETURN NOW";
  fuelWarningValue.textContent = `남은 연료 ${Math.ceil(state.fuel)} / ${Math.round(state.fuelCapacity)} · ${Math.ceil(fuelRatio * 100)}%`;
  document.body.classList.toggle("fever-active", state.feverActive);
  renderProcessing(state);
}

function processingTime(seconds: number): string {
  const rounded = Math.max(0, Math.ceil(seconds));
  if (rounded < 60) return `${rounded}초`;
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${minutes}분 ${remainder.toString().padStart(2, "0")}초`;
}

function renderProcessing(state: RunState): void {
  const jobs = state.processing.jobs;
  const active = jobs.slice(0, state.processingLines);
  const waiting = Math.max(0, jobs.length - active.length);
  const completed = Math.floor(state.processing.completedCoins);
  processingFacilityButton.classList.toggle("ready", completed > 0);
  const processingCode = processingFacilityButton.querySelector<HTMLElement>("b");
  if (processingCode) processingCode.textContent = completed > 0 ? "PROC! · FACILITY 03" : "PROC · FACILITY 03";
  processingSummary.textContent = `${state.processingLines} LINE · ${waiting > 0 ? `대기 ${waiting}묶음` : jobs.length > 0 ? "자동 가공 중" : "대기 없음"}`;
  const visibleLines = Math.max(3, state.processingLines);
  const lineEntries = Array.from({ length: visibleLines }, (_, index) => {
    const unlocked = index < state.processingLines;
    const job = active[index];
    const dominantKind = job ? CLOUD_ORDER.reduce((best, kind) => job.units[kind] > job.units[best] ? kind : best, CLOUD_ORDER[0]) : undefined;
    return { unlocked, job, dominantKind };
  });
  const nextLayoutKey = `${state.processingLines}|${lineEntries.map(({ unlocked, job, dominantKind }) => unlocked ? job ? `${job.id}:${dominantKind}` : "idle" : "locked").join("|")}`;
  if (processingLayoutKey !== nextLayoutKey) {
    processingLanes.innerHTML = lineEntries.map(({ unlocked, job, dominantKind }, index) => {
      if (!unlocked) return `<article class="processing-vat locked"><div class="vat-top"><span>LINE ${String(index + 1).padStart(2, "0")}</span><strong>LOCKED</strong></div><div class="vat-apparatus"><div class="vat-pipe"></div><div class="vat-glass"><div class="vat-lock">＋</div></div></div><div class="vat-meta"><b>병렬 라인 증설 대기</b><small>정비소에서 설비를 확장하세요</small></div></article>`;
      if (!job) return `<article class="processing-vat idle"><div class="vat-top"><span>LINE ${String(index + 1).padStart(2, "0")}</span><strong>STANDBY</strong></div><div class="vat-apparatus"><div class="vat-pipe"></div><div class="vat-glass"><div class="vat-scan"></div><div class="vat-idle-mark">☁</div></div></div><div class="vat-meta"><b>투입 대기</b><small>원재료 구름을 기다리는 중</small></div></article>`;
      const cloud = CLOUDS[dominantKind!];
      const progress = Math.min(100, job.progress / job.workRequired * 100);
      const remaining = (job.workRequired - job.progress) / state.processingSpeed;
      const units = CLOUD_ORDER.reduce((total, kind) => total + job.units[kind], 0);
      const contract = PROCESSING_CONTRACTS.find((item) => item.id === job.contractId);
      return `<article class="processing-vat active ${dominantKind}" style="--vat-progress:${progress}%">
        <div class="vat-top"><span>LINE ${String(index + 1).padStart(2, "0")}</span><strong>${processingTime(remaining)}</strong></div>
        <div class="vat-apparatus"><div class="vat-pipe"></div><div class="vat-glass"><div class="vat-fluid"></div><div class="vat-cloud"><span>${cloud.icon}</span><i></i><i></i><i></i></div><div class="vat-bubbles"><i></i><i></i><i></i><i></i></div><div class="vat-scan"></div></div></div>
        <div class="vat-meta"><b>${cloud.name} ${units} UNIT</b><small>${contract?.code ?? "PROC"} · ${Math.floor(progress)}% 응축</small><em><i style="width:${progress}%"></i></em></div>
      </article>`;
    }).join("");
    processingLayoutKey = nextLayoutKey;
  }
  active.forEach((job, index) => {
    const vat = processingLanes.children[index] as HTMLElement | undefined;
    if (!vat) return;
    const progress = Math.min(100, job.progress / job.workRequired * 100);
    const remaining = (job.workRequired - job.progress) / state.processingSpeed;
    vat.style.setProperty("--vat-progress", `${progress}%`);
    const timer = vat.querySelector<HTMLElement>(".vat-top strong");
    const detail = vat.querySelector<HTMLElement>(".vat-meta small");
    const progressFill = vat.querySelector<HTMLElement>(".vat-meta em i");
    if (timer) timer.textContent = processingTime(remaining);
    if (detail) detail.textContent = `${PROCESSING_CONTRACTS.find((item) => item.id === job.contractId)?.code ?? "PROC"} · ${Math.floor(progress)}% 응축`;
    if (progressFill) progressFill.style.width = `${progress}%`;
  });
  const nextOutputKey = `${waiting}|${completed}|${jobs.length > 0}`;
  if (processingOutputKey !== nextOutputKey) {
    processingOutput.innerHTML = `<div class="output-readout"><small>대기열</small><strong>${waiting}</strong><span>BATCH</span></div>
      <div class="output-window ${completed > 0 ? "ready" : ""}"><div class="output-canister"><i></i><b>${completed > 0 ? "◈" : "◇"}</b><span></span></div><strong>${completed > 0 ? "완제품 출하 준비" : jobs.length > 0 ? "제품 충전 중" : "완제품 대기"}</strong><small>${completed > 0 ? `◈ ${completed.toLocaleString()} 적재 완료` : "가공이 끝나면 이곳에 쌓입니다"}</small></div>`;
    processingOutputKey = nextOutputKey;
  }
  claimProcessingButton.disabled = completed <= 0;
  claimProcessingValue.textContent = `◈ ${completed.toLocaleString()}`;
}

function showFactory(state: RunState): void {
  document.body.classList.remove("returning");
  document.body.classList.add("base-open");
  factoryOverlay.scrollTop = 0;
  baseHub.classList.remove("show");
  factoryPanel.classList.remove("settled");
  factoryReceipt.classList.remove("show");
  if (state.emergencyReturn) {
    factoryOverlay.classList.remove("show");
    baseHubStatus.textContent = "비상 견인 완료 · 이번 비행의 화물 전량 폐기 · 연료 재충전 완료";
    baseHub.classList.add("show");
    return;
  }
  const cargoCount = (Object.values(state.cargo) as number[]).reduce((total, amount) => total + amount, 0);
  if (cargoCount <= 0) {
    factoryOverlay.classList.remove("show");
    baseHubStatus.textContent = "귀환 완료 · 수확 화물 없음 · 연료 재충전 완료";
    baseHub.classList.add("show");
    return;
  }
  factoryManifest.innerHTML = (Object.values(CLOUDS)).map((cloud) => `
    <div class="manifest-item ${cloud.kind}">
      <span>${CLOUD_CODES[cloud.kind]}</span>
      <b>${cloud.name}</b>
      <strong>${state.cargo[cloud.kind]} UNIT</strong>
      <small>기본 ◈${Math.floor(state.cargoValue[cloud.kind]).toLocaleString()} · 개당 ${PROCESSING_SECONDS[cloud.kind]}초</small>
    </div>
  `).join("") + `<div class="manifest-bonus"><span>FLIGHT BONUS</span><b>콤보·전선 운항 보너스</b><strong>+ ◈${Math.floor(state.cargoBonus).toLocaleString()}</strong></div>`;
  const availableContracts = PROCESSING_CONTRACTS.filter((_, index) => index < 3 || index <= game.getState().rank);
  const estimates = availableContracts.map((contract) => game.getProcessingEstimate(contract.id));
  const payouts = estimates.map((estimate) => estimate.payout);
  const bestPayout = Math.max(...payouts);
  const unlockedClouds = Object.values(CLOUDS).filter((cloud) => cloud.unlockRank <= game.getState().rank);
  contractList.innerHTML = availableContracts.map((contract) => {
    const estimate = game.getProcessingEstimate(contract.id);
    const payout = estimate.payout;
    return `<button class="contract-card ${payout === bestPayout ? "best" : ""}" data-contract="${contract.id}">
      <span class="contract-code">${contract.code}</span>
      ${payout === bestPayout ? `<em class="best-offer">BEST OFFER</em>` : ""}
      <span class="contract-copy"><b>${contract.name}</b><small>${contract.description}</small></span>
      <span class="contract-rates">${unlockedClouds.map((cloud) => `${cloud.icon} ×${contract.multipliers[cloud.kind].toFixed(2)}`).join(" · ")}</span>
      <span class="contract-process"><b>${estimate.batches}묶음</b><small>예상 ${processingTime(estimate.seconds)}</small></span>
      <strong class="contract-payout">예상 ◈ ${payout.toLocaleString()} · 가동 시작</strong>
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
  const roots = new Set<RunSkillId>(["overclock", "profitRain", "twinDrone", "auxTank"]);
  const center = { x: 740, y: 83 };
  const nodeCenter = (id: RunSkillId) => ({ x: SKILL_NODE_LAYOUT[id].x + 115, y: SKILL_NODE_LAYOUT[id].y + 75 });
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
       <svg class="skill-tree-links" viewBox="0 0 1480 2070" aria-hidden="true">${connectors}</svg>
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
        return `<button class="skill-node network-node ${skill.category} branch-${layout.branch} ${stack > 0 ? "invested" : ""} ${maxed ? "maxed" : ""} ${!unlocked ? "locked" : ""}" data-skill="${id}" style="--skill-color:${skill.color};left:${layout.x}px;top:${layout.y}px" ${available ? "" : "disabled"}>
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
    case "radius": return `${112 + level * 18}px · 유입 +${level * 3}`;
    case "value": return `판매 보너스 +${level * 24}%`;
    case "drone": return level === 0 ? "드론 미배치" : `지원 드론 ${level}대`;
    case "insulation": return level === 0 ? "보호 장치 없음" : `절연 출력 ${level}단계`;
    case "conveyor": return `가공 속도 +${level * 22}%`;
    case "processingLine": return `동시 가공 ${1 + level}라인`;
    case "hopper": return `묶음당 ${10 + level * 5}개`;
    case "fuelTank": return `탱크 연료 +${level * 4}`;
    case "fuelSaver": return `연료 소모 -${Math.min(68, Math.round(level * 4.25))}%`;
  }
}

function renderState(state: GameState): void {
  money.textContent = Math.floor(state.money).toLocaleString();
  altitude.textContent = RANKS[state.selectedMap].altitude;
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
        <span class="equipment-status"><b>PART ${String(index + 1).padStart(2, "0")}</b><em>${status}</em></span>
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
    const harvestDone = state.rankHarvested >= next.requiredHarvest;
    const flightDone = state.rankFlights >= 1;
    promotionRequirements.innerHTML = `
      <span class="${moneyDone ? "done" : ""}">◈ ${Math.floor(state.money).toLocaleString()} / ${next.promotionCost.toLocaleString()}</span>
      <span class="${harvestDone ? "done" : ""}">☁ 현 고도 납품 ${state.rankHarvested} / ${next.requiredHarvest}</span>
      <span class="${flightDone ? "done" : ""}">RTB 안전 귀환 ${state.rankFlights} / 1</span>
    `;
    promoteButton.disabled = !(moneyDone && harvestDone && flightDone);
    promoteButton.textContent = `${next.altitude} 항로 해금`;
  }
}

upgradeList.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-upgrade]");
  if (!button) return;
  game.buyUpgrade(button.dataset.upgrade as UpgradeId);
});

promoteButton.addEventListener("click", () => game.promote());
soundButton.addEventListener("click", () => game.toggleSound());
const openGarage = () => {
  document.body.classList.add("garage-open");
  garageOverlay.classList.add("show");
};
garageButton.addEventListener("click", openGarage);
const closeGarage = () => {
  document.body.classList.remove("garage-open");
  garageOverlay.classList.remove("show");
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
  const result = game.queueCargoForProcessing(button.dataset.contract as ContractId);
  if (result) {
    const contractName = button.querySelector(".contract-copy b")?.textContent ?? "가공 계약";
    receiptContract.textContent = `${contractName} 가동 시작`;
    receiptPayout.textContent = `예상 ◈ ${result.payout.toLocaleString()}`;
    baseHubStatus.textContent = `${result.batches}묶음 자동 가공 중 · 완성품 출하 대기`;
    const run = game.getRunState();
    const dayComplete = game.isDayComplete();
    const completedFlight = dayComplete ? 3 : run.flight - 1;
    receiptKicker.textContent = `DAY ${run.day} // FLIGHT ${completedFlight}/3 COMPLETE`;
    receiptDescription.textContent = dayComplete
      ? `${result.batches}묶음이 공장으로 이동했습니다. 연구를 고르는 동안에도 가공은 계속됩니다.`
      : `${result.batches}묶음 · 예상 ${processingTime(result.seconds)}. FLIGHT ${run.flight}/3 중에도 공장이 계속 돌아갑니다.`;
    dayResearch.classList.toggle("show", dayComplete);
    if (dayComplete) {
      factoryPanel.classList.add("settled");
      factoryReceipt.classList.add("show");
      const state = game.getState();
      researchList.innerHTML = Object.values(RESEARCH_PROJECTS).map((research) => `
        <button class="research-card" data-research="${research.id}" style="--research-color:${research.color}">
          <span>${research.code}</span><small>RESEARCH LV.${state.research[research.id]}</small>
          <strong>${research.name}</strong><p>${research.description}</p>
          <b>${research.effect}</b><em>회사 연구에 영구 적용</em>
        </button>
      `).join("");
    } else {
      factoryOverlay.classList.remove("show");
      baseHub.classList.add("show");
    }
  }
});
claimProcessingButton.addEventListener("click", () => game.claimProcessedCoins());
processingFacilityButton.addEventListener("click", () => processingOverlay.classList.add("show"));
processingCloseButton.addEventListener("click", () => processingOverlay.classList.remove("show"));
processingOverlay.addEventListener("click", (event) => {
  if (event.target === processingOverlay) processingOverlay.classList.remove("show");
});
researchList.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-research]");
  if (!button || !game.completeDay(button.dataset.research as ResearchId)) return;
  const run = game.getRunState();
  dayResearch.classList.remove("show");
  receiptKicker.textContent = `DAY ${run.day} READY // CAREER CONTINUES`;
  receiptDescription.textContent = "연구와 기존 스킬망이 모두 유지됩니다. 더 깊은 시스템을 연결할 시간입니다.";
  factoryOverlay.classList.remove("show");
  baseHubStatus.textContent = `DAY ${run.day} 연구 완료 · 모든 장기 성장 유지`;
  baseHub.classList.add("show");
});
baseGarageButton.addEventListener("click", () => {
  factoryOverlay.classList.remove("show");
  openGarage();
});
launchButton.addEventListener("click", () => {
  const company = game.getState();
  routeList.innerHTML = RANKS.map((map, mapRank) => {
    const locked = mapRank > company.rank;
    const clouds = (Object.keys(map.weights) as (keyof typeof map.weights)[])
      .filter((kind) => map.weights[kind] > 0)
      .map((kind) => `${CLOUDS[kind].icon}${Math.round(map.weights[kind] * 100)}%`)
      .join(" · ");
    const payout = map.valueMultiplier * FLIGHT_ROUTES[map.routeId].valueMultiplier;
    return `
    <button class="route-card map-${mapRank} ${locked ? "locked" : ""} ${company.selectedMap === mapRank ? "selected" : ""}" data-map="${mapRank}" style="--route-color:${map.color}" ${locked ? "disabled" : ""}>
      <span class="route-visual">${locked ? "🔒" : map.icon}</span>
      <span class="route-code">${map.code}</span>
      <small>${locked ? "LOCKED ALTITUDE" : mapRank === company.rank ? "FRONTIER MAP" : "UNLOCKED MAP"}</small>
      <strong>${map.name}</strong>
      <p>${map.description}</p>
      <b>연료 소모 ×${map.fuelDrain.toFixed(2)} · 수익 ×${payout.toFixed(2)}</b>
      <span class="route-clouds">${clouds}</span>
      <span class="route-identity">${map.identity}</span>
      <em>${locked ? `이전 고도 승급 필요` : company.selectedMap === mapRank ? "현재 선택 · 다시 출격" : "이 고도로 출격"}</em>
    </button>
  `;
  }).join("");
  routeOverlay.classList.add("show");
});
routeBackButton.addEventListener("click", () => routeOverlay.classList.remove("show"));
routeList.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-map]");
  if (!button || !game.launchFlight(Number(button.dataset.map))) return;
  routeOverlay.classList.remove("show");
  processingOverlay.classList.remove("show");
  baseHub.classList.remove("show");
  factoryOverlay.classList.remove("show");
  factoryPanel.classList.remove("settled");
  factoryReceipt.classList.remove("show");
  document.body.classList.remove("returning");
  document.body.classList.remove("base-open");
  document.body.classList.add("launching");
  window.setTimeout(() => document.body.classList.remove("launching"), 1850);
});
skillChoices.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-skill]");
  if (!button) return;
  skillChoices.querySelectorAll<HTMLButtonElement>("button").forEach((choice) => { choice.disabled = true; });
  game.chooseSkill(button.dataset.skill as RunSkillId);
  skillHoverCard.classList.remove("show");
});
const positionSkillHover = (event: PointerEvent) => {
  const rect = skillHoverCard.getBoundingClientRect();
  const left = Math.max(12, Math.min(window.innerWidth - rect.width - 12, event.clientX + 20));
  const top = Math.max(12, Math.min(window.innerHeight - rect.height - 12, event.clientY + 18));
  skillHoverCard.style.left = `${left}px`;
  skillHoverCard.style.top = `${top}px`;
};
skillChoices.addEventListener("pointerover", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-skill]");
  if (!button) return;
  const id = button.dataset.skill as RunSkillId;
  const skill = RUN_SKILLS[id];
  const requirement = skill.requirements?.map((requirementId) => RUN_SKILLS[requirementId].name).join(" + ") ?? "시작 노드";
  const tier = skill.category === "evolution" ? "BREAKTHROUGH" : skill.category === "overdrive" ? "ADVANCED SYSTEM" : skill.category === "synergy" ? "CROSS SYNERGY" : "SYSTEM";
  skillHoverCard.style.setProperty("--skill-color", skill.color);
  skillHoverCard.innerHTML = `<small>${tier}</small><strong>${skill.name}</strong><p>${skill.description}</p><b>비용 ${skillCostLabel(id)}</b><em>${requirement === "시작 노드" ? requirement : `선행: ${requirement}`}</em>`;
  skillHoverCard.classList.add("show");
  positionSkillHover(event);
});
skillChoices.addEventListener("pointermove", (event) => { if (skillHoverCard.classList.contains("show")) positionSkillHover(event); });
skillChoices.addEventListener("pointerout", (event) => {
  const from = (event.target as HTMLElement).closest("[data-skill]");
  const to = (event.relatedTarget as HTMLElement | null)?.closest?.("[data-skill]");
  if (from && from !== to) skillHoverCard.classList.remove("show");
});
skillTreeCloseButton.addEventListener("click", () => {
  game.closeSkillTree();
  levelUpOverlay.classList.remove("show");
  skillHoverCard.classList.remove("show");
});
skillTreeButton.addEventListener("click", () => game.openSkillTree());
resetButton.addEventListener("click", () => {
  if (window.confirm("현재 회사의 진행 상황을 지우고 처음부터 시작할까요?")) {
    document.body.classList.remove("base-open");
    processingOverlay.classList.remove("show");
    game.reset();
  }
});

window.addEventListener("beforeunload", () => game.destroy());
