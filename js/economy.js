/* Add a game by appending an object to VIAOVER_GAMES.
   coinsKey and pointsKey are that game's saved balances.
   Games that share one purse must reuse the same keys.
   Homepage totals add each key once. Do not add a combined total. */
var VIAOVER_GAMES = [
  {
    id: "slots",
    title: "Slots",
    description: "Spin the reels, collect coins, and trade points.",
    href: "/games/slots/",
    thumb: "🎰",
    available: true,
    coinsKey: "viaoverSlotCoins",
    pointsKey: "viaoverSlotPoints"
  },
  {
    id: "blackjack",
    title: "Blackjack",
    description: "Play the dealer. Natural blackjack pays 3:2.",
    href: "/games/blackjack/",
    thumb: "🃏",
    available: true,
    coinsKey: "viaoverSlotCoins",
    pointsKey: "viaoverSlotPoints"
  }
];

var VIAOVER_ECONOMY = (function () {
  function readBalance(key) {
    var stored;
    var value;
    if (!key) return 0;
    try {
      stored = localStorage.getItem(key);
    } catch (e) {
      return 0;
    }
    value = parseInt(stored, 10);
    if (stored === null || isNaN(value) || value < 0) return 0;
    return value;
  }

  function gameById(id) {
    var i;
    for (i = 0; i < VIAOVER_GAMES.length; i++) {
      if (VIAOVER_GAMES[i] && VIAOVER_GAMES[i].id === id) return VIAOVER_GAMES[i];
    }
    return null;
  }

  function totals() {
    var coins = 0;
    var points = 0;
    var seenCoins = {};
    var seenPoints = {};
    var i;
    var game;
    for (i = 0; i < VIAOVER_GAMES.length; i++) {
      game = VIAOVER_GAMES[i];
      if (!game) continue;
      if (game.coinsKey && !seenCoins[game.coinsKey]) {
        seenCoins[game.coinsKey] = true;
        coins += readBalance(game.coinsKey);
      }
      if (game.pointsKey && !seenPoints[game.pointsKey]) {
        seenPoints[game.pointsKey] = true;
        points += readBalance(game.pointsKey);
      }
    }
    return { coins: coins, points: points };
  }

  function writeBalance(key, value) {
    var amount = typeof value === "number" ? value : parseInt(value, 10);
    if (!key || !isFinite(amount) || amount < 0) return false;
    try {
      localStorage.setItem(key, String(Math.floor(amount)));
    } catch (e) {
      return false;
    }
    return true;
  }

  return {
    readBalance: readBalance,
    totals: totals,
    readCoins: function (id) {
      var game = gameById(id);
      return game ? readBalance(game.coinsKey) : 0;
    },
    readPoints: function (id) {
      var game = gameById(id);
      return game ? readBalance(game.pointsKey) : 0;
    },
    writeCoins: function (id, value) {
      var game = gameById(id);
      if (!game || !game.coinsKey) return false;
      return writeBalance(game.coinsKey, value);
    },
    writePoints: function (id, value) {
      var game = gameById(id);
      if (!game || !game.pointsKey) return false;
      return writeBalance(game.pointsKey, value);
    }
  };
})();
