import "./styles.css";
import mokaNeutralPortrait from "./assets/characters/moka-neutral.png";
import mokaSeriousPortrait from "./assets/characters/moka-serious.png";
import mokaSurprisedPortrait from "./assets/characters/moka-surprised.png";
import mokaWorriedPortrait from "./assets/characters/moka-worried.png";
import sonaNeutralPortrait from "./assets/characters/sona-neutral.png";
import sonaSeriousPortrait from "./assets/characters/sona-serious.png";
import sonaWorriedPortrait from "./assets/characters/sona-worried.png";
import { CLOUDS, FLIGHT_ROUTES, GROWTH_MISSIONS, INFINITE_RESEARCH, PROCESSING_CONTRACTS, PROCESSING_SECONDS, RANKS, RESEARCH_PROJECTS, RUN_SKILL_COSTS, RUN_SKILLS, SKILL_TREE_BRANCHES, UPGRADES, infiniteResearchCost, upgradeCost } from "./config";
import { CloudHarvestGame, type RadioCall } from "./game";
import type { ContractId, GameState, GrowthMissionId, InfiniteResearchId, ResearchId, RunSkillId, RunState, StorySceneId, UpgradeId } from "./types";

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

      <aside class="rival-race" id="rivalRace" aria-live="polite" aria-hidden="true">
        <header><span>LIVE ROUTE CONTEST</span><strong id="rivalRaceTitle">RAIN CLOUD RUSH</strong><em id="rivalRaceTarget">FIRST TO 5</em></header>
        <div class="rival-race-board">
          <section class="rival-race-lane player"><span>YOU // 구름 수확 회사</span><div id="playerRacePips"></div><strong id="playerRaceScore">0</strong></section>
          <b class="rival-race-versus">VS</b>
          <section class="rival-race-lane rival"><span>쾌청산업 // PRIORITY-1</span><div id="rivalRacePips"></div><strong id="rivalRaceScore">0</strong></section>
        </div>
        <footer id="rivalRaceMessage">비구름을 먼저 확보해 우선 항로를 차지하세요</footer>
      </aside>

      <div class="tutorial" id="tutorial"><b>WASD 이동 · 마우스 조준</b><span>좌클릭 흡입 · SPACE 기지 귀환 · 연료 0% 전 복귀</span></div>
      <aside class="growth-mission" id="growthMission" aria-live="polite">
        <span class="growth-mission-code" id="growthMissionCode">JOB 01</span>
        <div class="growth-mission-copy"><strong id="growthMissionTitle">첫 수확을 시작하세요</strong><small id="growthMissionDescription">뭉게구름 6개를 수확</small></div>
        <div class="growth-mission-progress"><i id="growthMissionFill"></i></div>
        <b class="growth-mission-count" id="growthMissionCount">0 / 6</b>
        <span class="growth-mission-reward">자동 보상 <b id="growthMissionReward">◈ 4</b></span>
      </aside>
      <div class="cloud-legend" id="cloudLegend"></div>
      <div class="toast" id="toast" aria-live="polite"></div>
      <div class="fuel-warning" id="fuelWarning">
        <small id="fuelWarningKicker">LOW FUEL</small>
        <strong>연료가 0이 되면 화물을 전부 버리고 비상 귀환합니다</strong>
        <span id="fuelWarningValue">연료 35%</span>
      </div>

      <aside class="radio-call" id="radioCall" aria-live="polite" aria-hidden="true">
        <div class="radio-call-portrait"><img id="radioCallPortrait" alt="" /></div>
        <div class="radio-call-copy"><span id="radioCallSignal">LIVE COMMS</span><strong id="radioCallSpeaker">관측 연구원 소나</strong><small id="radioCallRole">WEATHER ANALYST</small><p id="radioCallText"></p></div>
      </aside>

      <section class="rival-result" id="rivalResult" aria-live="polite" aria-hidden="true">
        <small>CHAPTER 2 CLEAR // PRIORITY ROUTE</small>
        <h2>비구름 항로 확보!</h2>
        <p>쾌청산업보다 먼저 수확을 끝내 회사의 첫 우선 운항권을 따냈습니다.</p>
        <div><span><b id="rivalResultReward">◈ 80</b> 관제 지원금</span><span><b>P-1 ×1.92</b> 전용 가공 계약</span></div>
        <footer><b>NEXT SKY</b><span>전기구름 항로 · 전국 기상기업 승급 준비</span></footer>
      </section>

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
      <button class="return-button" id="returnButton" disabled><span>RTB</span><b>SPACE · 기지 귀환</b><small id="cargoValue">예상 ◈0</small></button>

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
            <h2>화물을 어떤 결과물로 바꿀까요?</h2>
            <p>빠른 현금·대량 수익·특성 재료·한정 주문은 목적이 다릅니다. 화물을 여러 라인에 나눠 맡길 수 있습니다.</p>
          </header>
          <div class="factory-manifest" id="factoryManifest"></div>
          <div class="contract-list" id="contractList"></div>
          <div class="factory-tip">SPECIAL 주문은 비행당 수량이 제한됩니다. 먼저 한정 주문을 채운 뒤 남은 화물을 다른 라인에 배정할 수 있습니다.</div>
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
              <div class="processing-conveyor"><span>PRODUCT TRANSFER</span><div class="conveyor-belt"></div><div class="conveyor-products" id="processingConveyorProducts"></div><b>→ STORAGE</b></div>
            </section>
            <aside class="processing-console">
              <div class="processing-console-head"><span>LINE CONTROL</span><i></i><i></i><i></i></div>
              <div class="processing-output" id="processingOutput"></div>
              <button class="processing-claim" id="claimProcessingButton" disabled><span>완성품 일괄 출하</span><strong id="claimProcessingValue">◈ 0</strong></button>
            </aside>
          </div>
          <div class="processing-shipping-burst" id="processingShippingBurst" aria-hidden="true"></div>
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
          <nav class="skill-tree-tabs" id="skillTreeTabs" aria-label="장기 성장 연구 탭">
            <button class="active" id="skillBlueprintTab" data-tree-tab="blueprint"><b>42</b><span>특성 설계도</span><small>유한 시스템망</small></button>
            <button id="infiniteResearchTab" data-tree-tab="infinite" disabled><b>∞</b><span>무한 연구</span><small>특성 42개 해금 필요</small></button>
          </nav>
          <div class="skill-point-bank"><span id="skillPointLabel">CLOUD STOCKPILE</span><strong id="skillPointCount">☁ 0 · 🌧 0 · ⚡ 0 · ❄ 0 · ☀ 0 · ✦ 0</strong><small id="skillPointHint">상위 구름 1개는 바로 아래 단계 구름 4개 가치로 자동 대체됩니다.</small></div>
          <div class="skill-choices skill-tree-network-shell" id="skillChoices"></div>
          <button class="skill-tree-close" id="skillTreeCloseButton">기지로 돌아가기</button>
        </div>
      </section>
      <aside class="skill-hover-card" id="skillHoverCard" aria-hidden="true"></aside>

      <section class="story-overlay" id="storyOverlay" aria-label="구름 수확 회사 이야기" aria-live="polite" aria-hidden="true">
        <div class="story-vignette"></div>
        <div class="story-frame" id="storyFrame">
          <header class="story-header">
            <div><span id="storyChapter">CHAPTER 0</span><strong id="storySceneTitle">구름 없는 아침</strong></div>
            <button id="storySkipButton">장면 건너뛰기</button>
          </header>
          <div class="story-stage">
            <aside class="story-portrait" id="storyPortrait">
              <div class="story-portrait-art">
                <img id="storyPortraitImage" src="" alt="" hidden>
                <i></i><i></i><i></i><span id="storyPortraitMark">☁</span>
              </div>
              <strong id="storyPortraitName">구름 수확 회사</strong>
              <small id="storyPortraitRole">LAST SMALL WEATHER COMPANY</small>
            </aside>
            <article class="story-dialogue">
              <span class="story-speaker" id="storySpeaker">NARRATION</span>
              <p id="storyText">맑은 하늘이 언제나 좋은 것은 아니었다.</p>
              <div class="story-footer">
                <div class="story-progress" id="storyProgress"></div>
                <button id="storyNextButton"><span>다음</span><small>ENTER</small></button>
              </div>
            </article>
          </div>
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
const fuelWarning = required<HTMLElement>("#fuelWarning");
const fuelWarningKicker = required<HTMLElement>("#fuelWarningKicker");
const fuelWarningValue = required<HTMLElement>("#fuelWarningValue");
const radioCall = required<HTMLElement>("#radioCall");
const radioCallPortrait = required<HTMLImageElement>("#radioCallPortrait");
const radioCallSignal = required<HTMLElement>("#radioCallSignal");
const radioCallSpeaker = required<HTMLElement>("#radioCallSpeaker");
const radioCallRole = required<HTMLElement>("#radioCallRole");
const radioCallText = required<HTMLElement>("#radioCallText");
const rivalResult = required<HTMLElement>("#rivalResult");
const rivalResultReward = required<HTMLElement>("#rivalResultReward");
const altitude = required<HTMLElement>("#altitude");
const rankName = required<HTMLElement>("#rankName");
const promotionTitle = required<HTMLElement>("#promotionTitle");
const promotionDescription = required<HTMLElement>("#promotionDescription");
const promotionRequirements = required<HTMLElement>("#promotionRequirements");
const promoteButton = required<HTMLButtonElement>("#promoteButton");
const promotionCard = required<HTMLElement>(".promotion-card");
const upgradeList = required<HTMLElement>("#upgradeList");
const cloudLegend = required<HTMLElement>("#cloudLegend");
const toast = required<HTMLElement>("#toast");
const processingOverlay = required<HTMLElement>("#processingOverlay");
const processingSummary = required<HTMLElement>("#processingSummary");
const processingLanes = required<HTMLElement>("#processingLanes");
const processingOutput = required<HTMLElement>("#processingOutput");
const processingConveyorProducts = required<HTMLElement>("#processingConveyorProducts");
const processingShippingBurst = required<HTMLElement>("#processingShippingBurst");
const claimProcessingButton = required<HTMLButtonElement>("#claimProcessingButton");
const claimProcessingValue = required<HTMLElement>("#claimProcessingValue");
const processingCloseButton = required<HTMLButtonElement>("#processingCloseButton");
const soundButton = required<HTMLButtonElement>("#soundButton");
const resetButton = required<HTMLButtonElement>("#resetButton");
const tutorial = required<HTMLElement>("#tutorial");
const growthMission = required<HTMLElement>("#growthMission");
const growthMissionCode = required<HTMLElement>("#growthMissionCode");
const growthMissionTitle = required<HTMLElement>("#growthMissionTitle");
const growthMissionDescription = required<HTMLElement>("#growthMissionDescription");
const growthMissionFill = required<HTMLElement>("#growthMissionFill");
const growthMissionCount = required<HTMLElement>("#growthMissionCount");
const growthMissionReward = required<HTMLElement>("#growthMissionReward");
const runLevel = required<HTMLElement>("#runLevel");
const xpFill = required<HTMLElement>("#xpFill");
const xpText = required<HTMLElement>("#xpText");
const feverFill = required<HTMLElement>("#feverFill");
const feverText = required<HTMLElement>("#feverText");
const routeName = required<HTMLElement>("#routeName");
const dayFlight = required<HTMLElement>("#dayFlight");
const rivalRace = required<HTMLElement>("#rivalRace");
const rivalRaceTitle = required<HTMLElement>("#rivalRaceTitle");
const rivalRaceTarget = required<HTMLElement>("#rivalRaceTarget");
const playerRacePips = required<HTMLElement>("#playerRacePips");
const rivalRacePips = required<HTMLElement>("#rivalRacePips");
const playerRaceScore = required<HTMLElement>("#playerRaceScore");
const rivalRaceScore = required<HTMLElement>("#rivalRaceScore");
const rivalRaceMessage = required<HTMLElement>("#rivalRaceMessage");
const levelUpOverlay = required<HTMLElement>("#levelUpOverlay");
const skillChoices = required<HTMLElement>("#skillChoices");
const levelUpTitle = required<HTMLElement>("#levelUpTitle");
const levelUpDescription = required<HTMLElement>("#levelUpDescription");
const skillPointCount = required<HTMLElement>("#skillPointCount");
const skillPointLabel = required<HTMLElement>("#skillPointLabel");
const skillPointHint = required<HTMLElement>("#skillPointHint");
const skillTreeTabs = required<HTMLElement>("#skillTreeTabs");
const skillBlueprintTab = required<HTMLButtonElement>("#skillBlueprintTab");
const infiniteResearchTab = required<HTMLButtonElement>("#infiniteResearchTab");
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
const storyOverlay = required<HTMLElement>("#storyOverlay");
const storyFrame = required<HTMLElement>("#storyFrame");
const storyChapter = required<HTMLElement>("#storyChapter");
const storySceneTitle = required<HTMLElement>("#storySceneTitle");
const storySkipButton = required<HTMLButtonElement>("#storySkipButton");
const storyPortrait = required<HTMLElement>("#storyPortrait");
const storyPortraitImage = required<HTMLImageElement>("#storyPortraitImage");
const storyPortraitMark = required<HTMLElement>("#storyPortraitMark");
const storyPortraitName = required<HTMLElement>("#storyPortraitName");
const storyPortraitRole = required<HTMLElement>("#storyPortraitRole");
const storySpeaker = required<HTMLElement>("#storySpeaker");
const storyText = required<HTMLElement>("#storyText");
const storyProgress = required<HTMLElement>("#storyProgress");
const storyNextButton = required<HTMLButtonElement>("#storyNextButton");

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
let previousProcessingJobs: { id: number; line: number; kind: keyof GameState["materials"] }[] | null = null;
let previousCompletedCoins: number | null = null;
let renderedGrowthMissionStep: number | null = null;
let activeSkillTreeTab: "blueprint" | "infinite" = "blueprint";
let infiniteResearchUnlockedPreviously = false;

