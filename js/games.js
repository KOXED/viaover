/* Game cards come from VIAOVER_GAMES in economy.js. */
(function () {
  var list = document.getElementById("game-list");
  var games = window.VIAOVER_GAMES || [];
  if (!list) return;

  games.forEach(function (game) {
    var card = document.createElement("article");
    var thumb = document.createElement("div");
    var title = document.createElement("h2");
    var copy = document.createElement("p");
    var play;

    card.className = "game-card";
    thumb.className = "game-thumb";
    thumb.setAttribute("aria-hidden", "true");
    thumb.textContent = game.thumb;
    title.textContent = game.title;
    copy.textContent = game.description;

    if (game.available && game.href) {
      play = document.createElement("a");
      play.className = "game-play";
      play.href = game.href;
      play.textContent = "[ PLAY ]";
      card.appendChild(thumb);
      card.appendChild(title);
      card.appendChild(copy);
      card.appendChild(play);
    } else {
      var status = document.createElement("p");
      play = document.createElement("button");
      status.className = "game-status";
      status.textContent = "Coming Soon";
      play.type = "button";
      play.className = "game-play";
      play.disabled = true;
      play.textContent = "[ PLAY ]";
      card.appendChild(thumb);
      card.appendChild(title);
      card.appendChild(copy);
      card.appendChild(status);
      card.appendChild(play);
    }

    list.appendChild(card);
  });
})();
