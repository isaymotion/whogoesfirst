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

  const JOIN_WINDOW_MS = 5000;
  const GROWTH_COUNTDOWN_MS = 4000;
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
  let audioContext = null;
  let lastPointerPositions = new Map();
  let roundToken = 0;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  function announce(message) { announcement.textContent = message; }
  function playerWord(n) { return `${n} ${n === 1 ? "player" : "players"}`; }
  function updateCount() {
    const n = plants.size;
    countLabel.textContent = `${n} ${n === 1 ? "player" : "players"} joined`;
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
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (_) {} }
  }

  function plantSvg() {
    return `<svg viewBox="0 0 100 150" aria-hidden="true">
      <ellipse class="soil" cx="50" cy="137" rx="22" ry="5"/>
      <path class="stem" pathLength="1" d="M50 136 C48 112 52 89 50 65"/>
      <path class="leaf" d="M49 108 C25 111 18 95 19 84 C39 84 50 94 49 108Z"/>
      <path class="leaf" d="M51 94 C74 95 83 79 81 67 C61 69 50 80 51 94Z"/>
      <path class="leaf" d="M50 75 C31 75 26 61 29 51 C45 54 52 64 50 75Z"/>
      <path class="bud" d="M50 69 C35 62 34 48 43 41 C44 51 49 54 50 69Z"/>
      <path class="bud" d="M50 69 C65 62 66 48 57 41 C56 51 51 54 50 69Z"/>
      <path class="bud" d="M50 65 C38 51 43 37 50 34 C57 37 62 51 50 65Z"/>
      <g class="flower">
        <g fill="#f3c742" stroke="#dba72d" stroke-width="1.2">
          <ellipse cx="50" cy="30" rx="8" ry="19"/>
          <ellipse cx="50" cy="30" rx="8" ry="19" transform="rotate(45 50 30)"/>
          <ellipse cx="50" cy="30" rx="8" ry="19" transform="rotate(90 50 30)"/>
          <ellipse cx="50" cy="30" rx="8" ry="19" transform="rotate(135 50 30)"/>
          <ellipse cx="50" cy="30" rx="8" ry="19" transform="rotate(22.5 50 30)"/>
          <ellipse cx="50" cy="30" rx="8" ry="19" transform="rotate(67.5 50 30)"/>
          <ellipse cx="50" cy="30" rx="8" ry="19" transform="rotate(112.5 50 30)"/>
          <ellipse cx="50" cy="30" rx="8" ry="19" transform="rotate(157.5 50 30)"/>
        </g>
        <circle cx="50" cy="30" r="11" fill="#694522" stroke="#4d351e" stroke-width="1.5"/>
        <g fill="#e6b35b" opacity=".9">
          <circle cx="46" cy="26" r="1.2"/><circle cx="54" cy="27" r="1.2"/><circle cx="49" cy="33" r="1.2"/>
          <circle cx="55" cy="34" r="1.2"/><circle cx="44" cy="32" r="1.2"/><circle cx="50" cy="24" r="1.2"/>
        </g>
      </g>
    </svg>`;
  }

  function makePlant(pointerId, point) {
    const index = plants.size;
    const [color, accent] = PALETTE[index % PALETTE.length];
    const el = document.createElement("div");
    el.className = "plant";
    el.style.setProperty("--plant-color", color);
    el.style.setProperty("--plant-accent", accent);
    el.innerHTML = plantSvg() + `<span class="plant-label">Player ${index + 1}</span>`;
    layer.appendChild(el);
    const player = { id: nextId++, pointerId, el, x:point.x, y:point.y, color, accent, labelIndex:index+1 };
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
    let remaining = 4;
    showCountdown(remaining);
    countdownSound(remaining);
    const startedAt = performance.now();
    function tick() {
      if (token !== roundToken || state !== State.COUNTDOWN) return;
      const elapsed = performance.now() - startedAt;
      const next = Math.max(0, 4 - Math.floor(elapsed / 1000));
      if (next !== remaining && next > 0) {
        remaining = next;
        showCountdown(remaining);
        countdownSound(remaining);
        vibrate(12);
      }
      if (elapsed >= GROWTH_COUNTDOWN_MS) {
        countdown.classList.remove("visible");
        countdown.textContent = "";
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
    if (token !== roundToken || state !== State.COUNTDOWN) return;
    const entries = Array.from(plants.values());
    if (entries.length < 2) { cancelRound("Not enough players this time. Try again."); return; }
    // Use crypto-backed randomness when available; unbiased rejection sampling avoids modulo bias.
    const winnerIndex = secureRandomIndex(entries.length);
    const winner = entries[winnerIndex];
    state = State.RESULT;
    plants.forEach(p => {
      if (p === winner) {
        p.el.classList.add("is-winner");
        p.el.querySelector(".plant-label").textContent = "PLAYER ONE";
      } else {
        p.el.classList.add("is-loser");
        p.el.querySelector(".plant-label").textContent = `Player ${p.labelIndex}`;
      }
    });
    setStatus("A sunflower has bloomed!", "The garden has chosen your first player.");
    banner.textContent = `🌻  PLAYER ONE  ·  Player ${winner.labelIndex}`;
    banner.classList.add("visible");
    announce(`Player ${winner.labelIndex} goes first!`);
    bloomSound();
    vibrate([30,45,70]);
    resultTimer = schedule(() => {
      // Keep the winner visible until replay; no automatic reset.
      resultTimer = null;
    }, 1000);
  }

  function secureRandomIndex(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      const range = 0x100000000;
      const limit = range - (range % max);
      const values = new Uint32Array(1);
      let value;
      do { window.crypto.getRandomValues(values); value = values[0]; } while (value >= limit);
      return value % max;
    }
    return Math.floor(Math.random() * max);
  }

  function cancelRound(message) {
    clearAllTimers();
    roundToken++;
    state = State.IDLE;
    setStatus("Let's grow again", message);
    announce(message);
  }

  function resetRound() {
    roundToken++;
    clearAllTimers();
    plants.forEach(p => p.el.remove());
    plants.clear();
    lastPointerPositions.clear();
    countdown.classList.remove("visible");
    countdown.textContent = "";
    banner.classList.remove("visible");
    banner.textContent = "";
    state = State.IDLE;
    setStatus("Gather your players", "Everyone, place one finger anywhere in the garden.");
    updateCount();
    announce("New round. Place your fingers to begin.");
  }

  garden.addEventListener("pointerdown", event => {
    // Only accept a new participant while gathering; no mouse secondary buttons.
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    if (state === State.COUNTDOWN || state === State.RESULT) return;
    if (plants.has(event.pointerId)) return;
    if (plants.size >= MAX_PLAYERS) {
      setStatus("Garden is full!", "Six players are ready. Let the countdown finish.");
      return;
    }
    const point = relPoint(event);
    const player = makePlant(event.pointerId, point);
    lastPointerPositions.set(event.pointerId, point);
    // Do not use setPointerCapture: touches may begin anywhere and each finger has its own pointer stream.
    // The document listeners below track releases even if the pointer moves outside the garden.
    if (state === State.IDLE) state = State.JOINING;
    resetJoinTimer();
    try { if (event.pointerType === "touch") garden.setPointerCapture(event.pointerId); } catch (_) {}
  }, { passive:false });

  garden.addEventListener("pointermove", event => {
    if (!plants.has(event.pointerId) || state === State.COUNTDOWN || state === State.RESULT) return;
    event.preventDefault();
    const player = plants.get(event.pointerId);
    const point = relPoint(event);
    // Track each finger independently. Avoid moving labels excessively for tiny tremors.
    if (Math.abs(point.x - player.x) > 5 || Math.abs(point.y - player.y) > 5) placePlant(player, point.x, point.y);
  }, { passive:false });

  function handlePointerEnd(event) {
    if (!plants.has(event.pointerId)) return;
    lastPointerPositions.delete(event.pointerId);
    if (state === State.COUNTDOWN || state === State.RESULT) return;
    const player = plants.get(event.pointerId);
    if (player) {
      player.el.remove();
      plants.delete(event.pointerId);
      updateCount();
    }
    if (plants.size < 2) {
      clearTimer(joinTimer); clearTimer(tickTimer);
      joinTimer = tickTimer = null;
      state = plants.size ? State.JOINING : State.IDLE;
      if (plants.size === 1) {
        // A fresh full window starts if another player later joins.
        setStatus("Need one more player", "Keep one finger down and invite another player to join.");
        joinDeadline = 0;
      } else {
        setStatus("Gather your players", "Everyone, place one finger anywhere in the garden.");
      }
    } else {
      // A player leaving is a change in the group; give the remaining group a fresh join window.
      state = State.JOINING;
      resetJoinTimer();
    }
  }
  document.addEventListener("pointerup", handlePointerEnd, { passive:false });
  document.addEventListener("pointercancel", handlePointerEnd, { passive:false });
  document.addEventListener("lostpointercapture", handlePointerEnd, { passive:false });

  resetButton.addEventListener("click", resetRound);
  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggle.setAttribute("aria-pressed", String(!soundEnabled));
    soundToggle.setAttribute("aria-label", soundEnabled ? "Turn sound off" : "Turn sound on");
    soundIcon.textContent = soundEnabled ? "♫" : "♪̸";
    if (soundEnabled) { tone(660,.12,"sine",.025); }
  });

  // A lifted finger during the countdown removes that participant and cancels if fewer than two remain.
  // During the result reveal, pointer releases are ignored so the winning flower stays on screen.
  updateCount();
  window.addEventListener("resize", () => {
    if (state === State.COUNTDOWN || state === State.RESULT) return;
    plants.forEach(p => placePlant(p, p.x, p.y));
  });
})();