type StoryTone = "narrator" | "moka" | "sona" | "rival";
type StoryPortrait =
  | "moka-neutral"
  | "moka-serious"
  | "moka-surprised"
  | "moka-worried"
  | "sona-neutral"
  | "sona-serious"
  | "sona-worried";
type StoryBeat = { speaker: string; name: string; role: string; mark: string; tone: StoryTone; portrait?: StoryPortrait; text: string };
type StoryScene = { chapter: string; title: string; beats: StoryBeat[] };

const STORY_PORTRAITS: Record<StoryPortrait, string> = {
  "moka-neutral": mokaNeutralPortrait,
  "moka-serious": mokaSeriousPortrait,
  "moka-surprised": mokaSurprisedPortrait,
  "moka-worried": mokaWorriedPortrait,
  "sona-neutral": sonaNeutralPortrait,
  "sona-serious": sonaSeriousPortrait,
  "sona-worried": sonaWorriedPortrait,
};

const RADIO_PORTRAITS: Record<RadioCall["portrait"], string> = {
  "moka-worried": mokaWorriedPortrait,
  "sona-worried": sonaWorriedPortrait,
  "sona-serious": sonaSeriousPortrait,
};
const radioQueue: RadioCall[] = [];
let radioBusy = false;
let radioTimer = 0;
let rivalResultTimer = 0;
let previousRivalRaceStatus: RunState["rivalRace"]["status"] = "inactive";

