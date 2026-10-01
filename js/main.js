/* VIAOVER */

(function () {
  var enter = document.getElementById("enter");
  if (!enter) return;
  if (sessionStorage.getItem("viaoverEntered")) return;

  enter.addEventListener("click", function () {
    sessionStorage.setItem("viaoverEntered", "1");
    document.documentElement.classList.add("entered");
  });
})();

(function () {
  var SYMBOLS = ["🍒", "🍋", "🔔", "💎", "7"];
  var PAYOUTS = { "🍒": 3, "🍋": 5, "🔔": 8, "💎": 15, "7": 30 };
  var POINT_REWARDS = { "🍋": 100, "🍒": 150, "🔔": 250, "💎": 500, "7": 1000 };
  var START_COINS = 10;
  var STORAGE_KEY = "viaoverSlotCoins";
  var POINT_KEY = "viaoverSlotPoints";
  var SPIN_MS = [700, 1100, 1500];
  var AUTO_SPIN_MS = [240, 480, 720];
  var AUTO_HOLD_MS = 180;
  var TICK_MS = 80;

  var balanceEl = document.getElementById("slot-balance");
  var pointsEl = document.getElementById("slot-points");
  var resultEl = document.getElementById("slot-result");
  var spinBtn = document.getElementById("spin");
  var autoBtn = document.getElementById("auto-spin");
  var reels = [
    document.getElementById("reel-0"),
    document.getElementById("reel-1"),
    document.getElementById("reel-2")
  ];

  if (!balanceEl || !resultEl || !spinBtn || reels.some(function (reel) { return !reel; })) {
    return;
  }

  var coins = readCoins();
  var points = readPoints();
  var spinning = false;
  var autoOn = false;

  function readCoins() {
    var stored = localStorage.getItem(STORAGE_KEY);
    var value = parseInt(stored, 10);
    if (stored === null || isNaN(value) || value < 0) return START_COINS;
    return value;
  }

  function saveCoins() {
    localStorage.setItem(STORAGE_KEY, String(coins));
  }

  function readPoints() {
    var stored = localStorage.getItem(POINT_KEY);
    var value = parseInt(stored, 10);
    if (stored === null || isNaN(value) || value < 0) return 0;
    return value;
  }

  function savePoints() {
    localStorage.setItem(POINT_KEY, String(points));
  }

  function showPointGain(amount) {
    var pop;
    if (!pointsEl) return;
    pop = document.createElement("span");
    pop.className = "point-pop";
    pop.setAttribute("aria-hidden", "true");
    pop.textContent = "+" + amount;
    pointsEl.parentNode.appendChild(pop);
    pop.addEventListener("animationend", function () {
      if (pop.parentNode) pop.parentNode.removeChild(pop);
    });
    setTimeout(function () {
      if (pop.parentNode) pop.parentNode.removeChild(pop);
    }, 800);
  }

  function randomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  function setSymbol(reel, symbol) {
    var face = reel.querySelector(".symbol");
    if (face) face.textContent = symbol;
  }

  var POINT_RATE = 20;
  var exchangePanel = document.getElementById("exchange-panel");
  var exchangeRange = document.getElementById("exchange-range");
  var exchangePoints = document.getElementById("exchange-points");
  var exchangeCoins = document.getElementById("exchange-coins");
  var exchangeSubmit = document.getElementById("exchange-submit");
  var exchangeMin = document.getElementById("exchange-min");
  var exchangeMax = document.getElementById("exchange-max");

  function maxExchange() {
    return Math.floor(points / POINT_RATE) * POINT_RATE;
  }

  function updateExchangePreview(value) {
    var coinsOut = Math.floor(value / POINT_RATE);
    if (exchangePoints) exchangePoints.textContent = "Points to exchange: " + value;
    if (exchangeCoins) exchangeCoins.textContent = "Coins received: " + coinsOut;
    if (exchangeSubmit) exchangeSubmit.disabled = value < POINT_RATE;
  }

  function syncExchange() {
    var max;
    var value;
    if (!exchangeRange) return;
    max = maxExchange();
    value = parseInt(exchangeRange.value, 10);
    if (isNaN(value) || value < 0) value = 0;
    value = Math.floor(value / POINT_RATE) * POINT_RATE;
    if (value > max) value = max;
    exchangeRange.min = "0";
    exchangeRange.max = String(max);
    exchangeRange.step = String(POINT_RATE);
    exchangeRange.value = String(value);
    updateExchangePreview(value);
  }

  function render() {
    balanceEl.textContent = "Coins: " + coins;
    if (pointsEl) pointsEl.textContent = "Points: " + points;
    syncExchange();
    spinBtn.disabled = autoOn || spinning || coins < 1;
    if (autoBtn) {
      autoBtn.classList.toggle("active", autoOn);
      autoBtn.setAttribute("aria-pressed", autoOn ? "true" : "false");
    }
  }

  function finishSpin(outcome) {
    var win = outcome[0] === outcome[1] && outcome[1] === outcome[2];
    if (win) {
      var payout = PAYOUTS[outcome[0]] || 0;
      var reelBox = document.querySelector(".reels");
      resultEl.textContent = outcome.join(" ") + " — you win " + payout + " coins.";
      if (payout > 0 && reelBox) spawnCollectibleCoins(reelBox.getBoundingClientRect(), payout);
    } else {
      resultEl.textContent = outcome.join(" ") + " — no match.";
    }
    var pointGain = win ? (POINT_REWARDS[outcome[0]] || 0) : 5;
    points += pointGain;
    savePoints();
    showPointGain(pointGain);
    spinning = false;
    if (autoOn && coins < 1) autoOn = false;
    render();
    if (autoOn && coins >= 1) {
      setTimeout(function () {
        if (autoOn && !spinning && coins >= 1) spin(AUTO_SPIN_MS);
      }, AUTO_HOLD_MS);
    }
  }

  function spin(timings) {
    var delays = Array.isArray(timings) ? timings : SPIN_MS;
    if (spinning || coins < 1) return;

    spinning = true;
    coins -= 1;
    saveCoins();
    resultEl.textContent = "Spinning…";
    render();

    var outcome = [randomSymbol(), randomSymbol(), randomSymbol()];
    var stopped = 0;

    reels.forEach(function (reel, index) {
      reel.classList.add("spinning");
      var ticker = setInterval(function () {
        setSymbol(reel, randomSymbol());
      }, TICK_MS);

      setTimeout(function () {
        clearInterval(ticker);
        reel.classList.remove("spinning");
        setSymbol(reel, outcome[index]);
        stopped += 1;
        if (stopped === reels.length) finishSpin(outcome);
      }, delays[index]);
    });
  }

  if (autoBtn) {
    autoBtn.addEventListener("click", function () {
      if (autoOn) {
        autoOn = false;
        render();
        return;
      }
      if (coins < 1) return;
      autoOn = true;
      render();
      if (!spinning) spin(AUTO_SPIN_MS);
    });
  }

  var catFace = document.getElementById("cat-face");
  var catMessage = document.getElementById("cat-message");
  var catStage = catFace ? catFace.parentNode : null;
  var HEARTS = ["❤️", "💖", "💕"];

  function removeHeart(heart) {
    if (heart.parentNode) heart.parentNode.removeChild(heart);
  }

  function bounceCat() {
    catFace.classList.add("react");
    catFace.style.animation = "none";
    void catFace.offsetWidth;
    catFace.style.animation = "";
  }

  function spawnHearts() {
    var count = 1 + Math.floor(Math.random() * 3);
    var width = catStage.clientWidth;
    var height = catStage.clientHeight;
    var i;

    for (i = 0; i < count; i++) {
      var heart = document.createElement("span");
      var duration = 0.6 + Math.random() * 0.4;
      heart.className = "heart";
      heart.setAttribute("aria-hidden", "true");
      heart.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
      heart.style.left = (width * (0.15 + Math.random() * 0.7)) + "px";
      heart.style.top = (height * (0.1 + Math.random() * 0.7)) + "px";
      heart.style.animationDuration = duration + "s";
      catStage.appendChild(heart);
      heart.addEventListener("animationend", function (event) {
        removeHeart(event.currentTarget);
      });
      setTimeout(removeHeart, Math.ceil(duration * 1000) + 50, heart);
    }
  }

  function dropElement(el) {
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  var COIN_LIFE_MS = 5000;
  var FREEZE_MS = 10000;
  var COOLDOWN_MS = 5 * 60 * 1000;
  var FREEZE_KEY = "viaoverFreezeCooldown";
  var liveCoins = [];
  var freezeOn = false;
  var freezeEndsAt = 0;
  var cooldownEndsAt = 0;
  var freezeClock = null;
  var freezeBtn = document.getElementById("freeze");

  function spawnCollectibleCoins(origin, count) {
    var i;
    if (!origin || count < 1) return;
    for (i = 0; i < count; i++) launchCoin(origin, i, count);
  }

  function forgetCoin(entry) {
    var index = liveCoins.indexOf(entry);
    if (index !== -1) liveCoins.splice(index, 1);
  }

  function setShrinkFrozen(coin, frozen) {
    var list = coin.getAnimations ? coin.getAnimations() : [];
    var i;
    coin.style.animationPlayState = frozen ? "running, paused" : "running, running";
    for (i = 0; i < list.length; i++) {
      if (list[i].animationName !== "coin-shrink") continue;
      if (frozen) list[i].pause();
      else list[i].play();
    }
  }

  function pauseCoins() {
    var now = performance.now();
    var i;
    var entry;
    for (i = 0; i < liveCoins.length; i++) {
      entry = liveCoins[i];
      if (entry.runningSince != null) {
        entry.lifeLeft = Math.max(0, entry.lifeLeft - (now - entry.runningSince));
        entry.runningSince = null;
      }
      clearTimeout(entry.timer);
      entry.timer = null;
      setShrinkFrozen(entry.coin, true);
    }
  }

  function resumeCoins() {
    var now = performance.now();
    var i;
    var entry;
    for (i = 0; i < liveCoins.length; i++) {
      entry = liveCoins[i];
      if (!entry.coin.parentNode || entry.runningSince != null) continue;
      entry.runningSince = now;
      setShrinkFrozen(entry.coin, false);
      clearTimeout(entry.timer);
      entry.timer = setTimeout(entry.expire, Math.max(0, entry.lifeLeft));
    }
  }

  function formatCooldown(ms) {
    var total = Math.ceil(ms / 1000);
    var minutes;
    var seconds;
    if (total < 0) total = 0;
    minutes = Math.floor(total / 60);
    seconds = total % 60;
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }

  function applyFreezeButton() {
    var now = Date.now();
    var left;
    if (!freezeBtn) return;
    if (freezeOn) {
      left = Math.max(0, freezeEndsAt - now);
      freezeBtn.disabled = true;
      freezeBtn.classList.add("freezing");
      freezeBtn.setAttribute("aria-pressed", "true");
      freezeBtn.textContent = "FREEZE " + Math.ceil(left / 1000) + "s";
      freezeBtn.setAttribute("aria-label", "Coin timers frozen, " + Math.ceil(left / 1000) + " seconds left");
      return;
    }
    freezeBtn.classList.remove("freezing");
    freezeBtn.setAttribute("aria-pressed", "false");
    if (cooldownEndsAt > now) {
      left = cooldownEndsAt - now;
      freezeBtn.disabled = true;
      freezeBtn.textContent = formatCooldown(left);
      freezeBtn.setAttribute("aria-label", "Freeze unavailable, " + formatCooldown(left) + " remaining");
      return;
    }
    freezeBtn.disabled = false;
    freezeBtn.textContent = "⏸ FREEZE";
    freezeBtn.setAttribute("aria-label", "Freeze coin timers");
  }

  function stopFreezeClock() {
    if (!freezeClock) return;
    clearInterval(freezeClock);
    freezeClock = null;
  }

  function updateFreezeClock() {
    var now = Date.now();
    if (freezeOn && now >= freezeEndsAt) {
      freezeOn = false;
      document.documentElement.classList.remove("time-freeze");
      resumeCoins();
    }
    if (!freezeOn && cooldownEndsAt <= now) {
      cooldownEndsAt = 0;
      localStorage.removeItem(FREEZE_KEY);
      stopFreezeClock();
    }
    applyFreezeButton();
  }

  function ensureFreezeClock() {
    if (freezeClock) return;
    updateFreezeClock();
    freezeClock = setInterval(updateFreezeClock, 250);
  }

  function startFreeze() {
    var now;
    if (freezeOn || cooldownEndsAt > Date.now()) return;
    now = Date.now();
    freezeOn = true;
    freezeEndsAt = now + FREEZE_MS;
    cooldownEndsAt = now + FREEZE_MS + COOLDOWN_MS;
    localStorage.setItem(FREEZE_KEY, String(cooldownEndsAt));
    document.documentElement.classList.add("time-freeze");
    pauseCoins();
    ensureFreezeClock();
  }

  function launchCoin(origin, index, total) {
    var coin = document.createElement("button");
    var collected = false;
    var entry;
    var size;
    var angle;
    var distance;
    var startLeft;
    var startTop;
    var endLeft;
    var endTop;
    var dx;
    var dy;
    var len;
    var arc;
    var px;
    var py;
    var midLeft;
    var midTop;

    coin.type = "button";
    coin.className = "flying-coin";
    coin.textContent = "🪙";
    coin.setAttribute("aria-label", "Collect coin");
    if (freezeOn) coin.style.animationPlayState = "running, paused";
    document.body.appendChild(coin);
    size = coin.offsetWidth || 56;
    angle = (index / Math.max(total, 1)) * Math.PI * 2 + (Math.random() - 0.5) * 0.9;
    distance = 72 + Math.random() * Math.min(window.innerWidth, window.innerHeight) * 0.28;
    startLeft = clamp(origin.left + origin.width / 2 - size / 2 + Math.cos(angle) * 14, 8, window.innerWidth - size - 8);
    startTop = clamp(origin.top + origin.height / 2 - size / 2 + Math.sin(angle) * 14, 8, window.innerHeight - size - 8);
    endLeft = clamp(startLeft + Math.cos(angle) * distance, 8, window.innerWidth - size - 8);
    endTop = clamp(startTop + Math.sin(angle) * distance, 8, window.innerHeight - size - 8);
    dx = endLeft - startLeft;
    dy = endTop - startTop;
    len = Math.sqrt(dx * dx + dy * dy) || 1;
    arc = (Math.random() < 0.5 ? -1 : 1) * (16 + Math.random() * 34);
    px = -dy / len * arc;
    py = dx / len * arc;
    midLeft = startLeft + dx * 0.55 + px;
    midTop = startTop + dy * 0.55 + py;
    if (midLeft < 8 || midTop < 8 || midLeft > window.innerWidth - size - 8 || midTop > window.innerHeight - size - 8) {
      px = 0;
      py = 0;
    }
    coin.style.left = startLeft + "px";
    coin.style.top = startTop + "px";
    coin.style.setProperty("--x", dx + "px");
    coin.style.setProperty("--y", dy + "px");
    coin.style.setProperty("--px", px + "px");
    coin.style.setProperty("--py", py + "px");
    coin.style.setProperty("--spin", ((Math.random() * 70) - 35) + "deg");

    entry = {
      coin: coin,
      lifeLeft: COIN_LIFE_MS,
      runningSince: null,
      timer: null,
      expire: null
    };

    function discard() {
      clearTimeout(entry.timer);
      entry.timer = null;
      entry.runningSince = null;
      forgetCoin(entry);
      dropElement(coin);
    }

    function expire() {
      if (collected) return;
      collected = true;
      discard();
    }

    function collect(event) {
      var current;
      var centerX;
      var centerY;
      if (collected) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      collected = true;
      event.preventDefault();
      event.stopPropagation();
      clearTimeout(entry.timer);
      entry.timer = null;
      entry.runningSince = null;
      forgetCoin(entry);
      coins += 1;
      saveCoins();
      render();
      balanceEl.classList.remove("pop");
      void balanceEl.offsetWidth;
      balanceEl.classList.add("pop");
      current = coin.getBoundingClientRect();
      centerX = current.left + current.width / 2;
      centerY = current.top + current.height / 2;
      coin.style.animation = "none";
      coin.style.animationPlayState = "running";
      coin.style.translate = "none";
      coin.style.rotate = "none";
      coin.style.scale = "1";
      coin.style.left = (centerX - size / 2) + "px";
      coin.style.top = (centerY - size / 2) + "px";
      void coin.offsetWidth;
      coin.style.animation = "coin-pop 0.18s linear forwards";
      setTimeout(discard, 220);
    }

    entry.expire = expire;
    coin.addEventListener("pointerdown", collect);
    coin.addEventListener("animationend", function (event) {
      if (event.animationName === "coin-shrink" && entry.runningSince != null) expire();
      if (event.animationName === "coin-pop") discard();
    });
    liveCoins.push(entry);
    if (freezeOn) {
      setShrinkFrozen(coin, true);
    } else {
      entry.runningSince = performance.now();
      entry.timer = setTimeout(expire, entry.lifeLeft);
    }
  }

  if (catFace && catMessage && catStage) {
    catFace.addEventListener("click", function () {
      var roll;
      bounceCat();
      spawnHearts();

      roll = Math.floor(Math.random() * 100) + 1;
      if (roll <= 10) {
        catMessage.textContent = "🐱 The cat gave you a coin!";
        spawnCollectibleCoins(catFace.getBoundingClientRect(), 1);
      } else {
        catMessage.textContent = "🐱 Purrr… no coin this time.";
      }
    });
  }

  spinBtn.addEventListener("click", function () {
    if (autoOn) return;
    spin();
  });

  if (freezeBtn) {
    var storedFreeze = parseInt(localStorage.getItem(FREEZE_KEY), 10);
    if (!isNaN(storedFreeze) && storedFreeze > Date.now()) {
      cooldownEndsAt = storedFreeze;
      ensureFreezeClock();
    } else {
      localStorage.removeItem(FREEZE_KEY);
      applyFreezeButton();
    }
    freezeBtn.addEventListener("click", function () {
      startFreeze();
    });
  }

  if (pointsEl && exchangePanel && exchangeRange && exchangeSubmit && exchangeMin && exchangeMax) {
    pointsEl.addEventListener("click", function () {
      var open = exchangePanel.hasAttribute("hidden");
      if (open) {
        exchangePanel.removeAttribute("hidden");
        pointsEl.setAttribute("aria-expanded", "true");
        syncExchange();
      } else {
        exchangePanel.setAttribute("hidden", "");
        pointsEl.setAttribute("aria-expanded", "false");
      }
    });

    exchangeRange.addEventListener("input", function () {
      updateExchangePreview(parseInt(exchangeRange.value, 10) || 0);
    });

    exchangeMin.addEventListener("click", function () {
      exchangeRange.value = "0";
      updateExchangePreview(0);
    });

    exchangeMax.addEventListener("click", function () {
      var max = maxExchange();
      exchangeRange.max = String(max);
      exchangeRange.value = String(max);
      updateExchangePreview(max);
    });

    exchangeSubmit.addEventListener("click", function () {
      var selected = parseInt(exchangeRange.value, 10);
      var gained;
      if (isNaN(selected) || selected < POINT_RATE) return;
      if (selected % POINT_RATE !== 0) return;
      if (selected > points) return;
      gained = Math.floor(selected / POINT_RATE);
      points -= selected;
      if (points < 0) points = 0;
      coins += gained;
      savePoints();
      saveCoins();
      exchangeRange.value = "0";
      render();
    });
  }

  render();
})();
