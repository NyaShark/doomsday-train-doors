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
    inputDebounce: 0.15,
    mappingWarning: 0.4,
    glitchDuration: 0.15,
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
    arrivalClock: document.getElementById("arrivalClock"),
    arrivalFill: document.getElementById("arrivalFill"),
    queueTokens: document.getElementById("queueTokens"),
    queueValue: document.getElementById("queueValue"),
    gateGrid: document.getElementById("gateGrid"),
    gates: [...document.querySelectorAll(".gate")],
    feedbackBanner: document.getElementById("feedbackBanner"),
    systemStateText: document.getElementById("systemStateText"),
    startScreen: document.getElementById("startScreen"),
    pauseScreen: document.getElementById("pauseScreen"),
    resultScreen: document.getElementById("resultScreen"),
    startButton: document.getElementById("startButton"),
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
    resultMisses: document.getElementById("resultMisses"),
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

  function makeQueue() {
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

    return queue;
  }

  function createInitialState() {
    return {
      status: "ready",
      elapsed: 0,
      remaining: CONFIG.duration,
      lives: CONFIG.startingLives,
      score: 0,
      correct: 0,
      combo: 0,
      maxCombo: 0,
      misses: 0,
      stage: 1,
      spawned: 0,
      nextSpawnAt: CONFIG.firstSpawnAt,
      current: null,
      queue: makeQueue(),
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

  function mappingIds() {
    if (!state) return COMBOS.map((combo) => combo.id);
    const rotation = state.mappingRotation % COMBOS.length;
    const ids = COMBOS.map((combo) => combo.id);
    if (rotation === 0) return ids;
    return ids.slice(-rotation).concat(ids.slice(0, ids.length - rotation));
  }

  function comboById(comboId) {
    return COMBOS.find((combo) => combo.id === comboId);
  }

  function laneForCombo(comboId) {
    return mappingIds().indexOf(comboId);
  }

  function currentMultiplier(combo = state?.combo ?? 0) {
    return Math.min(2, 1 + Math.floor(combo / 5) * 0.5);
  }

  function currentStage(correct = state?.correct ?? 0) {
    if (correct >= 16) return 3;
    if (correct >= 9) return 2;
    return 1;
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
        token.className = `queue-token shape-${survivor.combo.shape}`;
        token.style.color = `var(--${survivor.combo.color})`;
        token.title = `${survivor.combo.colorName}${survivor.combo.shapeName}`;
        return token;
      })
    );
    const remainingSignals = Math.max(0, CONFIG.totalSurvivors - state.spawned);
    dom.queueValue.textContent = `剩余信号 ${String(remainingSignals).padStart(2, "0")}`;
  }

  function updateSurvivor() {
    if (!state.current) {
      dom.arrivalPanel.classList.add("is-idle");
      dom.arrivalKicker.textContent = state.status === "playing" ? "SIGNAL WINDOW" : "NEXT SURVIVOR";
      dom.arrivalTitle.textContent =
        state.status === "playing" ? "等待下一名幸存者" : "等待救援信号";
      dom.arrivalHint.textContent = "选择同色同形状的避难门";
      dom.survivorBadge.className = "survivor-badge";
      dom.survivorBadge.style.color = "";
      dom.survivorCode.textContent = "NO SIGNAL";
      dom.survivorCombo.textContent = "待命";
      dom.arrivalClock.textContent = "--";
      dom.arrivalFill.style.transform = "scaleX(1)";
      dom.arrivalFill.style.backgroundColor = "";
      return;
    }

    const combo = state.current.combo;
    const windowLeft = Math.max(
      0,
      state.current.deadline - state.elapsed
    );
    const progress = Math.max(
      0,
      Math.min(1, windowLeft / CONFIG.responseWindow)
    );
    dom.arrivalPanel.classList.remove("is-idle");
    dom.arrivalKicker.textContent = "INCOMING SURVIVOR";
    dom.arrivalTitle.textContent = "匹配目标标记";
    dom.arrivalHint.textContent = "颜色与形状必须同时匹配";
    dom.survivorBadge.className = `survivor-badge shape-${combo.shape}`;
    dom.survivorBadge.style.color = `var(--${combo.color})`;
    dom.survivorCode.textContent = `S-${String(state.current.instanceId).padStart(3, "0")} / ${combo.code}`;
    dom.survivorCombo.textContent = `${combo.colorName} · ${combo.shapeName}`;
    dom.arrivalClock.textContent = windowLeft.toFixed(2);
    dom.arrivalFill.style.transform = `scaleX(${progress})`;
    dom.arrivalFill.style.backgroundColor =
      windowLeft < 0.35 ? "var(--danger)" : "var(--amber)";
  }

  function updateHud() {
    if (!state) return;
    dom.timer.textContent = state.remaining.toFixed(1);
    dom.correct.textContent = String(state.correct);
    dom.objectiveFill.style.width = `${Math.min(100, (state.correct / CONFIG.targetCorrect) * 100)}%`;
    dom.score.textContent = String(state.score).padStart(4, "0");
    dom.combo.textContent = String(state.combo);
    dom.multiplier.textContent = `×${currentMultiplier().toFixed(1)}`;
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
        ? "分流进行中"
        : state.status === "paused"
          ? "系统暂停"
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
    state.spawned += 1;
    state.nextSpawnAt =
      CONFIG.firstSpawnAt + state.spawned * CONFIG.spawnInterval;
    state.current = {
      ...survivor,
      spawnedAt: now,
      deadline: now + CONFIG.responseWindow,
      answered: false,
    };
    audio.tick();
    updateAll();
  }

  function resolveSurvivor(isCorrect, reason, chosenLane, isMiss = false) {
    if (!state.current || state.current.answered) return;
    const survivor = state.current;
    const targetLane = laneForCombo(survivor.combo.id);
    survivor.answered = true;
    state.current = null;

    if (isCorrect) {
      state.correct += 1;
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      const multiplier = currentMultiplier();
      state.score += Math.round(10 * multiplier);
      audio.hit(state.combo);
      showGateResult(chosenLane, "correct");
      animateArrivalPanel("correct");
      showFeedback(
        `分流成功  +${Math.round(10 * multiplier)}  /  ${multiplier.toFixed(1)}×`,
        "good",
        620
      );

      const newStage = currentStage();
      if (newStage !== state.stage) {
        state.stage = newStage;
        state.stageEntered = state.elapsed;
        announceStage(newStage);
      }

      if (state.combo > 0 && state.combo % 5 === 0) {
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
      state.lives -= 1;
      state.misses += 1;
      state.combo = 0;
      state.lastResultReason = reason;
      audio.miss();
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
      showFeedback(isMiss ? "漏送 / 生命完整度 -1" : "分流错误 / 生命完整度 -1", "bad", 900);
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

    const targetLane = laneForCombo(state.current.combo.id);
    if (lane === targetLane) {
      resolveSurvivor(true, "", lane);
    } else {
      resolveSurvivor(false, "选择的门牌与幸存者标记不匹配。", lane);
    }
    return true;
  }

  function updateGameClock(now) {
    if (!state || state.status !== "playing") return;
    const frameDelta = Math.min(0.1, Math.max(0, (now - state.lastFrameAt) / 1000));
    state.lastFrameAt = now;
    const scaledDelta = Math.min(0.2, frameDelta * state.timeScale);
    state.elapsed = Math.max(0, state.elapsed + scaledDelta);
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

  function loop(now) {
    if (state?.status === "playing") {
      updateGameClock(now);
    } else if (state) {
      state.lastFrameAt = now;
    }
    frameRequest = window.requestAnimationFrame(loop);
  }

  function showOnlyScreen(screenName) {
    dom.startScreen.hidden = screenName !== "start";
    dom.pauseScreen.hidden = screenName !== "pause";
    dom.resultScreen.hidden = screenName !== "result";
  }

  function resetGame() {
    window.clearTimeout(feedbackTimer);
    feedbackToken += 1;
    state = createInitialState();
    dom.feedbackBanner.className = "feedback-banner";
    dom.arrivalPanel.className = "arrival-panel is-idle";
    showOnlyScreen("start");
    updateAll();
  }

  function startGame() {
    audio.init();
    window.clearTimeout(feedbackTimer);
    state = createInitialState();
    state.status = "playing";
    state.lastFrameAt = performance.now();
    showOnlyScreen(null);
    dom.feedbackBanner.className = "feedback-banner";
    dom.arrivalPanel.className = "arrival-panel";
    updateAll();
    showFeedback("封锁倒计时开始 / 匹配门牌", "good", 1000);
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
    dom.resultKicker.textContent = isSuccess ? "GATE CYCLE COMPLETE" : "SIGNAL LOST";
    dom.resultTitle.textContent = isSuccess ? "撤离完成" : "封锁失败";
    dom.resultReason.textContent = reason;
    dom.resultCorrect.textContent = `${state.correct} / 20`;
    dom.resultScore.textContent = String(state.score).padStart(4, "0");
    dom.resultCombo.textContent = String(state.maxCombo);
    dom.resultMisses.textContent = String(state.misses);
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

    if (["1", "2", "3"].includes(event.key)) {
      event.preventDefault();
      if (state.status === "playing") {
        chooseLane(Number(event.key) - 1);
      }
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      if (state.status === "playing" || state.status === "paused") {
        pauseGame();
      } else if (state.status === "ready") {
        startGame();
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
    dom.startButton.addEventListener("click", startGame);
    dom.restartButton.addEventListener("click", startGame);
    dom.pauseRestartButton.addEventListener("click", startGame);
    dom.pauseButton.addEventListener("click", pauseGame);
    dom.resumeButton.addEventListener("click", pauseGame);
    dom.soundButton.addEventListener("click", toggleSound);
    document.addEventListener("keydown", handleKeyboard);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state?.status === "playing") {
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
          elapsed: state.elapsed,
          remaining: state.remaining,
          lives: state.lives,
          score: state.score,
          correct: state.correct,
          combo: state.combo,
          maxCombo: state.maxCombo,
          misses: state.misses,
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
                targetLane: laneForCombo(state.current.combo.id),
                deadline: state.current.deadline,
              }
            : null,
          pendingMappingAt: state.pendingMappingAt,
          timeScale: state.timeScale,
        }),
        chooseLane,
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
