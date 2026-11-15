(() => {
  "use strict";

  window.addEventListener("error", (event) => {
    document.documentElement.dataset.runtimeError = [
      event.message,
      event.filename,
      event.lineno,
      event.colno,
    ].join(" | ");
  });

  const CONFIG = Object.freeze({
    duration: 30,
    targetCorrect: 20,
    startingLives: 3,
    totalSurvivors: 25,
    firstSpawnAt: 0.35,
    spawnInterval: 1.2,
    responseWindow: 1.15,
    perfectWindow: 0.45,
    inputDebounce: 0.15,
    mappingWarning: 0.4,
    glitchDuration: 0.15,
    perfectBonus: 5,
    priorityBonus: 15,
    comboMission: 10,
    perfectMission: 8,
  });

  const COMBOS = Object.freeze([
    Object.freeze({
      id: "amber-circle",
      color: "amber",
      colorName: "琥珀",
      shape: "circle",
      shapeName: "圆形",
      code: "CIRCLE // AMBER",
    }),
    Object.freeze({
      id: "teal-square",
      color: "teal",
      colorName: "冷青",
      shape: "square",
      shapeName: "方形",
      code: "SQUARE // TEAL",
    }),
    Object.freeze({
      id: "bone-triangle",
      color: "bone",
      colorName: "骨白",
      shape: "triangle",
      shapeName: "三角",
      code: "TRIANGLE // BONE",
    }),
  ]);

  const STAGE_DATA = Object.freeze({
    1: { label: "STAGE 01 / PLATFORM", name: "失守站台" },
    2: { label: "STAGE 02 / FRACTURE", name: "断裂换乘层" },
    3: { label: "STAGE 03 / TERMINAL", name: "终局闸门" },
  });

  const PROTOCOLS = Object.freeze({
    direct: Object.freeze({
      id: "direct",
      label: "常规分流",
      code: "DIRECT",
      hint: "选择完全相同的颜色与形状",
      offset: 0,
      className: "",
    }),
    right: Object.freeze({
      id: "right",
      label: "右转指令",
      code: "TURN RIGHT",
      hint: "找到精确门后，再向右移动一轨",
      offset: 1,
      className: "is-turn",
    }),
    left: Object.freeze({
      id: "left",
      label: "逆向指令",
      code: "TURN LEFT",
      hint: "找到精确门后，再向左移动一轨",
      offset: 2,
      className: "is-reverse",
    }),
  });

  const DOCTRINES = Object.freeze({
    safety: Object.freeze({
      id: "safety",
      label: "守序调度",
      threshold: 4,
      scoreMultiplier: 1,
      priorityEvery: 6,
      shiftCombo: 5,
      response: "守住通道。先让所有人活下来，再谈胜负。",
    }),
    standard: Object.freeze({
      id: "standard",
      label: "标准协议",
      threshold: 5,
      scoreMultiplier: 1.05,
      priorityEvery: 6,
      shiftCombo: 5,
      response: "按标准协议执行。不要让情绪替你读门牌。",
    }),
    overdrive: Object.freeze({
      id: "overdrive",
      label: "抢修调度",
      threshold: 6,
      scoreMultiplier: 1.25,
      priorityEvery: 5,
      shiftCombo: 4,
      response: "抢修主控。提高输出，也准备好承受更频繁的协议变化。",
    }),
  });

  const STORY_LINES = Object.freeze([
    Object.freeze({
      speaker: "系统广播",
      role: "TERMINAL 09 / EMERGENCY",
      scene: "封锁前 60 秒",
      portrait: "none",
      text: "九号避难站即将封锁。检测到最后一班列车仍有生命信号。",
    }),
    Object.freeze({
      speaker: "林澈",
      role: "夜班调度员",
      scene: "封锁前 52 秒",
      portrait: "human",
      text: "这里三年前就废弃了。为什么还有人往里开？",
    }),
    Object.freeze({
      speaker: "零号",
      role: "避难终端 AI",
      scene: "封锁前 47 秒",
      portrait: "ai",
      text: "因为他们相信这扇门还会打开。林澈，你被临时授权接管三条避难轨道。",
    }),
    Object.freeze({
      speaker: "林澈",
      role: "夜班调度员",
      scene: "封锁前 40 秒",
      portrait: "human",
      text: "只有三条轨道，错一次就少一个人。你确定我能做到？",
    }),
    Object.freeze({
      speaker: "零号",
      role: "避难终端 AI",
      scene: "封锁前 34 秒",
      portrait: "ai",
      text: "你不需要记住所有人的脸。读取标记，执行指令，然后立刻忘掉上一轮答案。",
    }),
    Object.freeze({
      speaker: "系统广播",
      role: "INTEGRITY MONITOR",
      scene: "封锁前 27 秒",
      portrait: "none",
      text: "警告：错误分流会削减生命完整度。精准分流能够积累稳定度，并生成一层应急护盾。",
    }),
    Object.freeze({
      speaker: "零号",
      role: "避难终端 AI",
      scene: "调度方针 / CHOICE",
      portrait: "ai",
      text: "最后一件事。列车进站后，协议会越来越乱。你准备用什么方式守住这扇门？",
      choice: true,
    }),
  ]);

  const dom = {
    world: document.getElementById("world"),
    timer: document.getElementById("timerValue"),
    correct: document.getElementById("correctValue"),
    objectiveFill: document.getElementById("objectiveFill"),
    lifeRow: document.getElementById("lifeRow"),
    score: document.getElementById("scoreValue"),
    combo: document.getElementById("comboValue"),
    multiplier: document.getElementById("multiplierValue"),
    stageLabel: document.getElementById("stageLabel"),
    mappingState: document.getElementById("mappingState"),
    arrivalPanel: document.getElementById("arrivalPanel"),
    arrivalKicker: document.getElementById("arrivalKicker"),
    arrivalTitle: document.getElementById("arrivalTitle"),
    arrivalHint: document.getElementById("arrivalHint"),
    survivorBadge: document.getElementById("survivorBadge"),
    survivorCode: document.getElementById("survivorCode"),
    survivorCombo: document.getElementById("survivorCombo"),
    survivorProtocol: document.getElementById("survivorProtocol"),
    arrivalClock: document.getElementById("arrivalClock"),
    arrivalPrecision: document.getElementById("arrivalPrecision"),
    arrivalFill: document.getElementById("arrivalFill"),
    queueTokens: document.getElementById("queueTokens"),
    queueValue: document.getElementById("queueValue"),
    gateGrid: document.getElementById("gateGrid"),
    gates: [...document.querySelectorAll(".gate")],
    feedbackBanner: document.getElementById("feedbackBanner"),
    systemStateText: document.getElementById("systemStateText"),
    startScreen: document.getElementById("startScreen"),
    tutorialScreen: document.getElementById("tutorialScreen"),
    pauseScreen: document.getElementById("pauseScreen"),
    resultScreen: document.getElementById("resultScreen"),
    startButton: document.getElementById("startButton"),
    directStartButton: document.getElementById("directStartButton"),
    tutorialStepLabel: document.getElementById("tutorialStepLabel"),
    tutorialTitle: document.getElementById("tutorialTitle"),
    tutorialDescription: document.getElementById("tutorialDescription"),
    tutorialTip: document.getElementById("tutorialTip"),
    tutorialNextButton: document.getElementById("tutorialNextButton"),
    tutorialRestartButton: document.getElementById("tutorialRestartButton"),
    tutorialSkipButton: document.getElementById("tutorialSkipButton"),
    tutorialProgress: [...document.querySelectorAll("[data-tutorial-progress]")],
    tutorialTargetBadge: document.getElementById("tutorialTargetBadge"),
    tutorialTargetName: document.getElementById("tutorialTargetName"),
    tutorialTargetCode: document.getElementById("tutorialTargetCode"),
    tutorialTargetHint: document.getElementById("tutorialTargetHint"),
    tutorialTargetProtocol: document.getElementById("tutorialTargetProtocol"),
    tutorialProtocolDescription: document.getElementById("tutorialProtocolDescription"),
    tutorialGateGrid: document.getElementById("tutorialGateGrid"),
    tutorialGates: [...document.querySelectorAll(".demo-gate")],
    tutorialDemoStatus: document.getElementById("tutorialDemoStatus"),
    pauseButton: document.getElementById("pauseButton"),
    soundButton: document.getElementById("soundButton"),
    resumeButton: document.getElementById("resumeButton"),
    pauseRestartButton: document.getElementById("pauseRestartButton"),
    restartButton: document.getElementById("restartButton"),
    resultIndex: document.getElementById("resultIndex"),
    resultKicker: document.getElementById("resultKicker"),
    resultTitle: document.getElementById("resultTitle"),
    resultReason: document.getElementById("resultReason"),
    resultCorrect: document.getElementById("resultCorrect"),
    resultScore: document.getElementById("resultScore"),
    resultCombo: document.getElementById("resultCombo"),
    resultPerfect: document.getElementById("resultPerfect"),
    resultMisses: document.getElementById("resultMisses"),
    resultRank: document.getElementById("resultRank"),
    resultRatingText: document.getElementById("resultRatingText"),
    resultStars: document.getElementById("resultStars"),
    stabilityHud: document.getElementById("stabilityHud"),
    stabilityValue: document.getElementById("stabilityValue"),
    stabilityFill: document.getElementById("stabilityFill"),
    stabilityShield: document.getElementById("stabilityShield"),
    storyScreen: document.getElementById("storyScreen"),
    storySceneLabel: document.getElementById("storySceneLabel"),
    storyCharacterAi: document.getElementById("storyCharacterAi"),
    storyCharacterHuman: document.getElementById("storyCharacterHuman"),
    storySpeaker: document.getElementById("storySpeaker"),
    storySpeakerRole: document.getElementById("storySpeakerRole"),
    storyText: document.getElementById("storyText"),
    storyChoices: document.getElementById("storyChoices"),
    storyNextButton: document.getElementById("storyNextButton"),
    storySkipButton: document.getElementById("storySkipButton"),
    storyChoiceButtons: [...document.querySelectorAll("[data-doctrine]")],
    connectionWarning: document.getElementById("connectionWarning"),
  };

  class AudioEngine {
    constructor() {
      this.context = null;
      this.master = null;
      this.enabled = true;
      this.available = Boolean(window.AudioContext || window.webkitAudioContext);
    }

    init() {
      if (!this.available) {
        dom.connectionWarning.hidden = false;
        return;
      }

      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = 0.16;
        this.master.connect(this.context.destination);
      }

      if (this.context.state === "suspended") {
        this.context.resume().catch(() => {});
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    }

    tone(frequency, duration, options = {}) {
      if (!this.enabled || !this.context || !this.master) return;
      const {
        type = "sine",
        gain = 0.18,
        delay = 0,
        endFrequency = frequency,
      } = options;
      const startAt = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const envelope = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(30, endFrequency),
        startAt + duration
      );
      envelope.gain.setValueAtTime(0.0001, startAt);
      envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.012);
      envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
      oscillator.connect(envelope);
      envelope.connect(this.master);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration + 0.02);
    }

    tick() {
      this.tone(165, 0.045, { type: "triangle", gain: 0.04, endFrequency: 120 });
    }

    prioritySpawn() {
      this.tone(260, 0.08, { type: "triangle", gain: 0.08, endFrequency: 340 });
      this.tone(390, 0.08, {
        type: "triangle",
        gain: 0.055,
        delay: 0.07,
        endFrequency: 510,
      });
    }

    hit(combo) {
      const base = 330 + Math.min(combo, 10) * 14;
      this.tone(base, 0.075, { type: "sine", gain: 0.12, endFrequency: base * 1.22 });
      this.tone(base * 1.5, 0.08, {
        type: "triangle",
        gain: 0.06,
        delay: 0.04,
        endFrequency: base * 1.8,
      });
    }

    comboMilestone() {
      this.tone(510, 0.09, { type: "triangle", gain: 0.1, endFrequency: 680 });
      this.tone(765, 0.1, { type: "triangle", gain: 0.07, delay: 0.06, endFrequency: 930 });
    }

    miss() {
      this.tone(145, 0.16, { type: "sawtooth", gain: 0.09, endFrequency: 62 });
      this.tone(95, 0.12, { type: "square", gain: 0.035, delay: 0.015, endFrequency: 55 });
    }

    mappingWarning() {
      this.tone(220, 0.11, { type: "square", gain: 0.055, endFrequency: 170 });
      this.tone(280, 0.09, { type: "square", gain: 0.045, delay: 0.13, endFrequency: 210 });
    }

    finalCountdown() {
      this.tone(540, 0.06, { type: "triangle", gain: 0.08, endFrequency: 540 });
    }

    success() {
      [330, 440, 550, 660].forEach((frequency, index) => {
        this.tone(frequency, 0.18, {
          type: "triangle",
          gain: 0.075,
          delay: index * 0.09,
          endFrequency: frequency * 1.08,
        });
      });
    }

    failure() {
      [190, 145, 105, 72].forEach((frequency, index) => {
        this.tone(frequency, 0.22, {
          type: "sawtooth",
          gain: 0.06,
          delay: index * 0.11,
          endFrequency: frequency * 0.82,
        });
      });
    }
  }

  const audio = new AudioEngine();
  const lifeCells = [...dom.lifeRow.querySelectorAll(".life-cell")];
  let frameRequest = null;
  let feedbackTimer = null;
  let feedbackToken = 0;
  let state = null;
  let selectedDoctrineId = "standard";
  const tutorial = {
    step: 0,
    waiting: false,
    complete: false,
    mappingRotation: 0,
    targetComboId: COMBOS[2].id,
    protocolId: "direct",
  };
  const story = {
    lineIndex: 0,
    typing: false,
    typeTimer: null,
    typeToken: 0,
    choiceMade: false,
  };

  function makeQueue(priorityEvery = 6) {
    const queue = [];
    for (let index = 0; index < CONFIG.totalSurvivors; index += 1) {
      queue.push({
        instanceId: index + 1,
        combo: COMBOS[index % COMBOS.length],
      });
    }

    for (let index = queue.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]];
    }

    // Avoid long runs of the same marker at the start while keeping the queue random.
    for (let index = 1; index < queue.length; index += 1) {
      if (
        queue[index].combo.id === queue[index - 1].combo.id &&
        index % 2 === 0
      ) {
        const swapIndex = queue.findIndex(
          (item, candidateIndex) =>
            candidateIndex > index && item.combo.id !== queue[index - 1].combo.id
        );
        if (swapIndex > index) {
          [queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]];
        }
      }
    }

    queue.forEach((survivor, index) => {
      survivor.priority = (index + 1) % priorityEvery === 0;
    });

    return queue;
  }

  function createInitialState(doctrineId = "standard") {
    const doctrine = DOCTRINES[doctrineId] || DOCTRINES.standard;
    return {
      status: "ready",
      doctrineId: doctrine.id,
      doctrine,
      elapsed: 0,
      remaining: CONFIG.duration,
      lives: CONFIG.startingLives,
      score: 0,
      correct: 0,
      combo: 0,
      maxCombo: 0,
      misses: 0,
      perfect: 0,
      perfectStreak: 0,
      maxPerfectStreak: 0,
      prioritySaves: 0,
      stability: 0,
      shieldCharges: 0,
      maxShieldCharges: 1,
      shieldAbsorbs: 0,
      stage: 1,
      spawned: 0,
      nextSpawnAt: CONFIG.firstSpawnAt,
      current: null,
      queue: makeQueue(doctrine.priorityEvery),
      mappingRotation: 0,
      pendingMappingAt: null,
      mappingWarningCount: 0,
      glitchStart: null,
      glitchGate: null,
      glitchCombo: null,
      glitchCount: 0,
      lastInputAt: -10,
      lastFrameAt: 0,
      lastCountdownSecond: null,
      lastResultReason: "",
      timeScale: 1,
      stageEntered: 1,
      success: false,
    };
  }

  function mappingIdsForRotation(value) {
    const rotation = value % COMBOS.length;
    const ids = COMBOS.map((combo) => combo.id);
    if (rotation === 0) return ids;
    return ids.slice(-rotation).concat(ids.slice(0, ids.length - rotation));
  }

  function mappingIds() {
    if (!state) return COMBOS.map((combo) => combo.id);
    return mappingIdsForRotation(state.mappingRotation);
  }

  function comboById(comboId) {
    return COMBOS.find((combo) => combo.id === comboId);
  }

  function protocolForSpawn(stage, spawned) {
    if (stage <= 1) return PROTOCOLS.direct;
    if (stage === 2) {
      return spawned % 3 === 0 ? PROTOCOLS.right : PROTOCOLS.direct;
    }
    const pattern = spawned % 3;
    if (pattern === 0) return PROTOCOLS.right;
    if (pattern === 1) return PROTOCOLS.left;
    return PROTOCOLS.direct;
  }

  function targetLaneForCombo(comboId, protocol, mapping = mappingIds()) {
    const exactLane = mapping.indexOf(comboId);
    return (exactLane + protocol.offset) % COMBOS.length;
  }

  function targetLaneForSurvivor(survivor) {
    return targetLaneForCombo(
      survivor.combo.id,
      survivor.protocol,
      mappingIds()
    );
  }

  function currentMultiplier(combo = state?.combo ?? 0) {
    return Math.min(2, 1 + Math.floor(combo / 5) * 0.5);
  }

  function currentStage(correct = state?.correct ?? 0) {
    if (correct >= 16) return 3;
    if (correct >= 9) return 2;
    return 1;
  }

  function responseWindowForStage(stage = state?.stage ?? 1) {
    if (stage >= 3) return 1;
    if (stage === 2) return 1.08;
    return CONFIG.responseWindow;
  }

  function setBodyState() {
    document.body.classList.toggle("is-playing", state?.status === "playing");
    document.body.classList.toggle("is-paused", state?.status === "paused");
    document.body.classList.toggle(
      "is-warning",
      Boolean(state?.pendingMappingAt !== null)
    );
    document.body.classList.toggle(
      "is-time-critical",
      Boolean(state && state.status === "playing" && state.remaining <= 5)
    );
  }

  function updateGateVisuals() {
    if (!state) return;
    const ids = mappingIds();
    const glitchActive =
      state.glitchStart !== null &&
      state.elapsed < state.glitchStart + CONFIG.glitchDuration;

    dom.gates.forEach((gate, index) => {
      let combo = comboById(ids[index]);
      let glitching = false;
      if (glitchActive && state.glitchGate === index && state.glitchCombo) {
        combo = comboById(state.glitchCombo);
        glitching = true;
      }
      gate.dataset.color = combo.color;
      gate.dataset.combo = combo.id;
      gate.classList.toggle("is-glitch", glitching);
      const symbol = gate.querySelector(".door-symbol");
      symbol.className = `door-symbol shape-${combo.shape}`;
      gate.querySelector(".door-combo").textContent = combo.code;
      const gateName = gate.querySelector(".door-name").textContent;
      gate.setAttribute(
        "aria-label",
        `选择${["左", "中", "右"][index]}轨道，${gateName}，${combo.colorName}${combo.shapeName}`
      );
    });
  }

  function updateQueue() {
    const upcoming = state.queue.slice(0, 3);
    dom.queueTokens.replaceChildren(
      ...upcoming.map((survivor) => {
        const token = document.createElement("span");
        token.className = `queue-token shape-${survivor.combo.shape}${survivor.priority ? " is-priority" : ""}`;
        token.style.color = `var(--${survivor.combo.color})`;
        token.title = `${survivor.combo.colorName}${survivor.combo.shapeName}${survivor.priority ? "，优先目标" : ""}`;
        return token;
      })
    );
    const remainingSignals = Math.max(0, CONFIG.totalSurvivors - state.spawned);
    dom.queueValue.textContent = `剩余信号 ${String(remainingSignals).padStart(2, "0")}`;
  }

  function updateSurvivor() {
    if (!state.current) {
      dom.arrivalPanel.classList.add("is-idle");
      dom.arrivalPanel.classList.remove(
        "is-priority",
        "is-perfect-window",
        "is-turn",
        "is-reverse"
      );
      dom.arrivalPanel.dataset.protocol = "";
      dom.arrivalKicker.textContent = state.status === "playing" ? "SIGNAL WINDOW" : "NEXT SURVIVOR";
      dom.arrivalTitle.textContent =
        state.status === "playing" ? "等待下一名幸存者" : "等待救援信号";
      dom.arrivalHint.textContent = "选择同色同形状的避难门";
      dom.survivorBadge.className = "survivor-badge";
      dom.survivorBadge.style.color = "";
      dom.survivorCode.textContent = "NO SIGNAL";
      dom.survivorCombo.textContent = "待命";
      dom.survivorProtocol.className = "protocol-chip";
      dom.survivorProtocol.textContent = "常规分流";
      dom.arrivalClock.textContent = "--";
      dom.arrivalPrecision.textContent = "SAFE WINDOW";
      dom.arrivalFill.style.transform = "scaleX(1)";
      dom.arrivalFill.style.backgroundColor = "";
      return;
    }

    const combo = state.current.combo;
    const protocol = state.current.protocol;
    const windowLeft = Math.max(
      0,
      state.current.deadline - state.elapsed
    );
    const progress = Math.max(
      0,
      Math.min(1, windowLeft / CONFIG.responseWindow)
    );
    const elapsedSinceSpawn = state.elapsed - state.current.spawnedAt;
    const inPerfectWindow = elapsedSinceSpawn <= CONFIG.perfectWindow;
    dom.arrivalPanel.classList.remove("is-idle");
    dom.arrivalPanel.classList.toggle("is-priority", Boolean(state.current.priority));
    dom.arrivalPanel.classList.toggle("is-perfect-window", inPerfectWindow);
    dom.arrivalPanel.classList.toggle("is-turn", protocol.id === "right");
    dom.arrivalPanel.classList.toggle("is-reverse", protocol.id === "left");
    dom.arrivalPanel.dataset.protocol = protocol.id;
    dom.arrivalKicker.textContent = `${protocol.code} / ${state.current.priority ? "PRIORITY" : "INCOMING"}`;
    dom.arrivalTitle.textContent = state.current.priority
      ? `优先目标 · ${protocol.label}`
      : protocol.label;
    dom.arrivalHint.textContent = state.current.priority
      ? `${protocol.hint}，正确分流有额外奖励`
      : protocol.hint;
    dom.survivorBadge.className = `survivor-badge shape-${combo.shape}`;
    dom.survivorBadge.style.color = `var(--${combo.color})`;
    dom.survivorCode.textContent = `S-${String(state.current.instanceId).padStart(3, "0")} / ${combo.code}`;
    dom.survivorCombo.textContent = `${combo.colorName} · ${combo.shapeName}${state.current.priority ? " · PRIORITY" : ""}`;
    dom.survivorProtocol.className = `protocol-chip ${protocol.className}`.trim();
    dom.survivorProtocol.textContent = `${protocol.label} / ${protocol.code}`;
    dom.arrivalClock.textContent = windowLeft.toFixed(2);
    dom.arrivalPrecision.textContent = inPerfectWindow ? "PERFECT WINDOW" : "SAFE WINDOW";
    dom.arrivalFill.style.transform = `scaleX(${Math.max(0, Math.min(1, windowLeft / state.current.responseWindow))})`;
    dom.arrivalFill.style.backgroundColor =
      windowLeft < 0.25
        ? "var(--danger)"
        : inPerfectWindow
          ? "var(--amber)"
          : "var(--teal)";
  }

  function updateHud() {
    if (!state) return;
    dom.timer.textContent = state.remaining.toFixed(1);
    dom.correct.textContent = String(state.correct);
    dom.objectiveFill.style.width = `${Math.min(100, (state.correct / CONFIG.targetCorrect) * 100)}%`;
    dom.score.textContent = String(state.score).padStart(4, "0");
    dom.combo.textContent = String(state.combo);
    dom.multiplier.textContent = `×${currentMultiplier().toFixed(1)}`;
    const threshold = state.doctrine.threshold;
    const stabilityProgress = Math.min(
      100,
      (state.stability / threshold) * 100
    );
    dom.stabilityValue.textContent = `${state.stability}/${threshold}`;
    dom.stabilityFill.style.width = `${stabilityProgress}%`;
    dom.stabilityHud.classList.toggle(
      "is-charged",
      state.shieldCharges > 0
    );
    dom.stabilityShield.textContent =
      state.shieldCharges > 0 ? "护盾待命" : "无护盾";
    lifeCells.forEach((cell, index) => {
      cell.classList.toggle("lost", index >= state.lives);
    });
    dom.lifeRow.setAttribute("aria-label", `剩余 ${state.lives} 次生命`);
    dom.timer.parentElement.classList.toggle("is-critical", state.remaining <= 5);
    dom.stageLabel.textContent = STAGE_DATA[state.stage].label;
    dom.mappingState.textContent =
      state.pendingMappingAt !== null ? "MAPPING UNSTABLE" : "MAPPING STABLE";
    dom.systemStateText.textContent =
      state.status === "playing"
        ? `${state.doctrine.label} / 分流进行中`
        : state.status === "paused"
          ? "系统暂停"
          : state.status === "story"
            ? "序章通讯"
          : state.status === "tutorial"
            ? "训练模式"
          : state.status === "success"
            ? "撤离完成"
            : state.status === "failure"
              ? "封锁失败"
              : "等待启动";
    dom.pauseButton.disabled = !["playing", "paused"].includes(state.status);
    dom.pauseButton.setAttribute(
      "aria-label",
      state.status === "paused" ? "继续游戏" : "暂停游戏"
    );
    dom.arrivalClock.parentElement.classList.toggle(
      "is-critical",
      Boolean(state.current && state.current.deadline - state.elapsed <= 0.35)
    );
    setBodyState();
  }

  function updateAll() {
    if (!state) return;
    updateHud();
    updateGateVisuals();
    updateSurvivor();
    updateQueue();
  }

  function showFeedback(text, type = "neutral", duration = 780) {
    feedbackToken += 1;
    const token = feedbackToken;
    window.clearTimeout(feedbackTimer);
    dom.feedbackBanner.textContent = text;
    dom.feedbackBanner.className = `feedback-banner is-visible is-${type}`;
    feedbackTimer = window.setTimeout(() => {
      if (token === feedbackToken) {
        dom.feedbackBanner.className = "feedback-banner";
      }
    }, duration);
  }

  function showGateResult(lane, type) {
    if (lane < 0 || !dom.gates[lane]) return;
    const gate = dom.gates[lane];
    const className = type === "correct" ? "is-correct" : type === "wrong" ? "is-wrong" : "is-missed";
    gate.classList.remove("is-correct", "is-wrong", "is-missed");
    // Restart the CSS animation when consecutive results target the same gate.
    void gate.offsetWidth;
    gate.classList.add(className);
    window.setTimeout(() => gate.classList.remove(className), 300);
  }

  function shakeScreen() {
    document.body.classList.remove("is-shaking");
    void document.body.offsetWidth;
    document.body.classList.add("is-shaking");
    window.setTimeout(() => document.body.classList.remove("is-shaking"), 300);
  }

  function animateArrivalPanel(type) {
    dom.arrivalPanel.classList.remove("is-hit", "is-miss");
    void dom.arrivalPanel.offsetWidth;
    dom.arrivalPanel.classList.add(type === "correct" ? "is-hit" : "is-miss");
    window.setTimeout(
      () => dom.arrivalPanel.classList.remove("is-hit", "is-miss"),
      240
    );
  }

  function scheduleMapping(delay = CONFIG.mappingWarning) {
    if (!state || state.status !== "playing" || state.pendingMappingAt !== null) {
      return;
    }
    state.pendingMappingAt = state.elapsed + delay;
    state.mappingWarningCount += 1;
    audio.mappingWarning();
  }

  function shiftMapping() {
    state.pendingMappingAt = null;
    state.mappingRotation = (state.mappingRotation + 1) % COMBOS.length;
    dom.gates.forEach((gate) => {
      gate.classList.remove("is-shifting");
      void gate.offsetWidth;
      gate.classList.add("is-shifting");
      window.setTimeout(() => gate.classList.remove("is-shifting"), 420);
    });
    showFeedback("门牌映射已重新排列", "bad", 900);
    audio.mappingWarning();
    updateAll();
  }

  function triggerTerminalGlitch() {
    const gate = Math.floor(Math.random() * 3);
    const currentId = mappingIds()[gate];
    const alternatives = COMBOS.filter((combo) => combo.id !== currentId);
    const fake = alternatives[Math.floor(Math.random() * alternatives.length)];
    state.glitchGate = gate;
    state.glitchCombo = fake.id;
    state.glitchStart = state.elapsed;
    state.glitchCount += 1;
    showFeedback("SIGNAL GLITCH / 门牌信号抖动", "bad", 620);
    updateGateVisuals();
  }

  function announceStage(stage) {
    const data = STAGE_DATA[stage];
    showFeedback(`进入 ${data.name}`, stage === 3 ? "bad" : "good", 1050);
    if (stage === 3) {
      triggerTerminalGlitch();
    }
  }

  function spawnSurvivor() {
    if (state.status !== "playing" || state.spawned >= CONFIG.totalSurvivors) {
      return;
    }
    if (state.current) {
      resolveSurvivor(false, "未在到站前完成分流", -1, true);
      if (state.status !== "playing") return;
    }

    const survivor = state.queue.shift();
    const now = state.elapsed;
    const responseWindow = responseWindowForStage();
    state.spawned += 1;
    const protocol = protocolForSpawn(state.stage, state.spawned);
    state.nextSpawnAt =
      CONFIG.firstSpawnAt + state.spawned * CONFIG.spawnInterval;
    state.current = {
      ...survivor,
      protocol,
      spawnedAt: now,
      responseWindow,
      deadline: now + responseWindow,
      answered: false,
    };
    if (survivor.priority) {
      audio.prioritySpawn();
    } else {
      audio.tick();
    }
    updateAll();
  }

  function resolveSurvivor(isCorrect, reason, chosenLane, isMiss = false) {
    if (!state.current || state.current.answered) return;
    const survivor = state.current;
    const targetLane = targetLaneForSurvivor(survivor);
    const responseTime = Math.max(0, state.elapsed - survivor.spawnedAt);
    const isPerfect = isCorrect && responseTime <= CONFIG.perfectWindow;
    const isPriority = Boolean(survivor.priority);
    survivor.answered = true;
    state.current = null;

    if (isCorrect) {
      state.correct += 1;
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      const multiplier = currentMultiplier();
      const baseScore = Math.round(
        10 * multiplier * state.doctrine.scoreMultiplier
      );
      const perfectBonus = isPerfect ? CONFIG.perfectBonus : 0;
      const priorityBonus = isPriority ? CONFIG.priorityBonus : 0;
      state.score += baseScore + perfectBonus + priorityBonus;
      if (isPerfect) {
        state.perfect += 1;
        state.perfectStreak += 1;
        state.maxPerfectStreak = Math.max(
          state.maxPerfectStreak,
          state.perfectStreak
        );
      } else {
        state.perfectStreak = 0;
      }
      if (isPerfect && state.shieldCharges < state.maxShieldCharges) {
        state.stability += 1;
        if (state.stability >= state.doctrine.threshold) {
          state.stability = 0;
          state.shieldCharges = 1;
          audio.comboMilestone();
          showFeedback("稳定度充满 / 获得 1 层应急护盾", "good", 1050);
        }
      }
      if (isPriority) {
        state.prioritySaves += 1;
      }
      audio.hit(state.combo);
      showGateResult(chosenLane, "correct");
      animateArrivalPanel("correct");
      const bonusLabels = [];
      if (isPerfect) bonusLabels.push(`精准 +${perfectBonus}`);
      if (isPriority) bonusLabels.push(`优先 +${priorityBonus}`);
      showFeedback(
        `分流成功  +${baseScore + perfectBonus + priorityBonus}${bonusLabels.length ? `  /  ${bonusLabels.join(" · ")}` : ""}`,
        "good",
        720
      );

      const newStage = currentStage();
      if (newStage !== state.stage) {
        state.stage = newStage;
        state.stageEntered = state.elapsed;
        announceStage(newStage);
      }

      if (
        state.combo > 0 &&
        state.combo % state.doctrine.shiftCombo === 0
      ) {
        audio.comboMilestone();
        showFeedback(`COMBO ${state.combo} / 门牌即将重组`, "good", 900);
        scheduleMapping();
      } else if (
        (state.stage === 2 && [10, 15].includes(state.correct)) ||
        (state.stage === 3 && state.correct === 18)
      ) {
        scheduleMapping();
      }

      if (state.correct >= CONFIG.targetCorrect) {
        finishGame(true, "20 名幸存者已完成撤离。");
        return;
      }
    } else {
      state.misses += 1;
      state.combo = 0;
      state.perfectStreak = 0;
      state.lastResultReason = reason;
      animateArrivalPanel("miss");
      shakeScreen();
      if (chosenLane >= 0) {
        showGateResult(chosenLane, "wrong");
      }
      const target = dom.gates[targetLane];
      if (target) {
        target.classList.add("is-missed");
        window.setTimeout(() => target.classList.remove("is-missed"), 340);
      }
      if (state.shieldCharges > 0) {
        state.shieldCharges -= 1;
        state.shieldAbsorbs += 1;
        dom.stabilityHud.classList.remove("is-used");
        void dom.stabilityHud.offsetWidth;
        dom.stabilityHud.classList.add("is-used");
        window.setTimeout(
          () => dom.stabilityHud.classList.remove("is-used"),
          420
        );
        audio.mappingWarning();
        showFeedback("应急护盾已抵消本次失误", "good", 1000);
      } else {
        state.lives -= 1;
        audio.miss();
        showFeedback(
          isMiss
            ? "漏送 / 生命完整度 -1"
            : "分流错误 / 生命完整度 -1",
          "bad",
          900
        );
      }
      if (state.lives <= 0) {
        finishGame(false, "生命完整度耗尽。");
        return;
      }
    }

    updateAll();
  }

  function chooseLane(lane) {
    if (!state || state.status !== "playing") return false;
    if (![0, 1, 2].includes(lane)) return false;
    if (state.elapsed - state.lastInputAt < CONFIG.inputDebounce) return false;
    state.lastInputAt = state.elapsed;

    if (!state.current) {
      showFeedback("当前没有可分流的幸存者", "bad", 650);
      return false;
    }

    const targetLane = targetLaneForSurvivor(state.current);
    if (lane === targetLane) {
      resolveSurvivor(true, "", lane);
    } else {
      resolveSurvivor(false, "选择的门牌与幸存者标记不匹配。", lane);
    }
    return true;
  }

  function advanceSimulation(deltaSeconds) {
    if (!state || state.status !== "playing") return;
    state.elapsed = Math.max(0, state.elapsed + Math.max(0, deltaSeconds));
    state.remaining = Math.max(0, CONFIG.duration - state.elapsed);

    const countdownSecond = Math.ceil(state.remaining);
    if (
      state.remaining <= 5 &&
      state.remaining > 0 &&
      countdownSecond !== state.lastCountdownSecond
    ) {
      state.lastCountdownSecond = countdownSecond;
      audio.finalCountdown();
    }

    const newStage = currentStage();
    if (newStage !== state.stage) {
      state.stage = newStage;
      state.stageEntered = state.elapsed;
      announceStage(newStage);
    }

    if (
      state.pendingMappingAt !== null &&
      state.elapsed >= state.pendingMappingAt
    ) {
      shiftMapping();
    }

    if (
      state.glitchStart !== null &&
      state.elapsed >= state.glitchStart + CONFIG.glitchDuration
    ) {
      state.glitchStart = null;
      state.glitchGate = null;
      state.glitchCombo = null;
    }

    if (
      state.spawned < CONFIG.totalSurvivors &&
      state.elapsed >= state.nextSpawnAt
    ) {
      spawnSurvivor();
    }

    if (
      state.current &&
      state.elapsed >= state.current.deadline &&
      state.status === "playing"
    ) {
      resolveSurvivor(false, "未在到站前完成分流", -1, true);
    }

    if (
      state.status === "playing" &&
      state.elapsed >= CONFIG.duration
    ) {
      finishGame(
        state.correct >= CONFIG.targetCorrect,
        state.correct >= CONFIG.targetCorrect
          ? "撤离目标已完成。"
          : `30 秒结束时仅送对 ${state.correct} 名幸存者，未达到 20 名。`
      );
    }

    updateAll();
  }

  function updateGameClock(now) {
    if (!state || state.status !== "playing") return;
    const frameDelta = Math.min(
      0.1,
      Math.max(0, (now - state.lastFrameAt) / 1000)
    );
    state.lastFrameAt = now;
    advanceSimulation(
      Math.min(0.2, frameDelta * state.timeScale)
    );
  }

  function loop(now) {
    if (state?.status === "playing") {
      updateGameClock(now);
    } else if (state) {
      state.lastFrameAt = now;
    }
    frameRequest = window.requestAnimationFrame(loop);
  }

  function showOnlyScreen(screenName) {
    dom.storyScreen.hidden = screenName !== "story";
    dom.startScreen.hidden = screenName !== "start";
    dom.tutorialScreen.hidden = screenName !== "tutorial";
    dom.pauseScreen.hidden = screenName !== "pause";
    dom.resultScreen.hidden = screenName !== "result";
  }

  function resetGame() {
    clearStoryTyping();
    window.clearTimeout(feedbackTimer);
    feedbackToken += 1;
    state = createInitialState();
    dom.feedbackBanner.className = "feedback-banner";
    dom.arrivalPanel.className = "arrival-panel is-idle";
    showOnlyScreen("start");
    updateAll();
  }

  function clearStoryTyping() {
    story.typeToken += 1;
    window.clearInterval(story.typeTimer);
    story.typeTimer = null;
    story.typing = false;
  }

  function updateStoryPortrait(portrait) {
    dom.storyCharacterAi.classList.toggle(
      "is-visible",
      portrait === "ai"
    );
    dom.storyCharacterHuman.classList.toggle(
      "is-visible",
      portrait === "human"
    );
    dom.storyCharacterAi.classList.toggle("is-speaking", portrait === "ai");
    dom.storyCharacterHuman.classList.toggle(
      "is-speaking",
      portrait === "human"
    );
  }

  function finishStoryText() {
    clearStoryTyping();
    dom.storyText.textContent = story.fullText;
    dom.storyText.classList.add("is-complete");
    if (story.showChoicesWhenComplete && !story.choiceMade) {
      dom.storyChoices.hidden = false;
      dom.storyNextButton.hidden = true;
    }
  }

  function typeStoryText(text, showChoices = false) {
    clearStoryTyping();
    story.fullText = text;
    story.showChoicesWhenComplete = showChoices;
    story.typing = true;
    const token = story.typeToken;
    let cursor = 0;
    dom.storyText.textContent = "";
    dom.storyText.classList.remove("is-complete");
    dom.storyChoices.hidden = true;
    dom.storyNextButton.hidden = false;
    dom.storyNextButton.querySelector("span").textContent =
      showChoices ? "继续" : "继续";
    story.typeTimer = window.setInterval(() => {
      if (token !== story.typeToken) return;
      cursor += 1;
      dom.storyText.textContent = text.slice(0, cursor);
      if (cursor >= text.length) {
        clearStoryTyping();
        dom.storyText.classList.add("is-complete");
        if (showChoices && !story.choiceMade) {
          dom.storyChoices.hidden = false;
          dom.storyNextButton.hidden = true;
        }
      }
    }, 24);
  }

  function renderStoryLine() {
    const line = STORY_LINES[story.lineIndex];
    if (!line) {
      startTutorial(selectedDoctrineId);
      return;
    }
    dom.storySceneLabel.textContent = line.scene;
    dom.storySpeaker.textContent = line.speaker;
    dom.storySpeakerRole.textContent = line.role;
    updateStoryPortrait(line.portrait);
    dom.storyChoices.hidden = true;
    dom.storyNextButton.hidden = false;
    dom.storyNextButton.querySelector("span").textContent = "继续";
    typeStoryText(line.text, Boolean(line.choice));
  }

  function startStory() {
    audio.init();
    clearStoryTyping();
    story.lineIndex = 0;
    story.choiceMade = false;
    story.fullText = "";
    selectedDoctrineId = "standard";
    state = createInitialState(selectedDoctrineId);
    state.status = "story";
    showOnlyScreen("story");
    updateAll();
    renderStoryLine();
  }

  function completeStoryToTutorial() {
    clearStoryTyping();
    startTutorial(selectedDoctrineId);
  }

  function selectStoryDoctrine(doctrineId) {
    const doctrine = DOCTRINES[doctrineId];
    if (!doctrine) return;
    selectedDoctrineId = doctrine.id;
    story.choiceMade = true;
    dom.storyChoices.hidden = true;
    dom.storyNextButton.hidden = false;
    dom.storyNextButton.querySelector("span").textContent = "进入训练";
    dom.storySpeaker.textContent = "零号";
    dom.storySpeakerRole.textContent = `${doctrine.label} / CONFIRMED`;
    updateStoryPortrait("ai");
    typeStoryText(
      `${doctrine.response} 稳定度需要 ${doctrine.threshold} 次精准分流才能生成护盾。训练会确认你的读门方式。`,
      false
    );
  }

  function advanceStory() {
    if (state?.status !== "story") return;
    if (story.typing) {
      finishStoryText();
      return;
    }
    const line = STORY_LINES[story.lineIndex];
    if (line?.choice && !story.choiceMade) return;
    if (story.choiceMade) {
      completeStoryToTutorial();
      return;
    }
    story.lineIndex += 1;
    renderStoryLine();
  }

  function setTutorialStatus(text, type = "neutral") {
    dom.tutorialDemoStatus.className = `demo-status ${type === "neutral" ? "" : `is-${type}`}`.trim();
    dom.tutorialDemoStatus.querySelector("strong").textContent = text;
  }

  function renderTutorialDoors(rotation) {
    const ids = mappingIdsForRotation(rotation);
    dom.tutorialGates.forEach((gate, index) => {
      const combo = comboById(ids[index]);
      gate.dataset.color = combo.color;
      gate.dataset.combo = combo.id;
      gate.classList.remove("is-correct", "is-wrong");
      gate.querySelector(".demo-symbol").className = `demo-symbol shape-${combo.shape}`;
      gate.querySelector(".demo-gate-name").textContent = `${combo.colorName}${combo.shapeName}门`;
      gate.querySelector(".demo-gate-code-label").textContent = combo.code;
    });
  }

  function renderTutorialTarget(combo) {
    dom.tutorialTargetBadge.className = `demo-badge shape-${combo.shape}`;
    dom.tutorialTargetBadge.style.color = `var(--${combo.color})`;
    dom.tutorialTargetName.textContent = `${combo.colorName} · ${combo.shapeName}`;
    dom.tutorialTargetCode.textContent = combo.code;
  }

  function renderTutorialStep() {
    const target = comboById(tutorial.targetComboId);
    const protocol = PROTOCOLS[tutorial.protocolId];
    renderTutorialTarget(target);
    renderTutorialDoors(tutorial.mappingRotation);
    dom.tutorialTargetProtocol.textContent = protocol.label;
    dom.tutorialProtocolDescription.textContent = protocol.hint;
    dom.tutorialProgress.forEach((marker, index) => {
      marker.classList.toggle("is-active", index <= tutorial.step);
    });
    dom.tutorialRestartButton.hidden = true;

    if (tutorial.step === 0) {
      tutorial.waiting = false;
      tutorial.protocolId = "direct";
      dom.tutorialStepLabel.textContent = "01 / 识别信号";
      dom.tutorialTitle.textContent = "颜色与形状必须同时匹配";
      dom.tutorialDescription.textContent =
        "幸存者身上的标记决定去向。先看颜色，再确认形状；两项同时匹配，才是正确避难门。";
      dom.tutorialTip.textContent =
        "提示：颜色、形状和英文缩写会同时出现在门牌上。";
      dom.tutorialNextButton.hidden = false;
      dom.tutorialNextButton.querySelector("span").textContent = "下一步";
      dom.tutorialTargetHint.textContent = "找到颜色与形状完全相同的门牌";
      setTutorialStatus("观察目标标记，然后继续", "neutral");
      return;
    }

    if (tutorial.step === 1) {
      tutorial.waiting = true;
      tutorial.protocolId = "direct";
      dom.tutorialStepLabel.textContent = "02 / 选择避难门";
      dom.tutorialTitle.textContent = "按标记选择对应门牌";
      dom.tutorialDescription.textContent =
        "现在由你完成一次分流。点击与幸存者颜色、形状同时匹配的避难门。";
      dom.tutorialTip.textContent =
        "点击门体即可选择，实战中也可以使用数字键 1 / 2 / 3。";
      dom.tutorialNextButton.hidden = true;
      dom.tutorialTargetHint.textContent = "请选择正确门牌";
      setTutorialStatus("等待你的选择", "warning");
      return;
    }

    if (tutorial.step === 2) {
      tutorial.waiting = true;
      tutorial.protocolId = "direct";
      dom.tutorialStepLabel.textContent = "03 / 重新读取";
      dom.tutorialTitle.textContent = "门牌映射已经重排";
      dom.tutorialDescription.textContent =
        "同一名幸存者的目标没有改变，但门牌位置已经变化。不要依赖上一轮的位置，要重新读取当前映射。";
      dom.tutorialTip.textContent =
        "实战中映射变化前会有 0.4 秒警示，变化后必须重新判断。";
      dom.tutorialNextButton.hidden = true;
      dom.tutorialTargetHint.textContent = "重新选择正确门牌";
      setTutorialStatus("门牌映射已重排，请重新判断", "bad");
      return;
    }

    if (tutorial.step === 3 && !tutorial.complete) {
      tutorial.waiting = true;
      tutorial.protocolId = "right";
      dom.tutorialStepLabel.textContent = "04 / 转向指令";
      dom.tutorialTitle.textContent = "先找精确门，再向右移动";
      dom.tutorialDescription.textContent =
        "部分幸存者要求转向分流。先根据颜色与形状找到精确门，再按指令移动到相邻轨道。";
      dom.tutorialTip.textContent =
        "右转令向右移动一轨，最右侧继续右转会回到最左侧；逆向令则向左移动一轨。";
      dom.tutorialNextButton.hidden = true;
      dom.tutorialTargetHint.textContent = "精确门右侧一轨";
      setTutorialStatus("右转指令：精确门右侧", "warning");
      return;
    }

    if (tutorial.step === 4) {
      tutorial.waiting = false;
      tutorial.complete = true;
      dom.tutorialStepLabel.textContent = "05 / 稳定护盾";
      dom.tutorialTitle.textContent = "精准分流会积累稳定度";
      dom.tutorialDescription.textContent =
        `当前方针为「${DOCTRINES[selectedDoctrineId].label}」。每 ${DOCTRINES[selectedDoctrineId].threshold} 次精准分流可生成 1 层应急护盾，自动抵消下一次失误。`;
      dom.tutorialTip.textContent =
        "护盾生成后，HUD 的稳定度条会变成琥珀色；护盾只能储存 1 层。";
      dom.tutorialNextButton.hidden = false;
      dom.tutorialNextButton.querySelector("span").textContent = "开始实战";
      dom.tutorialTargetHint.textContent = "精准分流 → 稳定护盾";
      dom.tutorialTargetProtocol.textContent = "稳定度";
      dom.tutorialProtocolDescription.textContent =
        `精准 ${DOCTRINES[selectedDoctrineId].threshold} 次 → 抵消 1 次失误`;
      setTutorialStatus("稳定度机制已解锁，准备进入实战", "good");
      return;
    }

    tutorial.waiting = false;
    dom.tutorialStepLabel.textContent = "训练完成 / READY";
    dom.tutorialTitle.textContent = "准备进入封锁区";
    dom.tutorialDescription.textContent = "继续完成五步引导后即可进入实战。";
    dom.tutorialTip.textContent = "点击“开始实战”进入封锁倒计时。";
    dom.tutorialNextButton.hidden = false;
    dom.tutorialNextButton.querySelector("span").textContent = "开始实战";
    setTutorialStatus("准备进入封锁区", "good");
  }

  function startTutorial(doctrineId = selectedDoctrineId) {
    audio.init();
    selectedDoctrineId = DOCTRINES[doctrineId] ? doctrineId : "standard";
    state = createInitialState(selectedDoctrineId);
    state.status = "tutorial";
    tutorial.step = 0;
    tutorial.waiting = false;
    tutorial.complete = false;
    tutorial.mappingRotation = 0;
    tutorial.targetComboId = COMBOS[0].id;
    tutorial.protocolId = "direct";
    showOnlyScreen("tutorial");
    renderTutorialStep();
    updateAll();
  }

  function chooseTutorialLane(lane) {
    if (!tutorial.waiting) return;
    const targetLane = targetLaneForCombo(
      tutorial.targetComboId,
      PROTOCOLS[tutorial.protocolId],
      mappingIdsForRotation(tutorial.mappingRotation)
    );
    const gate = dom.tutorialGates[lane];
    dom.tutorialGates.forEach((item) =>
      item.classList.remove("is-correct", "is-wrong")
    );
    if (lane !== targetLane) {
      gate.classList.add("is-wrong");
      tutorial.waiting = false;
      dom.tutorialRestartButton.hidden = false;
      setTutorialStatus(
        tutorial.protocolId === "direct"
          ? "标记不匹配：请同时检查颜色和形状"
          : "转向错误：先找精确门，再按指令移动",
        "bad"
      );
      return;
    }

    gate.classList.add("is-correct");
    tutorial.waiting = false;
    setTutorialStatus("分流正确", "good");
    window.setTimeout(() => {
      if (tutorial.step === 1) {
        tutorial.step = 2;
        tutorial.mappingRotation = 1;
        tutorial.protocolId = "direct";
        renderTutorialStep();
      } else if (tutorial.step === 2) {
        tutorial.step = 3;
        tutorial.mappingRotation = 1;
        tutorial.protocolId = "right";
        renderTutorialStep();
      } else if (tutorial.step === 3) {
        tutorial.step = 4;
        tutorial.complete = false;
        renderTutorialStep();
      }
    }, 360);
  }

  function advanceTutorial() {
    if (tutorial.complete) {
      startGame(selectedDoctrineId);
      return;
    }
    if (tutorial.waiting) return;
    if (tutorial.step === 0) {
      tutorial.step = 1;
      renderTutorialStep();
    }
  }

  function startGame(doctrineId = selectedDoctrineId) {
    audio.init();
    window.clearTimeout(feedbackTimer);
    selectedDoctrineId = DOCTRINES[doctrineId] ? doctrineId : "standard";
    state = createInitialState(selectedDoctrineId);
    state.status = "playing";
    state.lastFrameAt = performance.now();
    showOnlyScreen(null);
    dom.feedbackBanner.className = "feedback-banner";
    dom.arrivalPanel.className = "arrival-panel";
    updateAll();
    showFeedback(
      `${state.doctrine.label} / 封锁倒计时开始`,
      "good",
      1100
    );
    if (!frameRequest) frameRequest = window.requestAnimationFrame(loop);
  }

  function pauseGame() {
    if (!state) return;
    if (state.status === "playing") {
      state.status = "paused";
      showOnlyScreen("pause");
      updateAll();
      return;
    }
    if (state.status === "paused") {
      state.status = "playing";
      state.lastFrameAt = performance.now();
      showOnlyScreen(null);
      updateAll();
    }
  }

  function finishGame(isSuccess, reason) {
    if (!state || !["playing", "paused"].includes(state.status)) return;
    state.status = isSuccess ? "success" : "failure";
    state.success = isSuccess;
    state.current = null;
    state.pendingMappingAt = null;
    state.remaining = Math.max(0, CONFIG.duration - state.elapsed);
    const panel = dom.resultScreen.querySelector(".screen-panel");
    panel.classList.toggle("is-success", isSuccess);
    panel.classList.toggle("is-failure", !isSuccess);
    dom.resultIndex.textContent = isSuccess
      ? "EVACUATION REPORT / COMPLETE"
      : "EVACUATION REPORT / FAILED";
    dom.resultKicker.textContent = `${state.doctrine.label} / ${
      isSuccess ? "GATE CYCLE COMPLETE" : "SIGNAL LOST"
    }`;
    dom.resultTitle.textContent = isSuccess ? "撤离完成" : "封锁失败";
    dom.resultReason.textContent =
      state.shieldAbsorbs > 0
        ? `${reason} 稳定护盾共抵消 ${state.shieldAbsorbs} 次失误。`
        : reason;
    dom.resultCorrect.textContent = `${state.correct} / 20`;
    dom.resultScore.textContent = String(state.score).padStart(4, "0");
    dom.resultCombo.textContent = String(state.maxCombo);
    dom.resultPerfect.textContent = String(state.perfect);
    dom.resultMisses.textContent = String(state.misses);
    const objectives = [
      state.correct >= CONFIG.targetCorrect,
      state.maxCombo >= CONFIG.comboMission,
      state.perfect >= CONFIG.perfectMission,
    ];
    const earnedStars = objectives.filter(Boolean).length;
    const rank = isSuccess
      ? state.perfect >= 12 && state.maxCombo >= 15
        ? "S"
        : state.perfect >= 8 && state.maxCombo >= 10
          ? "A"
          : "B"
      : state.correct >= 10
        ? "D"
        : "F";
    dom.resultRank.textContent = rank;
    dom.resultRank.dataset.rank = rank;
    dom.resultRatingText.textContent = isSuccess
      ? earnedStars === 3
        ? "全部单局挑战完成"
        : `${earnedStars} / 3 项挑战完成`
      : "本次封锁未完成";
    dom.resultStars.replaceChildren(
      ...objectives.map((earned) => {
        const star = document.createElement("span");
        star.classList.toggle("is-earned", earned);
        return star;
      })
    );
    dom.resultStars.setAttribute("aria-label", `${earnedStars} / 3 项挑战完成`);
    showOnlyScreen("result");
    updateAll();
    if (isSuccess) {
      audio.success();
    } else {
      audio.failure();
    }
  }

  function toggleSound() {
    const enabled = audio.toggle();
    document.body.classList.toggle("sound-off", !enabled);
    dom.soundButton.setAttribute("aria-pressed", String(enabled));
    dom.soundButton.setAttribute("aria-label", enabled ? "关闭音效" : "开启音效");
    if (enabled) {
      audio.init();
      audio.tick();
    }
  }

  function handleKeyboard(event) {
    if (!state) return;
    const tag = event.target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || event.target?.isContentEditable) {
      return;
    }

    if (state.status === "story") {
      if (event.key === "Enter" || event.code === "Space") {
        event.preventDefault();
        if (
          !story.typing &&
          STORY_LINES[story.lineIndex]?.choice &&
          !story.choiceMade
        ) {
          return;
        }
        advanceStory();
      }
      return;
    }

    if (["1", "2", "3"].includes(event.key)) {
      event.preventDefault();
      if (state.status === "tutorial") {
        chooseTutorialLane(Number(event.key) - 1);
      } else if (state.status === "playing") {
        chooseLane(Number(event.key) - 1);
      }
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      if (state.status === "playing" || state.status === "paused") {
        pauseGame();
      } else if (state.status === "ready") {
        startStory();
      } else if (state.status === "tutorial") {
        advanceTutorial();
      } else if (state.status === "success" || state.status === "failure") {
        startGame();
      }
      return;
    }

    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      if (state.status === "success" || state.status === "failure") {
        startGame();
      }
    }
  }

  function attachEvents() {
    dom.gates.forEach((gate) => {
      gate.addEventListener("click", () => {
        chooseLane(Number(gate.dataset.lane));
      });
    });
    dom.startButton.addEventListener("click", startStory);
    dom.directStartButton.addEventListener("click", () => {
      selectedDoctrineId = "standard";
      startTutorial(selectedDoctrineId);
    });
    dom.storyNextButton.addEventListener("click", advanceStory);
    dom.storySkipButton.addEventListener("click", completeStoryToTutorial);
    dom.storyChoiceButtons.forEach((button) => {
      button.addEventListener("click", () => {
        selectStoryDoctrine(button.dataset.doctrine);
      });
    });
    dom.tutorialNextButton.addEventListener("click", advanceTutorial);
    dom.tutorialSkipButton.addEventListener("click", startGame);
    dom.tutorialRestartButton.addEventListener("click", () => {
      renderTutorialStep();
    });
    dom.tutorialGates.forEach((gate) => {
      gate.addEventListener("click", () => {
        chooseTutorialLane(Number(gate.dataset.demoLane));
      });
    });
    dom.restartButton.addEventListener("click", startGame);
    dom.pauseRestartButton.addEventListener("click", startGame);
    dom.pauseButton.addEventListener("click", pauseGame);
    dom.resumeButton.addEventListener("click", pauseGame);
    dom.soundButton.addEventListener("click", toggleSound);
    document.addEventListener("keydown", handleKeyboard);
    document.addEventListener("visibilitychange", () => {
      if (
        !window.__DOOM_TEST_MODE__ &&
        document.hidden &&
        state?.status === "playing"
      ) {
        pauseGame();
      }
    });
  }

  function exposeDebugApi() {
    try {
      window.__DOOM_GAME__ = Object.freeze({
        start: startGame,
        pause: pauseGame,
        restart: startGame,
        getState: () => ({
          status: state.status,
          doctrineId: state.doctrine.id,
          stability: state.stability,
          shieldCharges: state.shieldCharges,
          shieldAbsorbs: state.shieldAbsorbs,
          elapsed: state.elapsed,
          remaining: state.remaining,
          lives: state.lives,
          score: state.score,
          correct: state.correct,
          combo: state.combo,
          maxCombo: state.maxCombo,
          misses: state.misses,
          perfect: state.perfect,
          maxPerfectStreak: state.maxPerfectStreak,
          prioritySaves: state.prioritySaves,
          stage: state.stage,
          spawned: state.spawned,
          mappingIds: mappingIds(),
          mappingRotation: state.mappingRotation,
          glitchCount: state.glitchCount,
          glitchActive:
            state.glitchStart !== null &&
            state.elapsed < state.glitchStart + CONFIG.glitchDuration,
          current: state.current
            ? {
                instanceId: state.current.instanceId,
                comboId: state.current.combo.id,
                protocolId: state.current.protocol.id,
                targetLane: targetLaneForSurvivor(state.current),
                deadline: state.current.deadline,
              }
            : null,
          pendingMappingAt: state.pendingMappingAt,
          timeScale: state.timeScale,
        }),
        chooseLane,
        step: (seconds) => {
          const numeric = Number(seconds);
          if (Number.isFinite(numeric) && numeric > 0) {
            advanceSimulation(numeric);
          }
        },
        setTimeScale: (scale) => {
          const numeric = Number(scale);
          if (Number.isFinite(numeric) && numeric > 0 && numeric <= 20) {
            state.timeScale = numeric;
          }
        },
      });
    } catch {
      document.documentElement.dataset.debugApi = "unavailable";
    }
  }

  function initialize() {
    attachEvents();
    resetGame();
    exposeDebugApi();
    frameRequest = window.requestAnimationFrame(loop);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
