(() => {
  "use strict";

  const garden = document.getElementById("garden");
  const layer = document.getElementById("plants-layer");
  const hint = document.getElementById("garden-hint");
  const title = document.getElementById("status-title");
  const detail = document.getElementById("status-detail");
  const countLabel = document.getElementById("player-count");
  const countdown = document.getElementById("countdown");
  const banner = document.getElementById("result-banner");
  const announcement = document.getElementById("announcement");
  const resetButton = document.getElementById("reset-button");
  const soundToggle = document.getElementById("sound-toggle");
  const soundIcon = document.getElementById("sound-icon");
  const vibrationToggle = document.getElementById("vibration-toggle");
  const vibrationIcon = document.getElementById("vibration-icon");
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  const themeColorMeta = document.getElementById("theme-color-meta");

  const JOIN_WINDOW_MS = 2000;
  const GROWTH_COUNTDOWN_MS = 2000;
  const MAX_PLAYERS = 6;
  const PALETTE = [
    ["#5b9367", "#c6dfad"], ["#d18b64", "#f2c4a2"], ["#718db8", "#c4d5ee"],
    ["#a27bb7", "#dfc9eb"], ["#c4a33e", "#f1df8e"], ["#4e9c9a", "#b9e2d8"]
  ];
  const State = Object.freeze({ IDLE:"idle", JOINING:"joining", COUNTDOWN:"countdown", RESULT:"result" });

  let state = State.IDLE;
  let nextId = 1;
  let plants = new Map();          // pointerId -> player record
  let timers = new Set();
  let joinDeadline = 0;
  let joinTimer = null;
  let tickTimer = null;
  let resultTimer = null;
  let soundEnabled = true;
  let vibrationEnabled = true;
  const vibrationSupported = typeof navigator.vibrate === "function";
  let audioContext = null;
  let lastPointerPositions = new Map();
  let roundToken = 0;


  // Dark is the default on first launch; a user choice is remembered locally.
  const THEME_KEY = "who-goes-first-theme";
  function readTheme() {
    try { return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; }
    catch (_) { return document.documentElement.dataset.theme === "light" ? "light" : "dark"; }
  }
  function applyTheme(theme, persist = false) {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    const isDark = next === "dark";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    themeToggle.title = isDark ? "Switch to light mode" : "Switch to dark mode";
    themeIcon.textContent = isDark ? "☼" : "☾";
    if (themeColorMeta) themeColorMeta.setAttribute("content", isDark ? "#17251f" : "#f7f5ec");
    if (persist) { try { localStorage.setItem(THEME_KEY, next); } catch (_) {} }
  }
  applyTheme(readTheme());

  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = motionPreference.matches;
  // Keep the animation preference current if the user changes it while the app is open.
  if (typeof motionPreference.addEventListener === "function") {
    motionPreference.addEventListener("change", event => { reducedMotion = event.matches; });
  }

  function schedule(fn, delay) {
    const id = window.setTimeout(() => { timers.delete(id); fn(); }, delay);
    timers.add(id);
    return id;
  }
  function clearTimer(id) {
    if (id != null) { clearTimeout(id); timers.delete(id); }
  }
  function clearAllTimers() {
    timers.forEach(clearTimeout);
    timers.clear();
    joinTimer = tickTimer = resultTimer = null;
  }
  function setStatus(heading, description) {
    title.textContent = heading;
    detail.textContent = description;
  }
  function announce(message) {
    // Clear first so assistive technology can announce repeated messages too.
    announcement.textContent = "";
    window.requestAnimationFrame(() => { announcement.textContent = message; });
  }
  function playerWord(n) { return `${n} ${n === 1 ? "player" : "players"}`; }
  function updateCount() {
    const n = plants.size;
    countLabel.textContent = `${n} / ${MAX_PLAYERS} players joined`;
    hint.style.opacity = n ? "0" : "1";
  }
  function getAudio() {
    if (!soundEnabled) return null;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!audioContext) audioContext = new Ctx();
      if (audioContext.state === "suspended") audioContext.resume();
      return audioContext;
    } catch (_) { return null; }
  }
  function tone(freq, duration=.12, type="sine", volume=.035, delay=0) {
    const ctx = getAudio();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + delay + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + delay + duration);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + duration + .02);
    } catch (_) {}
  }
  function sproutSound() { tone(520,.1,"sine",.018); tone(760,.14,"sine",.018,.06); }
  function countdownSound(n) { tone(n === 1 ? 760 : 560,.12,"triangle",.03); }
  function bloomSound() { [523,659,784,1047].forEach((f,i) => tone(f,.36,"sine",.035,i*.09)); }
  function vibrate(pattern) {
    // Vibration is optional: unsupported browsers and user-disabled haptics
    // must never interrupt or alter the round state.
    if (!vibrationEnabled || !vibrationSupported) return;
    try { navigator.vibrate(pattern); } catch (_) {}
  }

  function syncVibrationControl() {
    vibrationToggle.setAttribute("aria-pressed", String(vibrationEnabled));
    vibrationToggle.setAttribute("aria-label", vibrationEnabled ? "Turn vibration off" : "Turn vibration on");
    vibrationIcon.textContent = vibrationEnabled ? "〰" : "∿";
  }

  if (!vibrationSupported) {
    vibrationToggle.disabled = true;
    vibrationToggle.setAttribute("aria-pressed", "false");
    vibrationToggle.setAttribute("aria-label", "Vibration is not supported in this browser");
    vibrationToggle.title = "Vibration is not supported in this browser";
    vibrationIcon.textContent = "∿";
    vibrationEnabled = false;
  }

  function plantSvg() {
    return `<svg viewBox="0 0 100 170" aria-hidden="true">
      <ellipse class="soil" cx="50" cy="153" rx="22" ry="5"/>
      <g class="seed">
        <ellipse cx="50" cy="145" rx="6.5" ry="8" fill="#9c7547" stroke="#7e5b35" stroke-width="1.5"/>
        <path d="M48 140 Q52 144 49 149" fill="none" stroke="#d6b47d" stroke-width="1.4" stroke-linecap="round"/>
      </g>
      <path class="stem" pathLength="1" d="M50 149 C48 126 52 103 50 72"/>
      <path class="leaf leaf-a" d="M49 128 C24 131 17 113 19 101 C39 101 51 113 49 128Z"/>
      <path class="leaf leaf-b" d="M51 113 C76 114 84 96 81 84 C61 86 49 98 51 113Z"/>
      <path class="leaf leaf-c" d="M50 96 C29 96 24 80 28 69 C44 72 52 83 50 96Z"/>
      <path class="leaf leaf-d" d="M51 82 C69 82 75 67 71 57 C57 60 49 70 51 82Z"/>
      <g class="bud">
        <path d="M50 76 C35 68 34 54 43 47 C44 57 49 61 50 76Z"/>
        <path d="M50 76 C65 68 66 54 57 47 C56 57 51 61 50 76Z"/>
        <path d="M50 72 C38 58 43 44 50 40 C57 44 62 58 50 72Z"/>
      </g>
      <g class="flower">
        <g class="petals" fill="#f6c83f" stroke="#dfaa28" stroke-width="1.2">
          <ellipse cx="50" cy="49" rx="8.5" ry="24"/>
          <ellipse cx="50" cy="49" rx="8.5" ry="24" transform="rotate(30 50 49)"/>
          <ellipse cx="50" cy="49" rx="8.5" ry="24" transform="rotate(60 50 49)"/>
          <ellipse cx="50" cy="49" rx="8.5" ry="24" transform="rotate(90 50 49)"/>
          <ellipse cx="50" cy="49" rx="8.5" ry="24" transform="rotate(120 50 49)"/>
          <ellipse cx="50" cy="49" rx="8.5" ry="24" transform="rotate(150 50 49)"/>
          <ellipse cx="50" cy="49" rx="7.5" ry="21" transform="rotate(15 50 49)"/>
          <ellipse cx="50" cy="49" rx="7.5" ry="21" transform="rotate(45 50 49)"/>
          <ellipse cx="50" cy="49" rx="7.5" ry="21" transform="rotate(75 50 49)"/>
          <ellipse cx="50" cy="49" rx="7.5" ry="21" transform="rotate(105 50 49)"/>
          <ellipse cx="50" cy="49" rx="7.5" ry="21" transform="rotate(135 50 49)"/>
          <ellipse cx="50" cy="49" rx="7.5" ry="21" transform="rotate(165 50 49)"/>
        </g>
        <circle cx="50" cy="49" r="13" fill="#704a25" stroke="#4d351e" stroke-width="1.7"/>
        <g fill="#e9b55c" opacity=".95">
          <circle cx="45" cy="44" r="1.5"/><circle cx="54" cy="44" r="1.5"/><circle cx="50" cy="51" r="1.5"/>
          <circle cx="57" cy="52" r="1.5"/><circle cx="43" cy="51" r="1.5"/><circle cx="50" cy="40" r="1.5"/>
          <circle cx="45" cy="55" r="1.2"/><circle cx="55" cy="56" r="1.2"/>
        </g>
      </g>
    </svg>`;
  }

  function makePlant(pointerId, point) {
    // Assign the lowest currently unused player number. If someone lifts a
    // finger during the joining window, a later player can reuse that number
    // without creating duplicate labels among the plants still in the garden.
    const usedLabels = new Set(Array.from(plants.values(), player => player.labelIndex));
    let labelIndex = 1;
    while (usedLabels.has(labelIndex) && labelIndex <= MAX_PLAYERS) labelIndex++;
    if (labelIndex > MAX_PLAYERS) return null;
    const [color, accent] = PALETTE[(labelIndex - 1) % PALETTE.length];
    const el = document.createElement("div");
    el.className = "plant";
    el.style.setProperty("--plant-color", color);
    el.style.setProperty("--plant-accent", accent);
    el.innerHTML = plantSvg() + `<span class="plant-label">Player ${labelIndex}</span>`;
    layer.appendChild(el);
    const player = { id: nextId++, pointerId, el, x:point.x, y:point.y, color, accent, labelIndex };
    plants.set(pointerId, player);
    placePlant(player, point.x, point.y);
    // Trigger bud on the next paint so the CSS transition is visible.
    requestAnimationFrame(() => el.classList.add("is-bud"));
    updateCount();
    sproutSound();
    return player;
  }

  function placePlant(player, x, y) {
    const rect = garden.getBoundingClientRect();
    const pad = Math.min(54, rect.width * .12);
    player.x = Math.max(pad, Math.min(rect.width - pad, x));
    player.y = Math.max(72, Math.min(rect.height - 26, y));
    player.el.style.left = `${player.x}px`;
    player.el.style.top = `${player.y}px`;
  }

  function relPoint(event) {
    const r = garden.getBoundingClientRect();
    return { x:event.clientX-r.left, y:event.clientY-r.top };
  }

  function updateStatusForJoining() {
    const n = plants.size;
    if (!n) {
      setStatus("Gather your players", "Everyone, place one finger anywhere in the garden.");
      return;
    }
    const seconds = Math.max(0, Math.ceil((joinDeadline - Date.now()) / 1000));
    setStatus("Growing our little garden", `${playerWord(n)} joined · ${seconds}s to add another finger`);
  }

  function resetJoinTimer() {
    clearTimer(joinTimer);
    joinDeadline = Date.now() + JOIN_WINDOW_MS;
    updateStatusForJoining();
    const token = roundToken;
    joinTimer = schedule(() => {
      if (token !== roundToken || state !== State.JOINING) return;
      startCountdown();
    }, JOIN_WINDOW_MS);
    clearTimer(tickTimer);
    tickTimer = schedule(function tickJoin() {
      if (token !== roundToken || state !== State.JOINING) return;
      updateStatusForJoining();
      tickTimer = schedule(tickJoin, 200);
    }, 200);
  }

  function startCountdown() {
    clearTimer(joinTimer); clearTimer(tickTimer);
    joinTimer = tickTimer = null;
    if (plants.size < 2) {
      state = State.IDLE;
      setStatus("Need one more player", "At least two fingers are needed. Add another player to start.");
      announce("At least two players are needed.");
      return;
    }
    state = State.COUNTDOWN;
    // Freeze the participants and their touch positions. Ignore new fingers during countdown.
    const token = roundToken;
    setStatus("The garden is growing…", "Hold still for the big reveal.");
    plants.forEach(p => p.el.classList.add("is-grown"));
    let remaining = Math.ceil(GROWTH_COUNTDOWN_MS / 1000);
    showCountdown(remaining);
    countdownSound(remaining);
    const startedAt = performance.now();
    function tick() {
      if (token !== roundToken || state !== State.COUNTDOWN) return;
      const elapsed = performance.now() - startedAt;
      const next = Math.max(0, Math.ceil(GROWTH_COUNTDOWN_MS / 1000) - Math.floor(elapsed / 1000));
      if (next !== remaining && next > 0) {
        remaining = next;
        showCountdown(remaining);
        countdownSound(remaining);
        if (remaining === 1) {
          garden.classList.add("anticipation");
          tone(880, .24, "sine", .022, .06);
          vibrate(18);
        } else {
          vibrate(10);
        }
      }
      if (elapsed >= GROWTH_COUNTDOWN_MS) {
        countdown.classList.remove("visible");
        countdown.textContent = "";
        garden.classList.remove("anticipation");
        chooseWinner(token);
      } else {
        tickTimer = schedule(tick, 45);
      }
    }
    tickTimer = schedule(tick, 45);
  }

  function showCountdown(n) {
    countdown.textContent = String(n);
    countdown.classList.remove("visible");
    // Force style recalc for a tiny pop on each number.
    void countdown.offsetWidth;
    countdown.classList.add("visible");
  }

  function chooseWinner(token) {
    // This guard makes the reveal a one-shot transition: stale timers and
    // duplicate callbacks cannot select a second winner for the same round.
    if (token !== roundToken || state !== State.COUNTDOWN) return;

    // Freeze the eligible roster before drawing. Only participants present at
    // the end of the countdown are eligible; animation and later input cannot
    // change the odds once this snapshot is taken.
    const entries = Array.from(plants.values());
    if (entries.length < 2) {
      cancelRound("Not enough players this time. Try again.");
      return;
    }

    let winnerIndex;
    try {
      winnerIndex = secureRandomIndex(entries.length);
    } catch (error) {
      // Never silently fall back to Math.random(): if secure randomness is
      // unavailable, stop safely and explain why no winner was selected.
      cancelRound("Secure random selection is unavailable. Please reopen the app and try again.");
      return;
    }
    const winner = entries[winnerIndex];
    state = State.RESULT;
    garden.classList.remove("anticipation");
    plants.forEach(p => {
      if (p === winner) {
        p.el.classList.add("is-winner");
        p.el.querySelector(".plant-label").textContent = `Player ${p.labelIndex} · Goes first`;
      } else {
        p.el.classList.add("is-loser");
        p.el.querySelector(".plant-label").textContent = `Player ${p.labelIndex}`;
      }
    });
    setStatus("A sunflower has bloomed!", "The garden has chosen your first player.");
    banner.textContent = `🌻 Player ${winner.labelIndex} goes first!`;
    banner.classList.add("visible");
    resetButton.classList.add("is-result");
    announce(`Player ${winner.labelIndex} goes first! Tap Play again for a new round.`);
    bloomSound();
    vibrate([24,35,55,35,95]);
    resultTimer = schedule(() => {
      // Keep the winner visible until replay; no automatic reset.
      resultTimer = null;
    }, 1000);
  }

  function secureRandomIndex(max) {
    // Return a uniformly distributed integer in [0, max). Rejection sampling
    // removes modulo bias; Web Crypto is required and there is no weak fallback.
    if (!Number.isInteger(max) || max < 1 || max > MAX_PLAYERS) {
      throw new RangeError("Invalid participant count for random selection.");
    }
    if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
      throw new Error("Secure randomness is unavailable in this browser.");
    }
    const range = 0x100000000; // Number of possible Uint32 values
    const limit = range - (range % max);
    const values = new Uint32Array(1);
    let value;
    do {
      window.crypto.getRandomValues(values);
      value = values[0];
    } while (value >= limit);
    return value % max;
  }

  function cancelRound(message) {
    // Invalidate every callback from the interrupted round before changing UI.
    clearAllTimers();
    roundToken++;
    state = State.IDLE;
    countdown.classList.remove("visible");
    countdown.textContent = "";
    garden.classList.remove("anticipation");
    banner.classList.remove("visible");
    banner.textContent = "";
    resetButton.classList.remove("is-result");
    plants.forEach(p => {
      p.el.classList.remove("is-grown", "is-winner", "is-loser");
      const label = p.el.querySelector(".plant-label");
      if (label) label.textContent = `Player ${p.labelIndex}`;
    });
    setStatus("Let's grow again", message);
    announce(message);
  }

  function resetRound() {
    roundToken++;
    clearAllTimers();
    plants.forEach(p => p.el.remove());
    plants.clear();
    lastPointerPositions.clear();
    activeGardenTouches.clear();
    countdown.classList.remove("visible");
    countdown.textContent = "";
    garden.classList.remove("anticipation");
    banner.classList.remove("visible");
    banner.textContent = "";
    resetButton.classList.remove("is-result");
    state = State.IDLE;
    setStatus("Gather your players", "Everyone, place one finger anywhere in the garden.");
    updateCount();
    announce("New round. Place your fingers to begin.");
  }

  function addParticipant(key, point) {
    if (state === State.COUNTDOWN || state === State.RESULT) return;
    if (plants.has(key)) return;
    if (plants.size >= MAX_PLAYERS) {
      setStatus("Garden is full!", "Six players are ready. Let the countdown finish.");
      return;
    }
    const player = makePlant(key, point);
    if (!player) return;
    lastPointerPositions.set(key, point);
    if (state === State.IDLE) state = State.JOINING;
    resetJoinTimer();
  }

  function moveParticipant(key, point) {
    if (!plants.has(key) || state === State.COUNTDOWN || state === State.RESULT) return;
    const player = plants.get(key);
    if (Math.abs(point.x - player.x) > 5 || Math.abs(point.y - player.y) > 5) {
      placePlant(player, point.x, point.y);
    }
    lastPointerPositions.set(key, point);
  }

  function removeParticipant(key) {
    if (!plants.has(key)) return;
    lastPointerPositions.delete(key);
    if (state === State.COUNTDOWN || state === State.RESULT) return;
    const player = plants.get(key);
    if (player) {
      player.el.remove();
      plants.delete(key);
      updateCount();
    }
    if (plants.size < 2) {
      clearTimer(joinTimer); clearTimer(tickTimer);
      joinTimer = tickTimer = null;
      state = plants.size ? State.JOINING : State.IDLE;
      if (plants.size === 1) {
        setStatus("Need one more player", "Keep one finger down and invite another player to join.");
        joinDeadline = 0;
      } else {
        setStatus("Gather your players", "Everyone, place one finger anywhere in the garden.");
      }
    } else {
      state = State.JOINING;
      resetJoinTimer();
    }
  }

  // Touch Events are the single source of truth for finger input on iOS.
  // The registry stores every touch that began in the garden, including touches
  // rejected because the six-player limit was reached. This prevents later end /
  // cancel events from being confused with registered players.
  const activeGardenTouches = new Map(); // touch identifier -> { accepted: boolean }
  function touchKey(identifier) { return `touch-${identifier}`; }
  function touchPoint(touch) {
    const rect = garden.getBoundingClientRect();
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }
  function isTouchInGarden(touch) {
    const rect = garden.getBoundingClientRect();
    return touch.clientX >= rect.left && touch.clientX <= rect.right &&
      touch.clientY >= rect.top && touch.clientY <= rect.bottom;
  }

  document.addEventListener("touchstart", event => {
    let startedInGarden = false;
    // Determine the interaction region from coordinates, not event.target:
    // Safari may retarget later fingers to an existing plant or child element.
    for (const touch of event.changedTouches) {
      if (isTouchInGarden(touch)) { startedInGarden = true; break; }
    }
    // Prevent Safari from turning multi-finger contact into page gestures.
    if (startedInGarden) event.preventDefault();

    for (const touch of event.changedTouches) {
      if (!isTouchInGarden(touch)) continue;
      const id = touch.identifier;
      if (activeGardenTouches.has(id)) continue;
      const key = touchKey(id);
      const wasAccepted = plants.has(key);
      addParticipant(key, touchPoint(touch));
      activeGardenTouches.set(id, { accepted: !wasAccepted && plants.has(key) });
    }
  }, { capture:true, passive:false });

  document.addEventListener("touchmove", event => {
    let handled = false;
    for (const touch of event.changedTouches) {
      const record = activeGardenTouches.get(touch.identifier);
      if (!record) continue;
      handled = true;
      if (record.accepted) moveParticipant(touchKey(touch.identifier), touchPoint(touch));
    }
    if (handled) event.preventDefault();
  }, { capture:true, passive:false });

  function finishGardenTouches(event, cancelled = false) {
    const affected = [];
    for (const touch of event.changedTouches) {
      const record = activeGardenTouches.get(touch.identifier);
      if (!record) continue;
      activeGardenTouches.delete(touch.identifier);
      if (record.accepted) affected.push(touchKey(touch.identifier));
    }
    if (!affected.length) return;

    // Batch releases so a multi-touch cancellation cannot repeatedly transition
    // the round or restart timers once for every finger in the same event.
    if (state === State.COUNTDOWN || state === State.RESULT) {
      affected.forEach(key => lastPointerPositions.delete(key));
      return;
    }
    for (const key of affected) {
      lastPointerPositions.delete(key);
      const player = plants.get(key);
      if (player) player.el.remove();
      plants.delete(key);
    }
    updateCount();

    if (plants.size < 2) {
      clearTimer(joinTimer); clearTimer(tickTimer);
      joinTimer = tickTimer = null;
      joinDeadline = 0;
      state = plants.size ? State.JOINING : State.IDLE;
      if (plants.size === 1) {
        setStatus("Need one more player", "Keep one finger down and invite another player to join.");
      } else {
        setStatus("Gather your players", "Everyone, place one finger anywhere in the garden.");
      }
    } else {
      state = State.JOINING;
      resetJoinTimer();
    }
  }

  document.addEventListener("touchend", event => finishGardenTouches(event, false), { capture:true, passive:false });

  // iOS may dispatch touchcancel for several contacts at once (for example,
  // when the browser interrupts a multi-touch sequence). Do not interpret that
  // browser cancellation as every player deliberately lifting their finger.
  // Forget the cancelled input identifiers, but preserve their plants for this
  // round. The player can finish the draw or use Replay to start cleanly.
  document.addEventListener("touchcancel", event => {
    let handled = false;
    for (const touch of event.changedTouches) {
      const record = activeGardenTouches.get(touch.identifier);
      if (!record) continue;
      activeGardenTouches.delete(touch.identifier);
      handled = true;
      // Intentionally preserve accepted participants on cancellation.
      // This avoids a bulk touchcancel event clearing the entire garden.
    }
    if (handled) {
      event.preventDefault();
      if (state === State.JOINING && plants.size > 0) {
        // Keep the existing join deadline; cancellation must not restart it.
        updateStatusForJoining();
      }
    }
  }, { capture:true, passive:false });

  // Pointer events are retained for mouse and stylus input only.
  garden.addEventListener("pointerdown", event => {
    if (event.pointerType === "touch") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    addParticipant(`pointer-${event.pointerId}`, relPoint(event));
  }, { passive:false });

  garden.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    event.preventDefault();
    moveParticipant(`pointer-${event.pointerId}`, relPoint(event));
  }, { passive:false });

  function handlePointerEnd(event) {
    if (event.pointerType === "touch") return;
    removeParticipant(`pointer-${event.pointerId}`);
  }
  document.addEventListener("pointerup", handlePointerEnd, { passive:false });
  document.addEventListener("pointercancel", handlePointerEnd, { passive:false });

  themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next, true);
  });
  resetButton.addEventListener("click", resetRound);
  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggle.setAttribute("aria-pressed", String(soundEnabled));
    soundToggle.setAttribute("aria-label", soundEnabled ? "Turn sound off" : "Turn sound on");
    soundIcon.textContent = soundEnabled ? "♫" : "♪̸";
    if (soundEnabled) { tone(660,.12,"sine",.025); }
  });
  vibrationToggle.addEventListener("click", () => {
    if (!vibrationSupported) return;
    vibrationEnabled = !vibrationEnabled;
    syncVibrationControl();
    if (vibrationEnabled) vibrate(12);
    else { try { navigator.vibrate(0); } catch (_) {} }
  });

  // Normal finger lifts remove only the matching participant before lock-in.
  // A browser touchcancel preserves that participant for this round; Replay
  // clears all state deliberately. During the result reveal, releases are ignored.
  updateCount();
  window.addEventListener("resize", () => {
    if (state === State.COUNTDOWN || state === State.RESULT) return;
    plants.forEach(p => placePlant(p, p.x, p.y));
  });
})();
