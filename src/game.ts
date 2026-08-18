import { CLOUDS, INITIAL_STATE, RANKS, RUN_SKILLS, UPGRADES, upgradeCost } from "./config";
import type { Cloud, CloudKind, FloatingText, GameState, Particle, RunSkillId, RunState, UpgradeId } from "./types";

type StateListener = (state: GameState) => void;
type RunListener = (state: RunState) => void;
type LevelListener = (choices: RunSkillId[], pendingPicks: number) => void;
type ToastListener = (message: string, tone?: "normal" | "success" | "warning") => void;
type Shockwave = { x: number; y: number; radius: number; life: number; maxLife: number; color: string };

const SAVE_KEY = "cloud-harvest-inc-save-v2";
const RUN_SKILL_IDS = Object.keys(RUN_SKILLS) as RunSkillId[];

const freshRunState = (): RunState => ({
  level: 1,
  xp: 0,
  xpNext: 6,
  fever: 0,
  feverActive: false,
  feverSeconds: 0,
  combo: 0,
  comboTime: 0,
  pendingPicks: 0,
  skills: { overclock: 0, wideIntake: 0, chainBurst: 0, profitRain: 0, feverDrive: 0, twinDrone: 0 },
});

export class CloudHarvestGame {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly onStateChange: StateListener;
  private readonly onRunChange: RunListener;
  private readonly onLevelUp: LevelListener;
  private readonly onToast: ToastListener;
  private state: GameState;
  private run = freshRunState();
  private clouds: Cloud[] = [];
  private particles: Particle[] = [];
  private texts: FloatingText[] = [];
  private shockwaves: Shockwave[] = [];
  private width = 960;
  private height = 640;
  private dpr = 1;
  private lastTime = 0;
  private spawnTimer = 0;
  private cloudId = 0;
  private running = true;
  private pausedForLevel = false;
  private player = { x: 480, y: 380, targetX: 480, targetY: 380 };
  private pointer = { x: 480, y: 380, active: false, visible: false };
  private overload = 0;
  private shockToastCooldown = 0;
  private combo = 0;
  private comboTimer = 0;
  private shake = 0;
  private impactFlash = 0;
  private impactFreeze = 0;
  private comboPunch = 0;
  private rankReveal = 0;
  private frontTimer = 14;
  private frontActive = 0;
  private frontBanner = 0;
  private frontDirection: 1 | -1 = 1;
  private droneAngle = 0;
  private runEmitTimer = 0;
  private audioContext?: AudioContext;

  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: StateListener,
    onRunChange: RunListener,
    onLevelUp: LevelListener,
    onToast: ToastListener,
  ) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context를 사용할 수 없습니다.");
    this.ctx = context;
    this.onStateChange = onStateChange;
    this.onRunChange = onRunChange;
    this.onLevelUp = onLevelUp;
    this.onToast = onToast;
    this.state = this.loadState();
    this.bindInput();
    this.resize();
    window.addEventListener("resize", () => this.resize());
    for (let i = 0; i < 12; i += 1) this.spawnCloud(true);
    this.emitAll();
    requestAnimationFrame((time) => this.frame(time));
  }

  getState(): GameState { return structuredClone(this.state); }
  getRunState(): RunState { return structuredClone(this.run); }

  getUpgradeCost(id: UpgradeId): number {
    const upgrade = UPGRADES.find((item) => item.id === id);
    return upgrade ? upgradeCost(upgrade.baseCost, this.state.levels[id]) : Number.POSITIVE_INFINITY;
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
    this.burst(this.player.x, this.player.y, "#ffd166", 22, 150);
    this.playTone(520 + this.state.levels[id] * 40, 0.09);
    this.onToast(`${upgrade.name} Lv.${this.state.levels[id]} 장착!`, "success");
    this.commit();
  }

  chooseSkill(id: RunSkillId): boolean {
    if (!this.pausedForLevel || this.run.skills[id] >= RUN_SKILLS[id].maxStacks) return false;
    this.run.skills[id] += 1;
    this.run.pendingPicks = Math.max(0, this.run.pendingPicks - 1);
    this.burst(this.player.x, this.player.y, RUN_SKILLS[id].color, 36, 210);
    this.playChord();
    this.onRunChange(this.getRunState());
    if (this.run.pendingPicks > 0) {
      window.setTimeout(() => this.presentLevelUp(), 140);
      return false;
    }
    this.pausedForLevel = false;
    this.onToast(`${RUN_SKILLS[id].name} 장착 — 비행 재개!`, "success");
    return true;
  }

  canPromote(): boolean {
    const next = RANKS[this.state.rank + 1];
    return Boolean(next && this.state.money >= next.promotionCost && this.state.harvested >= next.requiredHarvest);
  }

  promote(): void {
    const next = RANKS[this.state.rank + 1];
    if (!next) return;
    if (!this.canPromote()) {
      this.onToast("승급 조건을 조금 더 채워주세요.", "warning");
      return;
    }
    this.state.money -= next.promotionCost;
    this.state.rank += 1;
    this.clouds = [];
    for (let i = 0; i < 12 + this.state.rank * 3; i += 1) this.spawnCloud(true);
    this.shake = 18;
    this.impactFlash = .65;
    this.rankReveal = 3.2;
    this.burst(this.width / 2, this.height / 2, "#fff4a8", 85, 260);
    const unlocked = this.state.rank === 1 ? "비구름" : "전기구름";
    this.onToast(`${next.name} 진입! ${unlocked} 출현!`, "success");
    this.playChord();
    this.commit();
  }

  toggleSound(): void { this.state.sound = !this.state.sound; this.commit(); }

  reset(): void {
    localStorage.removeItem(SAVE_KEY);
    this.state = structuredClone(INITIAL_STATE);
    this.run = freshRunState();
    this.pausedForLevel = false;
    this.clouds = [];
    this.combo = 0;
    for (let i = 0; i < 12; i += 1) this.spawnCloud(true);
    this.emitAll();
    this.onToast("새로운 수확 비행선이 출격했습니다.");
  }

  destroy(): void { this.running = false; }

  private bindInput(): void {
    const point = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: ((event.clientX - rect.left) / rect.width) * this.width, y: ((event.clientY - rect.top) / rect.height) * this.height };
    };
    this.canvas.addEventListener("pointerdown", (event) => {
      const p = point(event);
      this.pointer = { x: p.x, y: p.y, active: true, visible: true };
      this.player.targetX = p.x;
      this.player.targetY = p.y;
      this.canvas.setPointerCapture(event.pointerId);
      this.ensureAudio();
    });
    this.canvas.addEventListener("pointermove", (event) => {
      const p = point(event);
      this.pointer.x = p.x;
      this.pointer.y = p.y;
      this.pointer.visible = true;
      this.player.targetX = p.x;
      this.player.targetY = p.y;
    });
    const release = () => { this.pointer.active = false; };
    this.canvas.addEventListener("pointerup", release);
    this.canvas.addEventListener("pointercancel", release);
    this.canvas.addEventListener("pointerleave", () => { if (!this.pointer.active) this.pointer.visible = false; });
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.width = rect.width;
    this.height = rect.height;
    if (!this.pointer.visible) {
      this.player.x = this.width * 0.5;
      this.player.y = this.height * 0.55;
      this.player.targetX = this.player.x;
      this.player.targetY = this.player.y;
    }
  }

  private frame(time: number): void {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000 || 0, 0.033);
    this.lastTime = time;
    if (this.impactFreeze > 0) this.impactFreeze -= dt;
    else if (!this.pausedForLevel) this.update(dt);
    this.render(time / 1000);
    requestAnimationFrame((next) => this.frame(next));
  }

  private update(dt: number): void {
    this.spawnTimer -= dt;
    const maxClouds = 16 + this.state.rank * 5;
    if (this.spawnTimer <= 0 && this.clouds.length < maxClouds) {
      this.spawnCloud(false);
      this.spawnTimer = Math.max(0.28, 0.88 - this.state.rank * 0.12);
    }

    const follow = 1 - Math.exp(-dt * 9);
    this.player.targetX = Math.max(55, Math.min(this.width - 55, this.player.targetX));
    this.player.targetY = Math.max(100, Math.min(this.height - 150, this.player.targetY));
    this.player.x += (this.player.targetX - this.player.x) * follow;
    this.player.y += (this.player.targetY - this.player.y) * follow;
    this.overload = Math.max(0, this.overload - dt);
    this.shockToastCooldown = Math.max(0, this.shockToastCooldown - dt);
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    this.run.combo = this.combo;
    this.run.comboTime = Math.max(0, this.comboTimer);
    this.shake = Math.max(0, this.shake - dt * 30);
    this.impactFlash = Math.max(0, this.impactFlash - dt * 4.6);
    this.comboPunch = Math.max(0, this.comboPunch - dt * 3.8);
    this.rankReveal = Math.max(0, this.rankReveal - dt);
    this.frontTimer -= dt;
    this.frontActive = Math.max(0, this.frontActive - dt);
    this.frontBanner = Math.max(0, this.frontBanner - dt);
    if (this.frontTimer <= 0) {
      if (!this.clouds.some((cloud) => cloud.front)) this.startCloudFront();
      else this.frontTimer = 5;
    }
    this.droneAngle += dt * 2.2;

    if (this.run.feverActive) {
      this.run.feverSeconds -= dt;
      if (this.run.feverSeconds <= 0) {
        this.run.feverActive = false;
        this.run.fever = 0;
        if (this.run.pendingPicks > 0) {
          this.pausedForLevel = true;
          this.onToast(`피버 정산 — 장비 ${this.run.pendingPicks}개 선택`, "success");
          window.setTimeout(() => this.presentLevelUp(), 240);
        } else this.onToast("피버 종료 — 다시 게이지를 채우세요!");
      }
    }
    const radius = 112 + this.state.levels.radius * 18 + this.run.skills.wideIntake * 34;
    const basePower = 36 + this.state.levels.power * 15;
    const skillPower = 1 + this.run.skills.overclock * 0.45;
    const feverPower = this.run.feverActive ? 2.65 : 1;
    const overloadPower = this.overload > 0 ? 0.22 : 1;
    const suctionPower = basePower * skillPower * feverPower * overloadPower;
    const collected: Cloud[] = [];

    for (const cloud of this.clouds) {
      cloud.age += dt;
      cloud.hurtFlash = Math.max(0, cloud.hurtFlash - dt * 5);
      cloud.vx += Math.sin(cloud.phase + cloud.age * 0.6) * dt * 3;
      cloud.vy += Math.cos(cloud.phase + cloud.age * 0.48) * dt * 2;

      if (this.pointer.active) {
        const dx = this.player.x - cloud.x;
        const dy = this.player.y - cloud.y;
        const distance = Math.hypot(dx, dy) || 1;
        if (distance < radius + cloud.radius) {
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
      if (cloud.front && cloud.x > this.width - 410 && cloud.y < 350) cloud.vy += 90 * dt;
      const drag = cloud.front && this.frontActive > 0 ? .993 : .955;
      cloud.vx *= Math.pow(drag, dt * 60);
      cloud.vy *= Math.pow(drag, dt * 60);
      cloud.x += cloud.vx * dt;
      cloud.y += cloud.vy * dt;
      const margin = cloud.radius + 4;
      if (cloud.x < margin) { cloud.x = margin; cloud.vx = Math.abs(cloud.vx) * 0.6; }
      if (cloud.x > this.width - margin) { cloud.x = this.width - margin; cloud.vx = -Math.abs(cloud.vx) * 0.6; }
      if (cloud.y < 88 + margin) { cloud.y = 88 + margin; cloud.vy = Math.abs(cloud.vy) * 0.6; }
      if (cloud.y > this.height - 125 - margin) { cloud.y = this.height - 125 - margin; cloud.vy = -Math.abs(cloud.vy) * 0.6; }
    }

    this.updateDrones(dt);
    for (const cloud of collected) if (this.clouds.some((item) => item.id === cloud.id)) this.collectCloud(cloud);

    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
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
    this.runEmitTimer -= dt;
    if (this.runEmitTimer <= 0) { this.onRunChange(this.getRunState()); this.runEmitTimer = 0.08; }
  }

  private updateDrones(dt: number): void {
    const count = this.state.levels.drone + this.run.skills.twinDrone;
    if (count <= 0 || this.clouds.length === 0) return;
    for (let index = 0; index < Math.min(4, count); index += 1) {
      const angle = this.droneAngle + index * (Math.PI * 2 / Math.min(4, count));
      const x = this.player.x + Math.cos(angle) * 70;
      const y = this.player.y + Math.sin(angle) * 50;
      let target: Cloud | undefined;
      let nearest = 230;
      for (const cloud of this.clouds) {
        const distance = Math.hypot(cloud.x - x, cloud.y - y);
        if (distance < nearest) { nearest = distance; target = cloud; }
      }
      if (!target) continue;
      target.health -= dt * (7 + count * 3);
      target.hurtFlash = 0.6;
      if (target.health <= 0) this.collectCloud(target);
      if (Math.random() < dt * 12) this.particles.push({ x, y, vx: (target.x - x) * 1.4, vy: (target.y - y) * 1.4, life: .26, maxLife: .26, size: 2, color: "#6ff6e2" });
    }
  }

  private triggerElectric(cloud: Cloud): void {
    if (this.state.levels.insulation > 0) {
      cloud.health -= 18 * this.state.levels.insulation;
      this.texts.push({ x: cloud.x, y: cloud.y, text: "절연 반사!", color: "#fff07d", life: .8 });
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

  private collectCloud(cloud: Cloud): void {
    if (!this.clouds.some((item) => item.id === cloud.id)) return;
    this.clouds = this.clouds.filter((item) => item.id !== cloud.id);
    const definition = CLOUDS[cloud.kind];
    this.combo = this.comboTimer > 0 ? this.combo + 1 : 1;
    this.comboTimer = 3.4;
    this.state.bestCombo = Math.max(this.state.bestCombo, this.combo);
    const comboMultiplier = 1 + Math.min(1.8, Math.floor(this.combo / 3) * .17);
    const permanentValue = 1 + this.state.levels.value * .24;
    const runValue = 1 + this.run.skills.profitRain * .4;
    const insulationValue = cloud.kind === "electric" && this.state.levels.insulation > 0 ? 1.5 : 1;
    const densityValue = cloud.dense ? 3 : 1;
    const earned = Math.round(definition.value * comboMultiplier * permanentValue * runValue * insulationValue * densityValue);
    this.state.money += earned;
    this.state.totalEarned += earned;
    this.state.harvested += 1;
    const baseXp = cloud.kind === "cumulus" ? 2 : cloud.kind === "rain" ? 5 : 9;
    const xp = cloud.dense ? baseXp * 2 : baseXp;
    this.run.xp += xp;
    const feverGain = (12 + Math.min(10, this.combo)) * (1 + this.run.skills.feverDrive * .35);
    if (!this.run.feverActive) this.run.fever = Math.min(100, this.run.fever + feverGain);
    if (this.run.fever >= 100 && !this.run.feverActive) this.startFever();

    this.texts.push({ x: cloud.x, y: cloud.y, text: `${cloud.dense ? "DENSE  " : ""}+${earned}  +${xp}XP`, color: cloud.dense || cloud.kind === "electric" ? "#fff27a" : "#ffffff", life: 1.15 });
    if (this.combo >= 3) this.texts.push({ x: cloud.x, y: cloud.y + 28, text: `${this.combo} COMBO!`, color: "#ffdf70", life: .9 });
    this.burst(cloud.x, cloud.y, definition.color, 24 + Math.min(34, this.combo * 2), 270);
    this.burst(cloud.x, cloud.y, "#ffd15e", 8 + Math.min(14, this.combo), 330);
    this.shockwaves.push({ x: cloud.x, y: cloud.y, radius: 12, life: .42, maxLife: .42, color: definition.color });
    this.shockwaves.push({ x: cloud.x, y: cloud.y, radius: 3, life: .22, maxLife: .22, color: "#ffffff" });
    this.shake = Math.min(18, 4 + this.combo * .8);
    this.impactFlash = Math.min(.8, .22 + this.combo * .025);
    this.impactFreeze = Math.min(.075, .025 + this.combo * .002);
    this.comboPunch = 1;
    this.playTone(290 + Math.min(590, this.combo * 31) + definition.value * 2, .055);

    if (this.combo % 5 === 0) this.triggerPressureSurge(cloud.x, cloud.y);
    if (cloud.front && !this.clouds.some((item) => item.front)) this.completeCloudFront(cloud.x, cloud.y);

    const chainStacks = this.run.skills.chainBurst;
    if (chainStacks > 0) {
      const chainRadius = 105 + chainStacks * 35;
      for (const nearby of this.clouds) {
        const distance = Math.hypot(nearby.x - cloud.x, nearby.y - cloud.y);
        if (distance < chainRadius) {
          nearby.health -= 11 + chainStacks * 12;
          nearby.hurtFlash = 1;
          const dx = nearby.x - cloud.x;
          const dy = nearby.y - cloud.y;
          const length = Math.hypot(dx, dy) || 1;
          nearby.vx += dx / length * 85;
          nearby.vy += dy / length * 85;
        }
      }
    }
    this.commit();
    this.onRunChange(this.getRunState());
    this.bankLevelUps();
  }

  private bankLevelUps(): void {
    while (this.run.xp >= this.run.xpNext) {
      this.run.xp -= this.run.xpNext;
      this.run.level += 1;
      this.run.xpNext = Math.round(6 + (this.run.level - 1) * 4.5);
      this.run.pendingPicks += 1;
    }
    this.onRunChange(this.getRunState());
    if (!this.run.feverActive) this.presentLevelUp();
  }

  private presentLevelUp(): void {
    if (this.run.pendingPicks <= 0) return;
    const available = RUN_SKILL_IDS.filter((id) => this.run.skills[id] < RUN_SKILLS[id].maxStacks);
    const shuffled = [...available].sort(() => Math.random() - .5);
    const choices = shuffled.slice(0, Math.min(3, shuffled.length));
    if (choices.length === 0) {
      this.run.pendingPicks = 0;
      this.pausedForLevel = false;
      return;
    }
    this.pausedForLevel = true;
    this.onRunChange(this.getRunState());
    this.onLevelUp(choices, this.run.pendingPicks);
  }

  private triggerPressureSurge(x: number, y: number): void {
    const bonus = this.combo * 3;
    this.state.money += bonus;
    this.state.totalEarned += bonus;
    if (!this.run.feverActive) {
      this.run.fever = Math.min(100, this.run.fever + 18);
      if (this.run.fever >= 100) this.startFever();
    }
    for (const nearby of this.clouds) {
      const distance = Math.hypot(nearby.x - x, nearby.y - y);
      if (distance > 250) continue;
      const force = 1 - distance / 250;
      nearby.health = Math.max(1, nearby.health - (14 + this.combo * 1.5) * force);
      nearby.hurtFlash = 1;
      const dx = nearby.x - x; const dy = nearby.y - y; const length = Math.hypot(dx, dy) || 1;
      nearby.vx += dx / length * 150 * force;
      nearby.vy += dy / length * 150 * force;
    }
    this.texts.push({ x, y: y - 35, text: `PRESSURE SURGE  +${bonus}`, color: "#fff36f", life: 1.45 });
    this.shockwaves.push({ x, y, radius: 28, life: .78, maxLife: .78, color: "#fff36f" });
    this.burst(x, y, "#fff36f", 42, 390);
    this.shake = 20;
    this.impactFlash = .9;
    this.impactFreeze = .085;
    this.playChord();
  }

  private completeCloudFront(x: number, y: number): void {
    const bonus = 45 + this.state.rank * 35;
    this.state.money += bonus;
    this.state.totalEarned += bonus;
    if (!this.run.feverActive) {
      this.run.fever = Math.min(100, this.run.fever + 28);
      if (this.run.fever >= 100) this.startFever();
    }
    this.frontActive = 0;
    this.frontBanner = 2.4;
    this.texts.push({ x, y: y - 42, text: `FRONT CLEARED  +${bonus}`, color: "#8fffe4", life: 1.8 });
    this.shockwaves.push({ x, y, radius: 40, life: 1, maxLife: 1, color: "#71ffe0" });
    this.shockwaves.push({ x, y, radius: 16, life: .72, maxLife: .72, color: "#fff36f" });
    this.burst(x, y, "#71ffe0", 65, 430);
    this.burst(x, y, "#fff36f", 35, 360);
    this.shake = 22;
    this.impactFlash = 1;
    this.impactFreeze = .1;
    this.playChord();
  }

  private startFever(): void {
    this.run.feverActive = true;
    this.run.feverSeconds = 7 + this.run.skills.feverDrive * 2.5;
    this.shake = 18;
    this.impactFlash = .85;
    this.comboPunch = 1;
    this.onToast("🌈 SKY FEVER! 흡입력 265%", "success");
    this.burst(this.player.x, this.player.y, "#fff36f", 65, 310);
    this.playChord();
  }

  private spawnCloud(initial: boolean): void {
    const rank = RANKS[this.state.rank];
    const roll = Math.random();
    let cursor = 0;
    let kind: CloudKind = "cumulus";
    for (const candidate of Object.keys(rank.weights) as CloudKind[]) {
      cursor += rank.weights[candidate];
      if (roll <= cursor) { kind = candidate; break; }
    }
    const definition = CLOUDS[kind];
    const dense = Math.random() < .085 + this.state.rank * .018;
    const radius = (definition.radius[0] + Math.random() * (definition.radius[1] - definition.radius[0])) * (dense ? 1.16 : 1);
    const scale = radius / ((definition.radius[0] + definition.radius[1]) * .5);
    let x = 90 + Math.random() * Math.max(100, this.width - 180);
    let y = 205 + Math.random() * Math.max(90, this.height - 390);
    const interiorSpawn = initial || Math.random() < .78;
    if (interiorSpawn) {
      for (let attempt = 0; attempt < 6 && Math.hypot(x - this.player.x, y - this.player.y) < 175; attempt += 1) {
        x = 90 + Math.random() * Math.max(100, this.width - 180);
        y = 205 + Math.random() * Math.max(90, this.height - 390);
      }
      if (x > this.width - 405 && y < 345) y = 350 + Math.random() * Math.max(60, this.height - 500);
    } else {
      const side = Math.floor(Math.random() * 3);
      if (side === 0) { x = radius + 4; y = 220 + Math.random() * Math.max(80, this.height - 410); }
      if (side === 1) { x = this.width - radius - 4; y = 350 + Math.random() * Math.max(55, this.height - 520); }
      if (side === 2) { y = 180 + radius; x = 85 + Math.random() * Math.max(100, this.width - 540); }
    }
    const health = definition.health * scale * (dense ? 1.65 : 1);
    this.clouds.push({ id: ++this.cloudId, kind, x, y, vx: (Math.random() - .5) * 8, vy: (Math.random() - .5) * 6, radius, phase: Math.random() * Math.PI * 2, charged: false, age: initial ? .6 + Math.random() * 4.4 : 0, health, maxHealth: health, hurtFlash: 0, dense, front: false });
  }

  private startCloudFront(): void {
    this.frontTimer = Math.max(24, 36 - this.state.rank * 4);
    this.frontActive = 11;
    this.frontBanner = 3.2;
    this.frontDirection = Math.random() < .5 ? 1 : -1;
    const count = 7 + this.state.rank * 2;
    for (let index = 0; index < count; index += 1) {
      this.spawnCloud(false);
      const cloud = this.clouds[this.clouds.length - 1];
      cloud.front = true;
      cloud.x = this.frontDirection === 1 ? -cloud.radius : this.width + cloud.radius;
      const rows = Math.min(5, count);
      const routeTop = this.frontDirection === -1 ? 350 : 215;
      const routeBottom = Math.max(routeTop + 80, this.height - 165);
      cloud.y = routeTop + (index % rows) * ((routeBottom - routeTop) / Math.max(1, rows - 1)) + Math.floor(index / rows) * 18;
      cloud.vx = this.frontDirection * (62 + Math.random() * 32);
      cloud.vy = (Math.random() - .5) * 9;
    }
    this.shake = 10;
    this.playTone(145, .28);
  }

  private suctionParticle(cloud: Cloud): void {
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
    const sx = this.shake ? (Math.random() - .5) * this.shake : 0;
    const sy = this.shake ? (Math.random() - .5) * this.shake : 0;
    ctx.save();
    ctx.translate(sx, sy);
    this.drawSky(ctx, time);
    this.drawIsland(ctx);
    if (this.pointer.active) this.drawSuctionField(ctx, time);
    for (const cloud of this.clouds) this.drawCloud(ctx, cloud, time);
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
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.min(1, particle.life / particle.maxLife);
      const speed = Math.hypot(particle.vx, particle.vy);
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
    this.drawImpactOverlay(ctx, time);
    ctx.restore();
  }

  private drawSky(ctx: CanvasRenderingContext2D, time: number): void {
    const gradients = this.run.feverActive
      ? ["#7e73f2", "#64dfe3", "#fff0a8"]
      : this.state.rank === 2 ? ["#606fbd", "#a9cce5", "#f5ddb1"]
        : this.state.rank === 1 ? ["#4fa7c6", "#b8e0e9", "#e9e3bd"]
          : ["#75d7f5", "#dff8ff", "#fff4c9"];
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, gradients[0]); gradient.addColorStop(.7, gradients[1]); gradient.addColorStop(1, gradients[2]);
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = this.run.feverActive ? .35 : .16;
    ctx.fillStyle = "#fff";
    for (let i = 0; i < 24; i += 1) {
      const x = ((i * 149 + time * (9 + i % 4)) % (this.width + 100)) - 50;
      const y = 80 + (i * 71) % Math.max(110, this.height - 220);
      ctx.beginPath(); ctx.arc(x, y, 2 + i % 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (this.state.rank >= 1 && !this.run.feverActive) {
      ctx.strokeStyle = this.state.rank === 2 ? "rgba(191,210,255,.22)" : "rgba(255,255,255,.2)";
      ctx.lineWidth = this.state.rank === 2 ? 2 : 1.5;
      for (let i = 0; i < 34; i += 1) {
        const x = (i * 91 + time * (this.state.rank === 2 ? 145 : 85)) % (this.width + 160) - 80;
        const y = 110 + (i * 53) % Math.max(120, this.height - 250);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 12, y + 30); ctx.stroke();
      }
    }
    if (this.run.feverActive) {
      const pulse = .76 + Math.sin(time * 7) * .08;
      const halo = ctx.createRadialGradient(this.player.x, this.player.y, 20, this.player.x, this.player.y, Math.max(this.width, this.height) * .72);
      halo.addColorStop(0, `rgba(255,247,126,${pulse * .32})`);
      halo.addColorStop(.45, "rgba(113,245,236,.09)"); halo.addColorStop(1, "rgba(130,86,232,0)");
      ctx.fillStyle = halo; ctx.fillRect(0, 0, this.width, this.height);
      ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = 3;
      for (let i = 0; i < 18; i += 1) {
        const angle = i * Math.PI * 2 / 18 + time * .35;
        const inner = 95 + (i % 3) * 18; const outer = Math.max(this.width, this.height) * .8;
        ctx.beginPath(); ctx.moveTo(this.player.x + Math.cos(angle) * inner, this.player.y + Math.sin(angle) * inner);
        ctx.lineTo(this.player.x + Math.cos(angle) * outer, this.player.y + Math.sin(angle) * outer); ctx.stroke();
      }
    }
    if (this.frontActive > 0) {
      ctx.strokeStyle = "rgba(222,255,250,.58)"; ctx.lineWidth = 2.5;
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
    const y = this.height - 68;
    ctx.fillStyle = "#7fce64";
    ctx.beginPath(); ctx.ellipse(this.width * .48, y, this.width * .52, 72, 0, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#73b754"; ctx.fillRect(0, y, this.width, this.height - y);
    const buildings = Math.min(8, 2 + Math.floor(this.state.totalEarned / 100));
    for (let i = 0; i < buildings; i += 1) {
      const bx = 38 + i * 58; const bh = 23 + i % 3 * 11;
      ctx.fillStyle = ["#fff0b8", "#ffb5a7", "#bde0fe"][i % 3]; ctx.fillRect(bx, y - bh, 36, bh);
      ctx.fillStyle = "#594f62"; ctx.beginPath(); ctx.moveTo(bx - 4, y - bh); ctx.lineTo(bx + 18, y - bh - 15); ctx.lineTo(bx + 40, y - bh); ctx.fill();
    }
  }

  private drawCloud(ctx: CanvasRenderingContext2D, cloud: Cloud, time: number): void {
    const definition = CLOUDS[cloud.kind];
    const healthRatio = Math.max(0, cloud.health / cloud.maxHealth);
    const damageRatio = Math.max(.42, healthRatio);
    const pulse = cloud.hurtFlash > 0 ? 1 + Math.sin(time * 45) * .055 : 1;
    const suctionRadius = 112 + this.state.levels.radius * 18 + this.run.skills.wideIntake * 34;
    const toPlayerX = this.player.x - cloud.x;
    const toPlayerY = this.player.y - cloud.y;
    const playerDistance = Math.hypot(toPlayerX, toPlayerY);
    const beingSucked = this.pointer.active && playerDistance < suctionRadius + cloud.radius;
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
    ctx.shadowColor = cloud.hurtFlash > 0 ? "rgba(255,255,255,.85)" : "rgba(31,82,118,.2)"; ctx.shadowBlur = cloud.hurtFlash > 0 ? 25 : 14; ctx.shadowOffsetY = 7;
    ctx.fillStyle = definition.shadow; this.cloudPath(ctx, cloud.radius, 4); ctx.fill();
    ctx.shadowColor = "transparent"; ctx.translate(0, -4); ctx.fillStyle = definition.color; this.cloudPath(ctx, cloud.radius, 0); ctx.fill();
    const shine = ctx.createRadialGradient(-cloud.radius * .3, -cloud.radius * .35, 1, 0, 0, cloud.radius);
    shine.addColorStop(0, "rgba(255,255,255,.8)"); shine.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = shine; this.cloudPath(ctx, cloud.radius, 0); ctx.fill();
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
    if (cloud.front) {
      ctx.strokeStyle = "#6ff6e2"; ctx.lineWidth = 2.5;
      ctx.setLineDash([7, 5]); ctx.lineDashOffset = time * 28;
      ctx.beginPath(); ctx.ellipse(0, 0, cloud.radius * 1.06, cloud.radius * .82, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#163f55";
      for (let marker = -1; marker <= 1; marker += 1) {
        const mx = marker * 12;
        ctx.beginPath(); ctx.moveTo(mx - 5, -cloud.radius * .9); ctx.lineTo(mx, -cloud.radius * 1.04); ctx.lineTo(mx + 5, -cloud.radius * .9); ctx.closePath(); ctx.fill();
      }
    }
    if (cloud.kind === "rain") { ctx.fillStyle = "#3d8cca"; for (let i = -1; i <= 1; i += 1) { ctx.beginPath(); ctx.ellipse(i * 13, cloud.radius * .65, 3, 7, .4, 0, Math.PI * 2); ctx.fill(); } }
    if (cloud.kind === "electric") { ctx.strokeStyle = "#ffe45e"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(2, cloud.radius * .2); ctx.lineTo(-8, cloud.radius * .56); ctx.lineTo(3, cloud.radius * .5); ctx.lineTo(-2, cloud.radius * .9); ctx.lineTo(14, cloud.radius * .4); ctx.stroke(); }
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
      ctx.fillStyle = cloud.kind === "electric" ? "#ffe45e" : "#fff"; ctx.fillRect(cloud.x - width / 2, cloud.y + cloud.radius + 12, width * Math.max(0, cloud.health / cloud.maxHealth), 5);
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

  private drawSuctionField(ctx: CanvasRenderingContext2D, time: number): void {
    const radius = 112 + this.state.levels.radius * 18 + this.run.skills.wideIntake * 34;
    const gradient = ctx.createRadialGradient(this.player.x, this.player.y, 20, this.player.x, this.player.y, radius);
    gradient.addColorStop(0, this.run.feverActive ? "rgba(255,244,111,.28)" : "rgba(255,255,255,.2)"); gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(this.player.x, this.player.y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = this.overload > 0 ? "rgba(255,215,95,.75)" : this.run.feverActive ? "rgba(255,245,112,.82)" : "rgba(255,255,255,.55)";
    ctx.lineWidth = this.run.feverActive ? 5 : 3; ctx.setLineDash([12, 12]); ctx.lineDashOffset = -time * (this.run.feverActive ? 90 : 48);
    ctx.beginPath(); ctx.arc(this.player.x, this.player.y, radius * (.88 + Math.sin(time * 6) * .03), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, time: number): void {
    const powerLevel = this.state.levels.power;
    const radiusLevel = this.state.levels.radius;
    const valueLevel = this.state.levels.value;
    const insulationLevel = this.state.levels.insulation;
    const totalParts = powerLevel + radiusLevel + valueLevel + this.state.levels.drone + insulationLevel;
    const shipScale = 1 + Math.min(.25, totalParts * .018);
    ctx.save(); ctx.translate(this.player.x, this.player.y + Math.sin(time * 4) * 3); ctx.scale(shipScale, shipScale);
    if (this.run.feverActive) { ctx.shadowColor = "#fff36f"; ctx.shadowBlur = 34; }

    ctx.fillStyle = "rgba(24,65,86,.2)"; ctx.beginPath(); ctx.ellipse(0, 34, 57, 13, 0, 0, Math.PI * 2); ctx.fill();

    if (insulationLevel > 0) {
      ctx.strokeStyle = `rgba(134,232,255,${.36 + insulationLevel * .2})`; ctx.lineWidth = 3 + insulationLevel;
      ctx.setLineDash([9, 7]); ctx.lineDashOffset = -time * 38;
      ctx.beginPath(); ctx.ellipse(0, 0, 66, 44, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }

    if (this.pointer.active) {
      const exhaustColor = this.run.feverActive ? "#fff36f" : "#8ff5ff";
      ctx.fillStyle = exhaustColor;
      for (let i = 0; i < 3 + Math.min(3, powerLevel); i += 1) {
        const trail = 16 + ((time * 170 + i * 19) % 34);
        ctx.globalAlpha = .8 - i * .08;
        ctx.beginPath(); ctx.ellipse(-54 - trail, (i - 2) * 5, 12 + powerLevel * 1.5, 3, 0, 0, Math.PI * 2); ctx.fill();
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

    ctx.strokeStyle = "#315c73"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-18, 23); ctx.lineTo(-25, 36); ctx.moveTo(18, 23); ctx.lineTo(25, 36); ctx.stroke();
    ctx.restore();
  }

  private drawImpactOverlay(ctx: CanvasRenderingContext2D, time: number): void {
    if (this.impactFlash > 0) {
      const flash = ctx.createRadialGradient(this.player.x, this.player.y, 20, this.player.x, this.player.y, Math.max(this.width, this.height) * .65);
      flash.addColorStop(0, `rgba(255,249,174,${this.impactFlash * .34})`);
      flash.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = flash; ctx.fillRect(0, 0, this.width, this.height);
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
    const frontRemaining = this.clouds.filter((cloud) => cloud.front).length;
    if (frontRemaining > 0) {
      const badgeWidth = 280;
      ctx.fillStyle = "rgba(18,57,75,.82)";
      ctx.beginPath(); ctx.roundRect(this.width / 2 - badgeWidth / 2, this.height - 140, badgeWidth, 55, 16); ctx.fill();
      ctx.strokeStyle = "rgba(111,246,226,.8)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.textAlign = "center"; ctx.fillStyle = "#9effea"; ctx.font = "900 13px Outfit, sans-serif";
      ctx.fillText("CLOUD FRONT TARGETS", this.width / 2, this.height - 117);
      ctx.fillStyle = "#ffffff"; ctx.font = "900 19px Outfit, sans-serif";
      ctx.fillText(`${frontRemaining} REMAINING`, this.width / 2, this.height - 96);
    }
    if (this.frontBanner > 0) {
      const entering = frontRemaining > 0;
      const alpha = Math.min(1, this.frontBanner * 1.5);
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(this.width / 2, this.height * .34);
      ctx.fillStyle = "rgba(16,48,66,.76)"; ctx.beginPath(); ctx.roundRect(-260, -49, 520, 98, 20); ctx.fill();
      ctx.strokeStyle = entering ? "#70f4df" : "#fff36f"; ctx.lineWidth = 3; ctx.stroke();
      ctx.textAlign = "center"; ctx.fillStyle = entering ? "#8fffe9" : "#fff36f";
      ctx.font = "900 13px Outfit, sans-serif"; ctx.fillText(entering ? "WEATHER ALERT" : "SECTOR SECURED", 0, -18);
      ctx.fillStyle = "#ffffff"; ctx.font = "900 36px Outfit, sans-serif";
      ctx.fillText(entering ? "CLOUD FRONT" : "FRONT CLEARED", 0, 20);
      ctx.restore();
    }
    if (this.rankReveal > 0) {
      const progress = this.rankReveal / 3.2;
      const alpha = Math.min(1, (1 - progress) * 5, progress * 1.3);
      ctx.fillStyle = `rgba(15,45,65,${alpha * .42})`; ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = alpha; ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(16,53,72,.6)"; ctx.lineWidth = 10;
      ctx.font = "900 52px Nunito, sans-serif";
      ctx.strokeText(RANKS[this.state.rank].name, this.width / 2, this.height / 2 - 4);
      ctx.fillStyle = "#ffffff"; ctx.fillText(RANKS[this.state.rank].name, this.width / 2, this.height / 2 - 4);
      ctx.font = "900 17px Outfit, sans-serif"; ctx.fillStyle = "#fff178";
      ctx.fillText(`ALTITUDE ${RANKS[this.state.rank].altitude}`, this.width / 2, this.height / 2 + 31);
      ctx.globalAlpha = 1;
    }
    void time;
  }

  private drawDrones(ctx: CanvasRenderingContext2D): void {
    const count = Math.min(4, this.state.levels.drone + this.run.skills.twinDrone);
    for (let i = 0; i < count; i += 1) {
      const angle = this.droneAngle + i * Math.PI * 2 / count;
      const x = this.player.x + Math.cos(angle) * 70; const y = this.player.y + Math.sin(angle) * 50;
      ctx.fillStyle = "#efffff"; ctx.beginPath(); ctx.ellipse(x, y, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#4ec4bd"; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }

  private burst(x: number, y: number, color: string, count: number, maxSpeed: number): void {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2; const speed = 35 + Math.random() * maxSpeed;
      const life = .4 + Math.random() * .55;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, size: 2 + Math.random() * 5, color });
    }
  }

  private emitAll(): void { this.onStateChange(this.getState()); this.onRunChange(this.getRunState()); }
  private commit(): void { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); this.onStateChange(this.getState()); }
  private loadState(): GameState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return structuredClone(INITIAL_STATE);
      const parsed = JSON.parse(raw) as Partial<GameState>;
      return { ...structuredClone(INITIAL_STATE), ...parsed, levels: { ...INITIAL_STATE.levels, ...parsed.levels } };
    } catch { return structuredClone(INITIAL_STATE); }
  }

  private ensureAudio(): void { if (this.state.sound && !this.audioContext) this.audioContext = new AudioContext(); }
  private playTone(frequency: number, duration: number): void {
    if (!this.state.sound) return;
    this.ensureAudio(); if (!this.audioContext) return;
    const oscillator = this.audioContext.createOscillator(); const gain = this.audioContext.createGain();
    oscillator.type = "sine"; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.045, this.audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001, this.audioContext.currentTime + duration);
    oscillator.connect(gain).connect(this.audioContext.destination); oscillator.start(); oscillator.stop(this.audioContext.currentTime + duration);
  }
  private playChord(): void { [392,523,659,784].forEach((frequency,index) => window.setTimeout(() => this.playTone(frequency,.18), index * 70)); }
}
