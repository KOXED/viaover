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
  var START_COINS = 10;
  var STORAGE_KEY = "viaoverSlotCoins";
  var SPIN_MS = [700, 1100, 1500];
  var TICK_MS = 80;

  var balanceEl = document.getElementById("slot-balance");
  var resultEl = document.getElementById("slot-result");
  var spinBtn = document.getElementById("spin");
  var resetBtn = document.getElementById("reset-coins");
  var reels = [
    document.getElementById("reel-0"),
    document.getElementById("reel-1"),
    document.getElementById("reel-2")
  ];

  if (!balanceEl || !resultEl || !spinBtn || !resetBtn || reels.some(function (reel) { return !reel; })) {
    return;
  }

  var coins = readCoins();
  var spinning = false;

  function readCoins() {
    var stored = localStorage.getItem(STORAGE_KEY);
    var value = parseInt(stored, 10);
    if (stored === null || isNaN(value) || value < 0) return START_COINS;
    return value;
  }

  function saveCoins() {
    localStorage.setItem(STORAGE_KEY, String(coins));
  }

  function randomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  function setSymbol(reel, symbol) {
    var face = reel.querySelector(".symbol");
    if (face) face.textContent = symbol;
  }

  function render() {
    balanceEl.textContent = "Coins: " + coins;
    spinBtn.disabled = spinning || coins < 1;
    resetBtn.disabled = spinning;
  }

  function finishSpin(outcome) {
    var win = outcome[0] === outcome[1] && outcome[1] === outcome[2];
    if (win) {
      var payout = PAYOUTS[outcome[0]] || 0;
      coins += payout;
      saveCoins();
      resultEl.textContent = outcome.join(" ") + " — you win " + payout + " coins.";
    } else {
      resultEl.textContent = outcome.join(" ") + " — no match.";
    }
    spinning = false;
    render();
  }

  function spin() {
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
      }, SPIN_MS[index]);
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

  function launchCoin() {
    var coin = document.createElement("button");
    var rect = catFace.getBoundingClientRect();
    var collected = false;
    var size;
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
    document.body.appendChild(coin);
    size = coin.offsetWidth || 56;
    startLeft = rect.left + rect.width / 2 - size / 2;
    startTop = rect.top + rect.height / 2 - size / 2;
    endLeft = 8 + Math.random() * Math.max(0, window.innerWidth - size - 16);
    endTop = 8 + Math.random() * Math.max(0, window.innerHeight - size - 16);
    dx = endLeft - startLeft;
    dy = endTop - startTop;
    len = Math.sqrt(dx * dx + dy * dy) || 1;
    arc = (Math.random() < 0.5 ? -1 : 1) * (24 + Math.random() * 36);
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
    coin.style.animationDuration = (0.7 + Math.random() * 0.35) + "s";

    function collect(event) {
      if (collected) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      collected = true;
      event.preventDefault();
      event.stopPropagation();
      coins += 1;
      saveCoins();
      render();
      balanceEl.classList.remove("pop");
      void balanceEl.offsetWidth;
      balanceEl.classList.add("pop");
      dropElement(coin);
    }

    coin.addEventListener("pointerdown", collect);
  }

  if (catFace && catMessage && catStage) {
    catFace.addEventListener("click", function () {
      var roll;
      bounceCat();
      spawnHearts();

      roll = Math.floor(Math.random() * 100) + 1;
      if (roll <= 10) {
        catMessage.textContent = "🐱 The cat gave you a coin!";
        launchCoin();
      } else {
        catMessage.textContent = "🐱 Purrr… no coin this time.";
      }
    });
  }

  spinBtn.addEventListener("click", spin);

  resetBtn.addEventListener("click", function () {
    if (spinning) return;
    coins = START_COINS;
    saveCoins();
    resultEl.textContent = "Balance restored to 10 coins.";
    render();
  });

  render();
})();