function enqueueRadioCall(call: RadioCall): void {
  radioQueue.push(call);
  if (!radioBusy) presentNextRadioCall();
}

function presentNextRadioCall(): void {
  const call = radioQueue.shift();
  if (!call) {
    radioBusy = false;
    return;
  }
  radioBusy = true;
  window.clearTimeout(radioTimer);
  radioCall.className = `radio-call ${call.tone} show`;
  radioCall.setAttribute("aria-hidden", "false");
  radioCallPortrait.src = RADIO_PORTRAITS[call.portrait];
  radioCallPortrait.alt = `${call.speaker} 무전 초상화`;
  radioCallSignal.textContent = call.tone === "sona" ? "LIVE WEATHER LINK" : "DOCK RADIO";
  radioCallSpeaker.textContent = call.speaker;
  radioCallRole.textContent = call.role;
  radioCallText.textContent = call.text;
  radioTimer = window.setTimeout(() => {
    radioCall.classList.remove("show");
    radioCall.setAttribute("aria-hidden", "true");
    window.setTimeout(() => {
      radioBusy = false;
      presentNextRadioCall();
    }, 220);
  }, 3900);
}

function showRivalResult(reward: number): void {
  window.clearTimeout(rivalResultTimer);
  rivalResultReward.textContent = `◈ ${reward}`;
  rivalResult.classList.remove("show");
  rivalResult.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => rivalResult.classList.add("show"));
  rivalResultTimer = window.setTimeout(() => {
    rivalResult.classList.remove("show");
    rivalResult.setAttribute("aria-hidden", "true");
  }, 4400);
}

