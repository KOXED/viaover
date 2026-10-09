/* Pure blackjack rules. No wallet and no DOM.
   A later server can rerun these checks before accepting a payout. */
var VIAOVER_BLACKJACK_RULES = (function () {
  var BETS = [1, 5, 10, 25, 50, 100];
  var RANKS = { 1: "A", 11: "J", 12: "Q", 13: "K" };
  var SUITS = ["♠", "♥", "♦", "♣"];
  var SUIT_NAMES = ["spades", "hearts", "diamonds", "clubs"];

  function rankLabel(rank) {
    return RANKS[rank] || String(rank);
  }

  function makeDeck() {
    var deck = [];
    var suit;
    var rank;
    for (suit = 0; suit < 4; suit++) {
      for (rank = 1; rank <= 13; rank++) deck.push({ r: rank, s: suit });
    }
    return deck;
  }

  function randomIndex(n) {
    var cryptoObj = typeof crypto !== "undefined" ? crypto : null;
    var max;
    var limit;
    var buf;
    var value;
    if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
      max = 4294967296;
      limit = max - (max % n);
      buf = new Uint32Array(1);
      do {
        cryptoObj.getRandomValues(buf);
        value = buf[0];
      } while (value >= limit);
      return value % n;
    }
    return Math.floor(Math.random() * n);
  }

  function shuffle(deck) {
    var i;
    var j;
    var swap;
    for (i = deck.length - 1; i > 0; i--) {
      j = randomIndex(i + 1);
      swap = deck[i];
      deck[i] = deck[j];
      deck[j] = swap;
    }
    return deck;
  }

  function handInfo(cards) {
    var total = 0;
    var aces = 0;
    var i;
    var rank;
    for (i = 0; i < cards.length; i++) {
      rank = cards[i].r;
      if (rank === 1) {
        aces += 1;
        total += 11;
      } else if (rank >= 10) {
        total += 10;
      } else {
        total += rank;
      }
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }
    return { total: total, soft: aces > 0 };
  }

  function isNatural(cards) {
    return cards.length === 2 && handInfo(cards).total === 21;
  }

  /* Dealer stands on every 17, including a soft 17. */
  function dealerShouldDraw(cards) {
    return handInfo(cards).total < 17;
  }

  function judge(player, dealer) {
    var playerNatural = isNatural(player);
    var dealerNatural = isNatural(dealer);
    var playerTotal = handInfo(player).total;
    var dealerTotal = handInfo(dealer).total;
    if (playerNatural && dealerNatural) return "push";
    if (playerNatural) return "blackjack";
    if (dealerNatural) return "lose";
    if (playerTotal > 21) return "lose";
    if (dealerTotal > 21) return "win";
    if (playerTotal > dealerTotal) return "win";
    if (playerTotal < dealerTotal) return "lose";
    return "push";
  }

  function openingOutcome(player, dealer) {
    if (isNatural(player) || isNatural(dealer)) return judge(player, dealer);
    return null;
  }

  /* Coins already staked are not in the purse.
     Returned amount is the whole-coin credit for that outcome.
     3:2 uses integer division, so an odd stake pays the next lower coin. */
  function creditFor(outcome, bet) {
    bet = Math.floor(bet);
    if (bet < 1) return 0;
    if (outcome === "blackjack") return bet + Math.floor(bet * 3 / 2);
    if (outcome === "win") return bet * 2;
    if (outcome === "push") return bet;
    return 0;
  }

  return {
    BETS: BETS,
    SUITS: SUITS,
    SUIT_NAMES: SUIT_NAMES,
    rankLabel: rankLabel,
    makeDeck: makeDeck,
    shuffle: shuffle,
    handInfo: handInfo,
    isNatural: isNatural,
    dealerShouldDraw: dealerShouldDraw,
    judge: judge,
    openingOutcome: openingOutcome,
    creditFor: creditFor
  };
})();
