import "./styles.css";
import { CLOUDS, PROCESSING_CONTRACTS, RANKS, RUN_SKILLS, UPGRADES, upgradeCost } from "./config";
import { CloudHarvestGame } from "./game";
import type { ContractId, GameState, RunSkillId, RunState, UpgradeId } from "./types";

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
      </div>

      <div class="tutorial" id="tutorial"><b>구름 가까이에서 누르고 유지!</b><span>흡입 범위 안의 구름을 분해해 수확하세요</span></div>
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
          <div class="garage-tip">NOTE // 런 도중 획득하는 3택 장비와 달리, 정비소 장비는 새로 시작해도 유지됩니다.</div>
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
            <span>SETTLEMENT COMPLETE</span>
            <h3 id="receiptContract">납품 완료</h3>
            <strong id="receiptPayout">◈ 0</strong>
            <p>정산이 완료되었습니다. 영구 장비를 정비하거나 다음 비행을 시작하세요.</p>
            <div class="base-actions">
              <button id="baseGarageButton"><b>MK</b><span>정비소 방문</span></button>
              <button class="launch-button" id="launchButton"><b>TAKE OFF</b><span>다음 비행 출격</span></button>
            </div>
          </section>
        </div>
      </section>

      <section class="levelup-overlay" id="levelUpOverlay" aria-label="레벨업 스킬 선택">
        <div class="levelup-panel">
          <span class="levelup-kicker">FLIGHT LEVEL UP!</span>
          <h2 id="levelUpTitle">새 장비를 하나 선택하세요</h2>
          <p id="levelUpDescription">게임은 선택하는 동안 잠시 멈춥니다.</p>
          <div class="skill-choices" id="skillChoices"></div>
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
const levelUpOverlay = required<HTMLElement>("#levelUpOverlay");
const skillChoices = required<HTMLElement>("#skillChoices");
const levelUpTitle = required<HTMLElement>("#levelUpTitle");
const levelUpDescription = required<HTMLElement>("#levelUpDescription");
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
const baseGarageButton = required<HTMLButtonElement>("#baseGarageButton");
const launchButton = required<HTMLButtonElement>("#launchButton");

let toastTimer = 0;
const showToast = (message: string, tone: "normal" | "success" | "warning" = "normal") => {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = `toast show ${tone}`;
  toastTimer = window.setTimeout(() => { toast.className = "toast"; }, 2200);
};

const game = new CloudHarvestGame(canvas, renderState, renderRunState, showLevelUp, showFactory, showToast);

function renderRunState(state: RunState): void {
  runLevel.textContent = `LV.${state.level}`;
  xpFill.style.width = `${Math.min(100, state.xp / state.xpNext * 100)}%`;
  xpText.textContent = `${Math.floor(state.xp)} / ${state.xpNext}`;
  feverFill.style.width = `${Math.min(100, state.fever)}%`;
  feverText.textContent = state.feverActive ? `${Math.max(0, state.feverSeconds).toFixed(1)}s` : `${Math.floor(state.fever)}%`;
  combo.textContent = state.combo > 0 ? `×${state.combo}` : "—";
  combo.parentElement?.classList.toggle("active", state.combo >= 2);
  const cargoCount = state.cargo.cumulus + state.cargo.rain + state.cargo.electric;
  const estimatedValue = state.cargoValue.cumulus + state.cargoValue.rain + state.cargoValue.electric + state.cargoBonus;
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
      <span>${cloud.kind === "cumulus" ? "CUM" : cloud.kind === "rain" ? "RAN" : "ELC"}</span>
      <b>${cloud.name}</b>
      <strong>${state.cargo[cloud.kind]} UNIT</strong>
      <small>기본 ◈${Math.floor(state.cargoValue[cloud.kind]).toLocaleString()}</small>
    </div>
  `).join("") + `<div class="manifest-bonus"><span>FLIGHT BONUS</span><b>콤보·전선 운항 보너스</b><strong>+ ◈${Math.floor(state.cargoBonus).toLocaleString()}</strong></div>`;
  const payouts = PROCESSING_CONTRACTS.map((contract) => game.getContractPayout(contract.id));
  const bestPayout = Math.max(...payouts);
  contractList.innerHTML = PROCESSING_CONTRACTS.map((contract) => {
    const payout = game.getContractPayout(contract.id);
    return `<button class="contract-card ${payout === bestPayout ? "best" : ""}" data-contract="${contract.id}">
      <span class="contract-code">${contract.code}</span>
      ${payout === bestPayout ? `<em class="best-offer">BEST OFFER</em>` : ""}
      <span class="contract-copy"><b>${contract.name}</b><small>${contract.description}</small></span>
      <span class="contract-rates">흰 ×${contract.multipliers.cumulus.toFixed(2)} · 비 ×${contract.multipliers.rain.toFixed(2)} · 전기 ×${contract.multipliers.electric.toFixed(2)}</span>
      <strong class="contract-payout">◈ ${payout.toLocaleString()} 정산</strong>
    </button>`;
  }).join("");
  factoryOverlay.classList.add("show");
}

function showLevelUp(choices: RunSkillId[], pendingPicks: number): void {
  levelUpTitle.textContent = pendingPicks > 1 ? `장비 ${pendingPicks}개를 연속 선택하세요` : "새 장비를 하나 선택하세요";
  levelUpDescription.textContent = pendingPicks > 1
    ? "피버 중 획득한 레벨을 한 번에 정산합니다."
    : "선택을 마치면 즉시 비행을 재개합니다.";
  skillChoices.innerHTML = choices.map((id) => {
    const skill = RUN_SKILLS[id];
    const stack = game.getRunState().skills[id];
    return `<button class="skill-card" data-skill="${id}" style="--skill-color:${skill.color}">
      <span class="skill-icon">${skill.icon}</span>
      <small>${stack > 0 ? `강화 ${stack + 1}단계` : "신규 장비"}</small>
      <strong>${skill.name}</strong>
      <p>${skill.description}</p>
      <b>선택</b>
    </button>`;
  }).join("");
  levelUpOverlay.classList.add("show");
}

function equipmentEffect(id: UpgradeId, level: number): string {
  switch (id) {
    case "power": return `흡입력 ${36 + level * 15}`;
    case "radius": return `흡입 반경 ${112 + level * 18}px`;
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
    promotionTitle.textContent = "최고 고도 달성";
    promotionDescription.textContent = "전기구름까지 수확하는 전국 규모의 기업이 되었습니다.";
    promotionRequirements.innerHTML = `<span class="done">✓ 프로토타입 완주</span>`;
    promoteButton.textContent = "준비 중인 성층권";
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
  }
});
baseGarageButton.addEventListener("click", () => {
  factoryOverlay.classList.remove("show");
  garageOverlay.classList.add("show");
});
launchButton.addEventListener("click", () => {
  if (!game.launchFlight()) return;
  factoryOverlay.classList.remove("show");
  factoryPanel.classList.remove("settled");
  factoryReceipt.classList.remove("show");
  document.body.classList.remove("returning");
});
skillChoices.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-skill]");
  if (!button) return;
  skillChoices.querySelectorAll<HTMLButtonElement>("button").forEach((choice) => { choice.disabled = true; });
  const finished = game.chooseSkill(button.dataset.skill as RunSkillId);
  if (finished) levelUpOverlay.classList.remove("show");
});
resetButton.addEventListener("click", () => {
  if (window.confirm("현재 회사의 진행 상황을 지우고 처음부터 시작할까요?")) game.reset();
});

window.addEventListener("beforeunload", () => game.destroy());