const STORY_SCENES: Record<StorySceneId, StoryScene> = {
  prologue: {
    chapter: "CHAPTER 0 // THE LAST SMALL COMPANY",
    title: "구름 없는 아침",
    beats: [
      { speaker: "NARRATION", name: "서부 7구역", role: "43 DAYS WITHOUT RAIN", mark: "☁", tone: "narrator", text: "맑은 하늘은 한때 축복이었다. 비가 멎은 지 마흔셋째 날, 사람들은 구름 한 점에도 가격표를 붙였다." },
      { speaker: "모카", name: "정비사 모카", role: "SHIP MECHANIC // CO-FOUNDER", mark: "MK", tone: "moka", portrait: "moka-neutral", text: "신임 사장님 맞죠? 물려받은 건 빚 독촉장 열두 장, 낡은 격납고 하나… 그리고 아직 뜨는 비행선 한 대예요." },
      { speaker: "모카", name: "정비사 모카", role: "SHIP MECHANIC // CO-FOUNDER", mark: "MK", tone: "moka", portrait: "moka-serious", text: "구름만 가져오면 회사는 돌아가요. 좌클릭으로 흡입하고, 연료가 바닥나기 전에 SPACE로 귀환하세요. 화물보다 목숨이 먼저니까." },
      { speaker: "소나 // 무전", name: "관측 연구원 소나", role: "WEATHER ANALYST // REMOTE", mark: "SN", tone: "sona", portrait: "sona-neutral", text: "관측팀 소나입니다. 첫 목표는 뭉게구름 여섯 개. 원재료를 확보하면 첫 가공 계약을 열 수 있어요." },
      { speaker: "NARRATION", name: "구름 수확 회사", role: "DAY 1 // FIRST SORTIE", mark: "01", tone: "narrator", text: "낡은 프로펠러가 다시 돌기 시작했다. 골목 기상소의 마지막 수확선이, 회사의 첫 구름을 향해 떠올랐다." },
    ],
  },
  firstReturn: {
    chapter: "CHAPTER 1 // FIRST CARGO",
    title: "작은 회사의 첫 귀환",
    beats: [
      { speaker: "모카", name: "정비사 모카", role: "DOCK CONTROL", mark: "MK", tone: "moka", portrait: "moka-surprised", text: "착륙 확인! 솔직히 첫 비행부터 견인차를 부를 줄 알았는데… 사장님, 생각보다 제법인데요?" },
      { speaker: "소나", name: "관측 연구원 소나", role: "PROCESSING LAB", mark: "SN", tone: "sona", portrait: "sona-neutral", text: "가져온 구름은 아직 돈이 아닙니다. 가공 계약에 투입하면 비행 중에도 정제되고, 완제품이 되어야 코인으로 출하할 수 있어요." },
      { speaker: "모카", name: "정비사 모카", role: "FUEL & SAFETY", mark: "MK", tone: "moka", portrait: "moka-worried", text: "다음에는 조금 더 욕심내도 좋아요. 하지만 연료가 0이 되면 화물은 전량 폐기. 빨간 경고가 뜨면 SPACE, 잊지 마세요." },
      { speaker: "NARRATION", name: "구름 수확 회사", role: "THE FIRST CONTRACT", mark: "◈", tone: "narrator", text: "작은 회사의 첫 화물이 가공동으로 향했다. 멈춰 있던 기계와 사람들의 하루가 다시 움직이기 시작했다." },
    ],
  },
  rainFrontier: {
    chapter: "CHAPTER 2 // RAIN BELT",
    title: "비구름 항로와 낯선 호출",
    beats: [
      { speaker: "소나", name: "관측 연구원 소나", role: "ALTITUDE DATA LINK", mark: "SN", tone: "sona", portrait: "sona-neutral", text: "지역 하늘지사 허가가 승인됐습니다. 해발 2,000미터 비구름 띠와 새 가공 계약을 사용할 수 있어요." },
      { speaker: "소나", name: "관측 연구원 소나", role: "ANOMALY REPORT", mark: "31", tone: "sona", portrait: "sona-worried", text: "그런데 이상합니다. 실제 구름량이 예보보다 31% 적어요. 누군가 항로 앞쪽에서 대량으로 쓸어가고 있습니다." },
      { speaker: "모카", name: "정비사 모카", role: "UNLICENSED CHANNEL", mark: "MK", tone: "moka", portrait: "moka-serious", text: "이 주파수 표식… 쾌청산업이에요. 작은 회사가 올라오는 걸 제일 싫어하는 거대 기상기업이죠." },
      { speaker: "쾌청산업 관제", name: "쾌청산업", role: "PRIORITY HARVEST NETWORK", mark: "QS", tone: "rival", text: "미등록 소형 수확선에 통보한다. 해당 비구름 띠는 쾌청산업 우선 채집 구역이다. 즉시 저고도로 복귀하라." },
      { speaker: "소나", name: "관측 연구원 소나", role: "NEW OBJECTIVE // RAIN CLOUD ×5", mark: "SN", tone: "sona", portrait: "sona-serious", text: "법적으로는 공동 항로예요. 물러날 이유 없습니다. 비구름 다섯 개를 확보해 구름 소실 데이터부터 추적하죠." },
    ],
  },
  rivalAftermath: {
    chapter: "CHAPTER 3 // STOLEN WEATHER",
    title: "우선 항로의 대가",
    beats: [
      { speaker: "모카", name: "정비사 모카", role: "DOCK SALVAGE", mark: "MK", tone: "moka", portrait: "moka-surprised", text: "쾌청산업 수확선이 흘리고 간 관제 모듈을 주웠어요. 덕분에 비구름 긴급 주문도 따냈지만… 안쪽 기록이 좀 수상해요." },
      { speaker: "소나", name: "관측 연구원 소나", role: "ENCRYPTED FORECAST", mark: "SN", tone: "sona", portrait: "sona-worried", text: "자연 소실이 아니었어요. 상공의 구름을 한곳으로 끌어당기는 인공 기압장이 작동 중입니다. 가뭄은 사고가 아니라 누군가 만든 결과일 수 있어요." },
      { speaker: "모카", name: "정비사 모카", role: "SHIP UPGRADE DIRECTIVE", mark: "MK", tone: "moka", portrait: "moka-serious", text: "그럼 더 높이 올라가죠. 엔진도, 가공동도 키워서 저 회사가 숨긴 기압장의 끝까지 따라가는 겁니다." },
    ],
  },
  electricFrontier: {
    chapter: "CHAPTER 4 // THUNDER GRID",
    title: "번개 속의 좌표",
    beats: [
      { speaker: "소나", name: "관측 연구원 소나", role: "ELECTRIC FRONT ANALYSIS", mark: "SN", tone: "sona", portrait: "sona-neutral", text: "전기구름 항로가 열렸습니다. 전하핵을 정밀 추출하면 코인 수익을 줄이는 대신 특성 연구 재료를 더 확보할 수 있어요." },
      { speaker: "소나", name: "관측 연구원 소나", role: "SIGNAL MATCH // 97%", mark: "97", tone: "sona", portrait: "sona-worried", text: "번개가 칠 때마다 같은 좌표가 반복됩니다. 쾌청산업의 인공 기압장이 북쪽 빙정층과 연결돼 있어요." },
      { speaker: "모카", name: "정비사 모카", role: "INSULATION CHECK", mark: "MK", tone: "moka", portrait: "moka-serious", text: "좋아요. 절연 코팅 확인했고 드론도 분산 운항으로 맞췄습니다. 번개가 길을 가리킨다면 그대로 쫓아가죠." },
    ],
  },
  iceFrontier: {
    chapter: "CHAPTER 5 // FROZEN ARCHIVE",
    title: "얼어붙은 관측 기록",
    beats: [
      { speaker: "NARRATION", name: "북부 빙정층", role: "ABANDONED WEATHER RELAY", mark: "ICE", tone: "narrator", text: "빙정구름 안에서 오래된 관측 중계기가 발견됐다. 전원이 끊긴 기록 장치에는 회사가 폐업하기 전의 마지막 항로가 남아 있었다." },
      { speaker: "모카", name: "정비사 모카", role: "ARCHIVE RECOVERY", mark: "MK", tone: "moka", portrait: "moka-worried", text: "선대 사장님도 같은 기압장을 추적했어요. 실패해서 회사를 잃은 게 아니라, 증거를 지키려고 모든 장비를 팔았던 거예요." },
      { speaker: "소나", name: "관측 연구원 소나", role: "NEXT TARGET // SOLAR LAYER", mark: "SN", tone: "sona", portrait: "sona-serious", text: "기록의 마지막 좌표는 태양구름 층입니다. 이번에는 증거도 회사도 모두 지켜서 돌아오겠습니다." },
    ],
  },
  solarFrontier: {
    chapter: "CHAPTER 6 // FALSE SUN",
    title: "구름을 태우는 엔진",
    beats: [
      { speaker: "소나", name: "관측 연구원 소나", role: "CLIMATE ENGINE VISUAL", mark: "SN", tone: "sona", portrait: "sona-worried", text: "확인했습니다. 쾌청산업은 태양구름의 에너지로 거대한 기압 엔진을 돌리고 있어요. 주변 구름을 독점 항로로 밀어내는 장치입니다." },
      { speaker: "쾌청산업 관제", name: "쾌청산업", role: "CORPORATE WEATHER AUTHORITY", mark: "QS", tone: "rival", text: "기후는 관리 가능한 자원이다. 소형 수확사가 개입하면 공급 안정성이 훼손된다. 즉시 추적을 중단하라." },
      { speaker: "모카", name: "정비사 모카", role: "FULL THROTTLE", mark: "MK", tone: "moka", portrait: "moka-serious", text: "공급 안정성 같은 소리 하네요. 아래 도시는 마흔셋 날째 비를 기다리고 있어요. 오로라층까지 올라가 엔진의 중심을 찾죠." },
    ],
  },
  auroraFrontier: {
    chapter: "CHAPTER 7 // OPEN SKY",
    title: "회사의 다음 하늘",
    beats: [
      { speaker: "NARRATION", name: "오로라 핵심 항로", role: "IONOSPHERE INDUSTRIAL ZONE", mark: "AUR", tone: "narrator", text: "여섯 종류의 구름이 한 항로에서 빛났다. 작은 수확 회사의 비행선은 마침내 인공 기압장의 중심과 같은 고도에 도달했다." },
      { speaker: "소나", name: "관측 연구원 소나", role: "WEATHER RESTORATION PLAN", mark: "SN", tone: "sona", portrait: "sona-serious", text: "엔진을 멈추는 것만으로는 부족합니다. 모은 구름을 다시 순환시켜야 해요. 가공 라인과 무한 특성망이 복구 작업의 기반이 될 겁니다." },
      { speaker: "모카", name: "정비사 모카", role: "CO-FOUNDER // OPEN SKY", mark: "MK", tone: "moka", portrait: "moka-neutral", text: "처음엔 빚 독촉장과 낡은 배 한 대뿐이었죠. 이제는 우리가 얼마나 높이 성장할지 정해진 천장도 없어요. 사장님, 다음 비행 준비됐습니다." },
      { speaker: "NARRATION", name: "구름 수확 회사", role: "ENDLESS RESTORATION BEGINS", mark: "∞", tone: "narrator", text: "회사의 첫 목표는 생존이었다. 이제 목표는 하늘을 되돌리는 일이다. 수확선은 더 빠르게, 더 멀리, 끝없이 성장하며 다시 출격했다." },
    ],
  },
};

const storyQueue: StorySceneId[] = [];
let activeStoryScene: StorySceneId | null = null;
let activeStoryBeat = 0;
let storySystemReady = false;
let storyTransitioning = false;

const game = new CloudHarvestGame(canvas, renderState, renderRunState, showLevelUp, showFactory, showToast, enqueueRadioCall);
if (import.meta.env.DEV) {
  const developmentWindow = window as typeof window & {
    __cloudHarvestGame?: CloudHarvestGame;
    __cloudHarvestPacing?: () => ReturnType<CloudHarvestGame["getPacingReport"]>;
  };
  developmentWindow.__cloudHarvestGame = game;
  developmentWindow.__cloudHarvestPacing = () => game.getPacingReport();
}
storySystemReady = true;
window.setTimeout(() => syncStoryTriggers(game.getState()), 360);

function queueStoryScene(id: StorySceneId): void {
  if (!storySystemReady || game.getState().story.seen.includes(id) || activeStoryScene === id || storyQueue.includes(id)) return;
  storyQueue.push(id);
  openNextStoryScene();
}

