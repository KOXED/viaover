/* Blackjack table. Wallet reads and writes go through VIAOVER_ECONOMY only.
   Round progress is stored apart from the purse so a reload can resume
   without charging or paying twice. Payouts should be checked again
   with VIAOVER_BLACKJACK_RULES before any future server accepts them. */
(function () {
  var RULES = window.VIAOVER_BLACKJACK_RULES;
  var ROUND_KEY = "viaoverBlackjackRound";
  var MUTE_KEY = "viaoverBlackjackMute";
  var root = document.getElementById("bj-dealer-cards");
  if (!root || !RULES || !window.VIAOVER_ECONOMY) return;

  var dealerCards = root;
  var playerCards = document.getElementById("bj-player-cards");
  var dealerTotal = document.getElementById("bj-dealer-total");
  var playerTotal = document.getElementById("bj-player-total");
  var resultEl = document.getElementById("bj-result");
  var balanceEl = document.getElementById("bj-balance");
  var pointsEl = document.getElementById("bj-points");
  var wagerEl = document.getElementById("bj-wager");
  var betHost = document.getElementById("bj-bets");
  var dealBtn = document.getElementById("bj-deal");
  var hitBtn = document.getElementById("bj-hit");
  var standBtn = document.getElementById("bj-stand");
  var nextBtn = document.getElementById("bj-next");
  var muteBtn = document.getElementById("bj-mute");
  var betButtons = [];
  var phase = "bet";
  var current = null;
  var bet = RULES.BETS[0];
  var busy = false;
  var muted = false;
  var audioCtx = null;
  var unlockTimer = 0;

  function readCoins() {
    return VIAOVER_ECONOMY.readCoins("blackjack");
  }

  function writeCoins(amount) {
    if (amount < 0) amount = 0;
    return VIAOVER_ECONOMY.writeCoins("blackjack", Math.floor(amount));
  }

  function readPoints() {
    return VIAOVER_ECONOMY.readPoints("blackjack");
  }

  function loadRound() {
    var raw;
    var round;
    try {
      raw = localStorage.getItem(ROUND_KEY);
    } catch (e) {
      return null;
    }
    if (!raw) return null;
    try {
      round = JSON.parse(raw);
    } catch (e) {
      return null;
    }
    return validRound(round) ? round : null;
  }

  function isCard(card) {
    return !!card &&
      typeof card.r === "number" && card.r >= 1 && card.r <= 13 &&
      typeof card.s === "number" && card.s >= 0 && card.s <= 3;
  }

  function validRound(round) {
    var cards;
    var i;
    if (!round || round.v !== 1) return false;
    if (RULES.BETS.indexOf(round.bet) === -1) return false;
    if (typeof round.balanceAfterStake !== "number" || round.balanceAfterStake < 0) return false;
    if (!Array.isArray(round.player) || round.player.length < 2) return false;
    if (!Array.isArray(round.dealer) || round.dealer.length < 2) return false;
    if (!Array.isArray(round.deck)) return false;
    if (round.phase !== "deal" && round.phase !== "player" && round.phase !== "done") return false;
    cards = round.player.concat(round.dealer, round.deck);
    for (i = 0; i < cards.length; i++) {
      if (!isCard(cards[i])) return false;
    }
    return true;
  }

  function saveRound(round) {
    try {
      localStorage.setItem(ROUND_KEY, JSON.stringify(round));
    } catch (e) {}
  }

  function clearRound() {
    try {
      localStorage.removeItem(ROUND_KEY);
    } catch (e) {}
  }

  function takeStake(round) {
    var coins;
    var next;
    if (round.stakeTaken) return true;
    coins = readCoins();
    if (coins === round.balanceAfterStake) {
      round.stakeTaken = true;
      saveRound(round);
      return true;
    }
    if (coins < round.bet) return false;
    next = coins - round.bet;
    round.balanceAfterStake = next;
    saveRound(round);
    if (!writeCoins(next)) return false;
    round.stakeTaken = true;
    saveRound(round);
    return true;
  }

  function applyPayout(round) {
    var credit;
    var coins;
    var target;
    if (!round || round.phase !== "done" || round.payoutApplied) return;
    round.outcome = RULES.judge(round.player, round.dealer);
    credit = RULES.creditFor(round.outcome, round.bet);
    if (credit < 0) credit = 0;
    coins = readCoins();
    target = round.balanceAfterStake + credit;
    if (coins !== target) {
      if (coins === round.balanceAfterStake) writeCoins(target);
      else writeCoins(Math.max(0, coins + credit));
    }
    round.payoutApplied = true;
    saveRound(round);
  }

  function commitOutcome(round, outcome) {
    if (round.phase === "done") return;
    round.outcome = outcome;
    round.phase = "done";
    round.payoutApplied = false;
    saveRound(round);
    applyPayout(round);
  }

  function loadMute() {
    try {
      muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch (e) {
      muted = false;
    }
  }

  function tone(freq, dur, when) {
    var start;
    var osc;
    var gain;
    if (muted) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      start = audioCtx.currentTime + (when || 0);
      osc = audioCtx.createOscillator();
      gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, start);
      gain.gain.setValueAtTime(0.04, start + Math.max(0, dur - 0.02));
      gain.gain.linearRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    } catch (e) {}
  }

  function playOutcome(outcome) {
    if (outcome === "blackjack" || outcome === "win") {
      tone(523, 0.08, 0);
      tone(784, 0.12, 0.09);
    } else if (outcome === "push") {
      tone(440, 0.08, 0);
    } else {
      tone(196, 0.14, 0);
    }
  }

  function makeCard(card, faceDown) {
    var el = document.createElement("div");
    var corner = document.createElement("span");
    var suit = document.createElement("span");
    var red = card && (card.s === 1 || card.s === 2);
    el.className = "bj-card" + (faceDown ? " back" : "") + (!faceDown && red ? " red" : "");
    if (faceDown) {
      el.setAttribute("aria-label", "Face-down card");
      return el;
    }
    el.setAttribute("aria-label", RULES.rankLabel(card.r) + " of " + RULES.SUIT_NAMES[card.s]);
    corner.className = "bj-corner";
    corner.textContent = RULES.rankLabel(card.r) + RULES.SUITS[card.s];
    suit.className = "bj-suit";
    suit.textContent = RULES.SUITS[card.s];
    el.appendChild(corner);
    el.appendChild(suit);
    return el;
  }

  function renderCards(host, cards, hideHole, animateFrom) {
    host.textContent = "";
    cards.forEach(function (card, index) {
      var down = hideHole && index === 1;
      var el = makeCard(down ? null : card, down);
      if (animateFrom !== null && animateFrom !== undefined && index >= animateFrom) {
        el.classList.add("deal");
        el.style.animationDelay = Math.min(index, 8) * 70 + "ms";
      }
      host.appendChild(el);
    });
  }

  function resultText() {
    var info;
    var profit;
    if (!current || phase === "bet") {
      if (readCoins() < bet) return "Not enough coins.";
      return "Place a bet.";
    }
    if (phase === "player") return "Your turn.";
    info = RULES.handInfo(current.player);
    profit = RULES.creditFor(current.outcome, current.bet) - current.bet;
    if (current.outcome === "blackjack") return "Blackjack. You win " + profit + " coins.";
    if (current.outcome === "win") return "You win " + current.bet + " coins.";
    if (current.outcome === "push") return "Push.";
    if (info.total > 21) return "Bust.";
    if (RULES.isNatural(current.dealer)) return "Dealer blackjack.";
    return "Dealer wins.";
  }

  function updateButtons() {
    var coins = readCoins();
    var betting = phase === "bet" && !busy && !current;
    dealBtn.disabled = !betting || coins < bet;
    hitBtn.disabled = busy || phase !== "player";
    standBtn.disabled = busy || phase !== "player";
    nextBtn.disabled = busy || phase !== "done";
    betButtons.forEach(function (button) {
      var amount = parseInt(button.textContent, 10);
      button.disabled = !betting;
      button.setAttribute("aria-pressed", amount === bet ? "true" : "false");
    });
    if (muteBtn) {
      muteBtn.textContent = muted ? "[ MUTED ]" : "[ SOUND ]";
      muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    }
  }

  function paint(playerFrom, dealerFrom) {
    var hideHole = phase === "player" || phase === "deal";
    var shownBet = current ? current.bet : bet;
    balanceEl.textContent = "Coins: " + readCoins();
    pointsEl.textContent = "Points: " + readPoints();
    wagerEl.textContent = "Bet: " + shownBet;
    if (current) {
      dealerTotal.textContent = "Total: " + RULES.handInfo(hideHole ? current.dealer.slice(0, 1) : current.dealer).total;
      playerTotal.textContent = "Total: " + RULES.handInfo(current.player).total;
      renderCards(dealerCards, current.dealer, hideHole, dealerFrom);
      renderCards(playerCards, current.player, false, playerFrom);
    } else {
      dealerTotal.textContent = "Total: —";
      playerTotal.textContent = "Total: —";
      dealerCards.textContent = "";
      playerCards.textContent = "";
    }
    resultEl.textContent = resultText();
    updateButtons();
  }

  function unlockSoon(ms) {
    window.clearTimeout(unlockTimer);
    unlockTimer = window.setTimeout(function () {
      busy = false;
      updateButtons();
    }, ms);
  }

  function deal() {
    var coins;
    var deck;
    var round;
    var opening;
    if (busy || phase !== "bet" || current) return;
    if (RULES.BETS.indexOf(bet) === -1) return;
    coins = readCoins();
    if (coins < bet) return;
    busy = true;
    updateButtons();
    deck = RULES.shuffle(RULES.makeDeck());
    round = {
      v: 1,
      bet: bet,
      deck: deck,
      player: [],
      dealer: [],
      phase: "deal",
      outcome: "",
      stakeTaken: false,
      payoutApplied: false,
      balanceAfterStake: coins - bet
    };
    round.player.push(deck.pop());
    round.dealer.push(deck.pop());
    round.player.push(deck.pop());
    round.dealer.push(deck.pop());
    saveRound(round);
    if (!takeStake(round)) {
      clearRound();
      busy = false;
      paint(null, null);
      return;
    }
    opening = RULES.openingOutcome(round.player, round.dealer);
    if (opening) commitOutcome(round, opening);
    else {
      round.phase = "player";
      saveRound(round);
    }
    current = round;
    phase = round.phase === "done" ? "done" : "player";
    tone(660, 0.04, 0);
    if (phase === "done") playOutcome(round.outcome);
    paint(0, 0);
    unlockSoon(phase === "done" ? 760 : 640);
  }

  function hit() {
    var from;
    if (busy || phase !== "player" || !current || current.phase !== "player") return;
    if (!current.deck.length) return;
    busy = true;
    updateButtons();
    current.player.push(current.deck.pop());
    saveRound(current);
    from = current.player.length - 1;
    tone(660, 0.04, 0);
    if (RULES.handInfo(current.player).total > 21) {
      commitOutcome(current, "lose");
      phase = "done";
      playOutcome("lose");
    }
    paint(from, null);
    unlockSoon(360);
  }

  function stand() {
    if (busy || phase !== "player" || !current || current.phase !== "player") return;
    busy = true;
    updateButtons();
    while (RULES.dealerShouldDraw(current.dealer) && current.deck.length) {
      current.dealer.push(current.deck.pop());
    }
    commitOutcome(current, RULES.judge(current.player, current.dealer));
    phase = "done";
    playOutcome(current.outcome);
    paint(null, 1);
    unlockSoon(700);
  }

  function newRound() {
    if (busy || phase !== "done" || !current) return;
    if (!current.payoutApplied) applyPayout(current);
    clearRound();
    current = null;
    phase = "bet";
    paint(null, null);
  }

  function boot() {
    var round = loadRound();
    var opening;
    loadMute();
    if (!round) {
      var stored = null;
      try {
        stored = localStorage.getItem(ROUND_KEY);
      } catch (e) {}
      if (stored) clearRound();
    }
    if (round && !round.stakeTaken && !takeStake(round)) {
      if (readCoins() !== round.balanceAfterStake) clearRound();
      round = null;
    }
    if (round && round.phase === "deal") {
      opening = RULES.openingOutcome(round.player, round.dealer);
      if (opening) commitOutcome(round, opening);
      else {
        round.phase = "player";
        saveRound(round);
      }
    }
    if (round && round.phase === "player" && RULES.handInfo(round.player).total > 21) {
      commitOutcome(round, "lose");
    }
    if (round && round.phase === "done" && !round.payoutApplied) applyPayout(round);
    current = round;
    if (!round) phase = "bet";
    else if (round.phase === "done") phase = "done";
    else phase = "player";
    if (round) bet = round.bet;
    busy = false;
    paint(null, null);
  }

  RULES.BETS.forEach(function (amount) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = String(amount);
    button.setAttribute("aria-label", amount + " coins");
    button.addEventListener("click", function () {
      if (phase !== "bet" || busy || current) return;
      bet = amount;
      paint(null, null);
    });
    betHost.appendChild(button);
    betButtons.push(button);
  });

  dealBtn.addEventListener("click", deal);
  hitBtn.addEventListener("click", hit);
  standBtn.addEventListener("click", stand);
  nextBtn.addEventListener("click", newRound);
  muteBtn.addEventListener("click", function () {
    muted = !muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch (e) {}
    updateButtons();
  });

  window.addEventListener("pageshow", boot);
  boot();
})();