function syncStoryTriggers(state: GameState): void {
  if (!storySystemReady || storyTransitioning) return;
  if (!state.story.seen.includes("prologue")) {
    queueStoryScene("prologue");
    return;
  }
  if (!game.isAtFactory()) return;
  if (state.growthMission.safeReturns >= 1 && !state.story.seen.includes("firstReturn")) {
    queueStoryScene("firstReturn");
    return;
  }
  if (state.rank >= 1 && !state.story.seen.includes("rainFrontier")) { queueStoryScene("rainFrontier"); return; }
  if (state.story.rivalBeaten && !state.story.seen.includes("rivalAftermath")) { queueStoryScene("rivalAftermath"); return; }
  if (state.rank >= 2 && !state.story.seen.includes("electricFrontier")) { queueStoryScene("electricFrontier"); return; }
  if (state.rank >= 3 && !state.story.seen.includes("iceFrontier")) { queueStoryScene("iceFrontier"); return; }
  if (state.rank >= 4 && !state.story.seen.includes("solarFrontier")) { queueStoryScene("solarFrontier"); return; }
  if (state.rank >= 5 && !state.story.seen.includes("auroraFrontier")) queueStoryScene("auroraFrontier");
}

function openNextStoryScene(): void {
  if (activeStoryScene || storyTransitioning) return;
  const next = storyQueue.shift();
  if (!next) return;
  activeStoryScene = next;
  activeStoryBeat = 0;
  game.setStoryPaused(true);
  document.body.classList.add("story-open");
  storyOverlay.classList.add("show");
  storyOverlay.setAttribute("aria-hidden", "false");
  renderStoryBeat();
  storyNextButton.focus({ preventScroll: true });
}

function renderStoryBeat(): void {
  if (!activeStoryScene) return;
  const scene = STORY_SCENES[activeStoryScene];
  const beat = scene.beats[activeStoryBeat];
  storyChapter.textContent = scene.chapter;
  storySceneTitle.textContent = scene.title;
  storySpeaker.textContent = beat.speaker;
  storyPortraitName.textContent = beat.name;
  storyPortraitRole.textContent = beat.role;
  storyPortraitMark.textContent = beat.mark;
  storyPortrait.className = `story-portrait ${beat.tone}`;
  const portraitSrc = beat.portrait ? STORY_PORTRAITS[beat.portrait] : null;
  storyPortrait.classList.toggle("has-image", Boolean(portraitSrc));
  storyPortraitImage.hidden = !portraitSrc;
  storyPortraitImage.src = portraitSrc ?? "";
  storyPortraitImage.alt = portraitSrc ? `${beat.name} 초상화` : "";
  storyOverlay.dataset.tone = beat.tone;
  storyText.textContent = beat.text;
  storyText.classList.remove("enter");
  storyPortrait.classList.remove("enter");
  requestAnimationFrame(() => {
    storyText.classList.add("enter");
    storyPortrait.classList.add("enter");
  });
  storyProgress.innerHTML = scene.beats.map((_, index) => `<i class="${index < activeStoryBeat ? "done" : index === activeStoryBeat ? "active" : ""}"></i>`).join("")
    + `<b>${String(activeStoryBeat + 1).padStart(2, "0")} / ${String(scene.beats.length).padStart(2, "0")}</b>`;
  const nextLabel = storyNextButton.querySelector<HTMLElement>("span");
  if (nextLabel) nextLabel.textContent = activeStoryBeat === scene.beats.length - 1 ? "장면 완료" : "다음";
}

function advanceStory(): void {
  if (!activeStoryScene || storyTransitioning) return;
  const scene = STORY_SCENES[activeStoryScene];
  if (activeStoryBeat < scene.beats.length - 1) {
    activeStoryBeat += 1;
    renderStoryBeat();
    return;
  }
  finishStoryScene();
}

function finishStoryScene(): void {
  if (!activeStoryScene || storyTransitioning) return;
  const completed = activeStoryScene;
  storyTransitioning = true;
  activeStoryScene = null;
  canvas.focus({ preventScroll: true });
  storyOverlay.classList.remove("show");
  storyOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("story-open");
  game.setStoryPaused(false);
  game.completeStoryScene(completed);
  window.setTimeout(() => {
    storyTransitioning = false;
    syncStoryTriggers(game.getState());
    openNextStoryScene();
  }, 280);
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

function cloudMass(materials: GameState["materials"]): number {
  return CLOUD_ORDER.reduce((total, kind, index) => total + materials[kind] * 4 ** index, 0);
}

function allSkillsUnlocked(skills: RunState["skills"]): boolean {
  return (Object.keys(RUN_SKILLS) as RunSkillId[]).every((id) => skills[id] >= 1);
}

function infiniteResearchEffect(id: InfiniteResearchId, level: number): string {
  switch (id) {
    case "speed": return `최고 속도 +${(level * 2.5).toFixed(1)}%`;
    case "power": return `흡입 출력 +${level * 4}%`;
    case "fuel": return `연료 용량 +${(level * .75).toFixed(2).replace(/\.00$/, "")}`;
    case "drone": return `드론 출력 +${level * 4}%`;
    case "yield": return `수확 가치 +${level * 3}%`;
  }
}

function canAffordInfiniteResearch(id: InfiniteResearchId, state: RunState): boolean {
  return cloudMass(state.materials) >= infiniteResearchCost(id, state.infiniteResearch[id]);
}

function renderRunState(state: RunState): void {
  runLevel.textContent = `LV.${state.level}`;
  runLevel.classList.remove("ready");
  const treeCode = skillTreeButton.querySelector<HTMLElement>("b");
  const affordableFiniteSkill = (Object.keys(RUN_SKILLS) as RunSkillId[]).some((id) => {
    const requirementsMet = RUN_SKILLS[id].requirements?.every((requirement) => state.skills[requirement] >= 1) ?? true;
    return state.skills[id] < 1 && requirementsMet && canAffordSkill(id, state);
  });
  const infiniteUnlocked = allSkillsUnlocked(state.skills);
  const affordableInfiniteResearch = infiniteUnlocked
    && (Object.keys(INFINITE_RESEARCH) as InfiniteResearchId[]).some((id) => canAffordInfiniteResearch(id, state));
  const growthReady = affordableFiniteSkill || affordableInfiniteResearch;
  if (treeCode) treeCode.textContent = growthReady
    ? infiniteUnlocked ? "∞ TREE! · FACILITY 02" : "TREE! · FACILITY 02"
    : "TREE · FACILITY 02";
  skillTreeButton.classList.toggle("ready", growthReady);
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
  const race = state.rivalRace;
  const raceVisible = race.status !== "inactive";
  rivalRace.classList.toggle("show", raceVisible);
  rivalRace.classList.toggle("won", race.status === "won");
  rivalRace.classList.toggle("lost", race.status === "lost");
  rivalRace.setAttribute("aria-hidden", String(!raceVisible));
  document.body.classList.toggle("rival-race-active", raceVisible);
  playerRaceScore.textContent = String(race.playerScore);
  rivalRaceScore.textContent = String(race.rivalScore);
  playerRacePips.innerHTML = Array.from({ length: race.target }, (_, index) => `<i class="${index < race.playerScore ? "filled" : ""}"></i>`).join("");
  rivalRacePips.innerHTML = Array.from({ length: race.target }, (_, index) => `<i class="${index < race.rivalScore ? "filled" : ""}"></i>`).join("");
  rivalRaceTarget.textContent = `FIRST TO ${race.target}`;
  if (race.status === "won") {
    rivalRaceTitle.textContent = "ROUTE SECURED";
    rivalRaceMessage.textContent = `우선 항로 납품 계약 해금 · 관제 지원금 ◈ ${race.reward}`;
  } else if (race.status === "lost") {
    rivalRaceTitle.textContent = "RIVAL CLAIMED ROUTE";
    rivalRaceMessage.textContent = "화물 손실 없음 · 비구름 항로에서 다시 도전 가능";
  } else {
    rivalRaceTitle.textContent = "RAIN CLOUD RUSH";
    rivalRaceMessage.textContent = "비구름을 먼저 확보해 우선 항로를 차지하세요";
  }
  if (race.status === "won" && previousRivalRaceStatus !== "won") showRivalResult(race.reward);
  previousRivalRaceStatus = race.status;
  renderProcessing(state);
}

function processingTime(seconds: number): string {
  const rounded = Math.max(0, Math.ceil(seconds));
  if (rounded < 60) return `${rounded}초`;
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${minutes}분 ${remainder.toString().padStart(2, "0")}초`;
}

function emitProcessedProduct(lineIndex: number, kind: keyof GameState["materials"]): void {
  if (!processingOverlay.classList.contains("show")) return;
  const product = document.createElement("span");
  product.className = `conveyor-product ${kind}`;
  product.style.setProperty("--product-start", `${Math.min(72, 10 + lineIndex * 29)}%`);
  product.innerHTML = `<i>${CLOUDS[kind].icon}</i><b>OK</b>`;
  processingConveyorProducts.append(product);
  const outputWindow = processingOutput.querySelector<HTMLElement>(".output-window");
  window.setTimeout(() => outputWindow?.classList.add("receiving"), 760);
  window.setTimeout(() => outputWindow?.classList.remove("receiving"), 1450);
  window.setTimeout(() => product.remove(), 1550);
}

function emitShippingBurst(coins: number): void {
  processingShippingBurst.replaceChildren();
  const vectors = [[-118,-72],[-82,-128],[-28,-112],[34,-136],[88,-94],[128,-42],[-132,-18],[-94,48],[-36,72],[25,82],[79,53],[122,12]];
  vectors.forEach(([x, y], index) => {
    const coin = document.createElement("span");
    coin.textContent = "◈";
    coin.style.setProperty("--burst-x", `${x}px`);
    coin.style.setProperty("--burst-y", `${y}px`);
    coin.style.setProperty("--burst-delay", `${index * 28}ms`);
    processingShippingBurst.append(coin);
  });
  const payout = document.createElement("b");
  payout.textContent = `출하 + ◈ ${coins.toLocaleString()}`;
  processingShippingBurst.append(payout);
  processingShippingBurst.classList.remove("active");
  requestAnimationFrame(() => processingShippingBurst.classList.add("active"));
  window.setTimeout(() => {
    processingShippingBurst.classList.remove("active");
    processingShippingBurst.replaceChildren();
  }, 1500);
}

function renderProcessing(state: RunState): void {
  const jobs = state.processing.jobs;
  const active = jobs.slice(0, state.processingLines);
  const waiting = Math.max(0, jobs.length - active.length);
  const completed = Math.floor(state.processing.completedCoins);
  const completedMaterials = CLOUD_ORDER.reduce((total, kind) => total + state.processing.completedMaterials[kind], 0);
  const finishedProducts = previousProcessingJobs && previousCompletedCoins !== null && completed > previousCompletedCoins
    ? previousProcessingJobs.filter((previous) => !jobs.some((job) => job.id === previous.id))
    : [];
  processingFacilityButton.classList.toggle("ready", completed > 0 || completedMaterials > 0);
  const processingCode = processingFacilityButton.querySelector<HTMLElement>("b");
  if (processingCode) processingCode.textContent = completed > 0 || completedMaterials > 0 ? "PROC! · FACILITY 03" : "PROC · FACILITY 03";
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
    vat.classList.toggle("finishing", progress >= 90);
  });
  const nextOutputKey = `${waiting}|${completed}|${completedMaterials}|${jobs.length > 0}`;
  if (processingOutputKey !== nextOutputKey) {
    processingOutput.innerHTML = `<div class="output-readout"><small>대기열</small><strong>${waiting}</strong><span>BATCH</span></div>
      <div class="output-window ${completed > 0 || completedMaterials > 0 ? "ready" : ""}"><div class="output-canister"><i></i><b>${completedMaterials > 0 ? "◆" : completed > 0 ? "◈" : "◇"}</b><span></span></div><strong>${completed > 0 || completedMaterials > 0 ? "완제품 출하 준비" : jobs.length > 0 ? "제품 충전 중" : "완제품 대기"}</strong><small>${completed > 0 || completedMaterials > 0 ? `◈ ${completed.toLocaleString()}${completedMaterials > 0 ? ` · 특성 재료 ${completedMaterials}` : ""}` : "가공이 끝나면 이곳에 쌓입니다"}</small></div>`;
    processingOutputKey = nextOutputKey;
  }
  claimProcessingButton.disabled = completed <= 0 && completedMaterials <= 0;
  claimProcessingValue.textContent = `◈ ${completed.toLocaleString()}${completedMaterials > 0 ? ` + ◆${completedMaterials}` : ""}`;
  finishedProducts.forEach((product) => emitProcessedProduct(product.line, product.kind));
  previousProcessingJobs = active.map((job, line) => ({
    id: job.id,
    line,
    kind: CLOUD_ORDER.reduce((best, kind) => job.units[kind] > job.units[best] ? kind : best, CLOUD_ORDER[0]),
  }));
  previousCompletedCoins = completed;
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
  const company = game.getState();
  const contractRank: Partial<Record<ContractId, number>> = { energy: 2, cryogenic: 3, stellar: 4, spectrum: 5 };
  const availableContracts = PROCESSING_CONTRACTS.filter((contract) => {
    if (contract.id === "priority") return company.story.rivalBeaten;
    return (contractRank[contract.id] ?? 0) <= company.rank;
  });
  contractList.innerHTML = availableContracts.map((contract) => {
    const estimate = game.getProcessingEstimate(contract.id);
    const payout = estimate.payout;
    const materialUnits = CLOUD_ORDER.reduce((total, kind) => total + estimate.materialRewards[kind], 0);
    const acceptedClouds = contract.acceptedKinds.map((kind) => CLOUDS[kind]);
    const quotaLabel = contract.flightLimit === undefined ? "수량 제한 없음" : `이번 비행 ${estimate.quotaRemaining}/${contract.flightLimit}개 남음`;
    const rewardLabel = materialUnits > 0 ? `◈ ${payout.toLocaleString()} + ◆${materialUnits}` : `◈ ${payout.toLocaleString()}`;
    return `<button class="contract-card ${contract.outputKind}" data-contract="${contract.id}" ${estimate.units <= 0 ? "disabled" : ""}>
      <span class="contract-code">${contract.code}</span>
      <em class="contract-purpose">${contract.outputLabel}</em>
      <span class="contract-copy"><b>${contract.name}</b><small>${contract.description}</small></span>
      <span class="contract-rates">투입 ${acceptedClouds.map((cloud) => cloud.icon).join(" ")} · ${quotaLabel}</span>
      <span class="contract-process"><b>${estimate.units} UNIT · ${estimate.batches}묶음</b><small>예상 ${processingTime(estimate.seconds)}</small></span>
      <strong class="contract-payout">${estimate.units > 0 ? `예상 ${rewardLabel} · 배정` : contract.flightLimit && estimate.quotaRemaining === 0 ? "이번 비행 주문 완료" : "맞는 화물 없음"}</strong>
    </button>`;
  }).join("");
  factoryOverlay.classList.add("show");
}

function showLevelUp(_pendingPicks: number): void {
  const state = game.getRunState();
  const companyState = game.getState();
  const stock = companyState.materials;
  const totalStock = (Object.values(stock) as number[]).reduce((total, amount) => total + amount, 0);
  const investedNodes = (Object.keys(state.skills) as RunSkillId[]).filter((id) => state.skills[id] > 0).length;
  const finiteTreeComplete = allSkillsUnlocked(state.skills);
  if (finiteTreeComplete && !infiniteResearchUnlockedPreviously) activeSkillTreeTab = "infinite";
  if (!finiteTreeComplete) activeSkillTreeTab = "blueprint";
  infiniteResearchUnlockedPreviously = finiteTreeComplete;
  skillBlueprintTab.classList.toggle("active", activeSkillTreeTab === "blueprint");
  infiniteResearchTab.classList.toggle("active", activeSkillTreeTab === "infinite");
  infiniteResearchTab.disabled = !finiteTreeComplete;
  const infiniteTabHint = infiniteResearchTab.querySelector<HTMLElement>("small");
  if (infiniteTabHint) infiniteTabHint.textContent = finiteTreeComplete ? "반복 가능한 극후반 성장" : `특성 ${investedNodes} / ${Object.keys(RUN_SKILLS).length}`;
  skillTreeTabs.classList.toggle("infinite-unlocked", finiteTreeComplete);
  skillTreeCloseButton.textContent = "기지로 돌아가기";

  if (activeSkillTreeTab === "infinite" && finiteTreeComplete) {
    const mass = cloudMass(stock);
    const totalInfiniteLevel = (Object.values(companyState.infiniteResearch) as number[]).reduce((total, level) => total + level, 0);
    levelUpTitle.textContent = "구름을 태워 한계 너머로 성장하세요";
    levelUpDescription.textContent = "완성된 특성망이 구름을 순수 질량으로 변환합니다. 연구 레벨과 비용에는 상한이 없습니다.";
    skillPointLabel.textContent = "CONVERTIBLE CLOUD MASS";
    skillPointCount.textContent = `총 질량 ${mass.toLocaleString()} · ${CLOUD_ORDER.map((kind) => `${CLOUDS[kind].icon}${stock[kind]}`).join(" ")}`;
    skillPointHint.textContent = "질량 환산: ☁ 1 · 🌧 4 · ⚡ 16 · ❄ 64 · ☀ 256 · ✦ 1,024";
    skillChoices.classList.add("infinite-research-shell");
    skillChoices.innerHTML = `
      <div class="infinite-research-stage">
        <header class="infinite-research-core">
          <div class="infinite-core-orbit"><i></i><i></i><i></i><strong>∞</strong></div>
          <span>LIMIT BREAK LAB</span>
          <h3>무한 연구 반응로</h3>
          <p>모든 특성 시스템이 연결되었습니다. 남는 구름을 투입해 회사 성능을 끝없이 끌어올리세요.</p>
          <b>TOTAL RESEARCH LEVEL ${totalInfiniteLevel.toLocaleString()}</b>
        </header>
        <div class="infinite-research-grid">
          ${(Object.keys(INFINITE_RESEARCH) as InfiniteResearchId[]).map((id) => {
            const research = INFINITE_RESEARCH[id];
            const level = companyState.infiniteResearch[id];
            const cost = infiniteResearchCost(id, level);
            const available = game.canBuyInfiniteResearch(id);
            const missing = Math.max(0, cost - mass);
            return `<button class="infinite-research-card ${available ? "ready" : ""}" data-infinite-research="${id}" style="--research-color:${research.color}" ${available ? "" : "disabled"}>
              <span class="infinite-card-code">${research.code}</span>
              <span class="infinite-card-icon">${research.icon}</span>
              <span class="infinite-card-level"><small>RESEARCH LEVEL</small><strong>${level.toLocaleString()}</strong></span>
              <span class="infinite-card-copy"><strong>${research.name}</strong><p>${research.description}</p></span>
              <span class="infinite-card-output"><small>CURRENT OUTPUT</small><b>${infiniteResearchEffect(id, level)}</b><em>${research.effectPerLevel}</em></span>
              <span class="infinite-card-action">${available ? `구름 질량 ${cost.toLocaleString()} 투입 · LEVEL UP` : `질량 ${missing.toLocaleString()} 부족 · 다음 비용 ${cost.toLocaleString()}`}</span>
            </button>`;
          }).join("")}
        </div>
        <footer class="infinite-research-note"><b>NO LEVEL CAP</b><span>연구 비용은 단계마다 증가하지만 효과는 매 레벨 영구 누적됩니다.</span></footer>
      </div>`;
    levelUpOverlay.classList.add("show");
    return;
  }

  levelUpTitle.textContent = "보관한 구름으로 시스템을 해금하세요";
  levelUpDescription.textContent = "고도가 오를수록 빙정·태양·오로라구름이 열리고, 새로운 구름은 더 깊은 시스템의 재료가 됩니다.";
  skillPointLabel.textContent = "CLOUD STOCKPILE";
  skillPointCount.textContent = CLOUD_ORDER.map((kind) => `${CLOUDS[kind].icon} ${stock[kind]}`).join(" · ");
  skillPointHint.textContent = "상위 구름 1개는 바로 아래 단계 구름 4개 가치로 자동 대체됩니다.";
  skillChoices.classList.remove("infinite-research-shell");
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

function growthMissionProgress(state: GameState, id: GrowthMissionId): number {
  switch (id) {
    case "collect": return state.harvested;
    case "return": return state.growthMission.safeReturns;
    case "contract": return state.growthMission.contractsSigned;
    case "ship": return state.growthMission.shipmentsClaimed;
    case "skill": return (Object.values(state.career.skills) as number[]).filter((level) => level > 0).length;
    case "upgrade": return (Object.values(state.levels) as number[]).reduce((total, level) => total + level, 0);
    case "promote": return state.rank;
    case "rain": return state.growthMission.rainHarvested;
  }
}

function renderGrowthMission(state: GameState): void {
  const step = state.growthMission.step;
  const complete = step >= GROWTH_MISSIONS.length;
  growthMission.classList.toggle("hidden", complete);
  [returnButton, contractList, processingFacilityButton, skillTreeButton, baseGarageButton, promotionCard, launchButton]
    .forEach((element) => element.classList.remove("mission-target"));
  if (complete) return;
  const mission = GROWTH_MISSIONS[step];
  const progress = Math.min(mission.target, growthMissionProgress(state, mission.id));
  growthMissionCode.textContent = mission.code;
  growthMissionTitle.textContent = mission.title;
  growthMissionDescription.textContent = mission.description;
  growthMissionCount.textContent = `${progress.toLocaleString()} / ${mission.target.toLocaleString()}`;
  growthMissionFill.style.width = `${progress / mission.target * 100}%`;
  growthMissionReward.textContent = mission.rewardLabel;
  const missionTargets: Partial<Record<GrowthMissionId, HTMLElement>> = {
    return: returnButton,
    contract: contractList,
    ship: processingFacilityButton,
    skill: skillTreeButton,
    upgrade: baseGarageButton,
    promote: promotionCard,
    rain: launchButton,
  };
  missionTargets[mission.id]?.classList.add("mission-target");
  if (mission.id === "return" || mission.id === "contract") launchButton.classList.add("mission-target");
  if (renderedGrowthMissionStep !== null && renderedGrowthMissionStep !== step) {
    growthMission.classList.remove("advance");
    requestAnimationFrame(() => growthMission.classList.add("advance"));
    window.setTimeout(() => growthMission.classList.remove("advance"), 900);
  }
  renderedGrowthMissionStep = step;
}

function renderState(state: GameState): void {
  money.textContent = Math.floor(state.money).toLocaleString();
  altitude.textContent = RANKS[state.selectedMap].altitude;
  rankName.textContent = RANKS[state.rank].name;
  soundButton.textContent = state.sound ? "🔊" : "🔇";
  if (state.harvested > 2) tutorial.classList.add("hidden");
  const rivalEventReady = state.rank >= 1 && state.story.seen.includes("rainFrontier") && !state.story.rivalBeaten;
  launchButton.classList.toggle("rival-ready", rivalEventReady);
  const launchFacilityCode = launchButton.querySelector<HTMLElement>("b");
  if (launchFacilityCode) launchFacilityCode.textContent = rivalEventReady ? "GO! · LIVE RACE" : "GO · FACILITY 04";
  renderGrowthMission(state);

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
  if (storySystemReady) syncStoryTriggers(state);
}

storyNextButton.addEventListener("click", advanceStory);
storySkipButton.addEventListener("click", finishStoryScene);
storyFrame.addEventListener("click", (event) => {
  if ((event.target as HTMLElement).closest("button")) return;
  advanceStory();
});
window.addEventListener("keydown", (event) => {
  if (!storyOverlay.classList.contains("show")) return;
  if (event.code === "Enter" || event.code === "Space") {
    event.preventDefault();
    advanceStory();
  } else if (event.code === "Escape") {
    event.preventDefault();
    finishStoryScene();
  }
});

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
    const materialUnits = CLOUD_ORDER.reduce((total, kind) => total + result.materialRewards[kind], 0);
    if (!result.flightCompleted) {
      baseHubStatus.textContent = `${contractName} ${result.units}개 배정 · 남은 화물 ${result.cargoRemaining}개도 생산라인을 선택하세요`;
      showFactory(game.getRunState());
      return;
    }
    receiptContract.textContent = `${contractName} 가동 시작`;
    receiptPayout.textContent = `예상 ◈ ${result.payout.toLocaleString()}${materialUnits > 0 ? ` + ◆${materialUnits}` : ""}`;
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
claimProcessingButton.addEventListener("click", () => {
  const output = game.claimProcessedOutput();
  if (output.coins > 0 || output.materialUnits > 0) emitShippingBurst(output.coins + output.materialUnits);
});
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

function renderRouteList(): void {
  const company = game.getState();
  const currentMission = GROWTH_MISSIONS[company.growthMission.step]?.id;
  routeList.innerHTML = RANKS.map((map, mapRank) => {
    const locked = mapRank > company.rank;
    const nextUnlock = mapRank === company.rank + 1;
    const moneyReady = company.money >= map.promotionCost;
    const harvestReady = company.rankHarvested >= map.requiredHarvest;
    const returnReady = company.rankFlights >= 1;
    const canUnlock = nextUnlock && game.canPromote();
    const missionTarget = currentMission === "promote" && nextUnlock;
    const clouds = (Object.keys(map.weights) as (keyof typeof map.weights)[])
      .filter((kind) => map.weights[kind] > 0)
      .map((kind) => `${CLOUDS[kind].icon}${Math.round(map.weights[kind] * 100)}%`)
      .join(" · ");
    const payout = map.valueMultiplier * FLIGHT_ROUTES[map.routeId].valueMultiplier;
    const rivalEvent = mapRank === 1 && !locked && company.story.seen.includes("rainFrontier") && !company.story.rivalBeaten;
    const cardContents = `
      <span class="route-visual">${locked ? "🔒" : map.icon}</span>
      <span class="route-code">${map.code}</span>
      <small>${locked ? nextUnlock ? "NEXT ALTITUDE" : "LOCKED ALTITUDE" : mapRank === company.rank ? "FRONTIER MAP" : "UNLOCKED MAP"}</small>
      <strong>${map.name}</strong>
      <p>${map.description}</p>
      <b>연료 소모 ×${map.fuelDrain.toFixed(2)} · 수익 ×${payout.toFixed(2)}</b>
      <span class="route-clouds">${clouds}</span>
      ${rivalEvent ? `<span class="route-rival-event"><i>LIVE EVENT</i> 비구름 5개 선점 경쟁 · 전용 계약 보상</span>` : ""}
      <span class="route-identity">${map.identity}</span>`;

    if (locked) {
      return `
        <article class="route-card map-${mapRank} locked ${nextUnlock ? "next-unlock" : ""} ${missionTarget ? "mission-route-target" : ""}" style="--route-color:${map.color}">
          ${cardContents}
          ${nextUnlock ? `
            <div class="route-unlock-requirements" aria-label="${map.name} 해금 조건">
              <span class="${moneyReady ? "done" : ""}">◈ ${Math.floor(company.money).toLocaleString()} / ${map.promotionCost.toLocaleString()}</span>
              <span class="${harvestReady ? "done" : ""}">☁ 납품 ${company.rankHarvested.toLocaleString()} / ${map.requiredHarvest.toLocaleString()}</span>
              <span class="${returnReady ? "done" : ""}">↩ 안전 귀환 ${company.rankFlights} / 1</span>
            </div>
            <button class="route-unlock-button" data-promote-map="${mapRank}" ${canUnlock ? "" : "disabled"}>
              ${canUnlock ? `${map.altitude} 고도 해금` : "승급 조건 미달"}
            </button>` : `<em>직전 고도를 먼저 해금해야 합니다</em>`}
        </article>`;
    }

    return `
      <button class="route-card map-${mapRank} ${company.selectedMap === mapRank ? "selected" : ""}" data-map="${mapRank}" style="--route-color:${map.color}">
        ${cardContents}
        <em>${company.selectedMap === mapRank ? "현재 선택 · 다시 출격" : "이 고도로 출격"}</em>
      </button>`;
  }).join("");
}

launchButton.addEventListener("click", () => {
  renderRouteList();
  routeOverlay.classList.add("show");
});
routeBackButton.addEventListener("click", () => routeOverlay.classList.remove("show"));
routeList.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const unlockButton = target.closest<HTMLButtonElement>("[data-promote-map]");
  if (unlockButton) {
    const targetRank = Number(unlockButton.dataset.promoteMap);
    if (targetRank !== game.getState().rank + 1 || !game.promote()) return;
    renderRouteList();
    return;
  }

  const button = target.closest<HTMLButtonElement>("[data-map]");
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
skillTreeTabs.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-tree-tab]");
  if (!button || button.disabled) return;
  activeSkillTreeTab = button.dataset.treeTab === "infinite" ? "infinite" : "blueprint";
  skillHoverCard.classList.remove("show");
  showLevelUp(0);
});
skillChoices.addEventListener("click", (event) => {
  const target = event.target as HTMLElement;
  const researchButton = target.closest<HTMLButtonElement>("[data-infinite-research]");
  if (researchButton) {
    const id = researchButton.dataset.infiniteResearch as InfiniteResearchId;
    if (game.buyInfiniteResearch(id)) showLevelUp(0);
    return;
  }
  const button = target.closest<HTMLButtonElement>("[data-skill]");
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
