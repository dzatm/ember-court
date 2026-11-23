# Ember Court — a card battler

A complete, original 1v1 turn-based card battler built for make.fun's
**[Make the best card game](https://make.fun/bounty/best-card-game-20261122-1826)**
bounty. Fully offline: static files, no network requests, no external assets
— every card is drawn with CSS and text.

## The game

You face **The Warden** in a duel of embers. First to bring the other to
**0 life** wins. Both sides start at 30 life.

- **Mana:** you start with 1, gain +1 each turn, up to 10. Mana refills
  every turn. Every card costs mana.
- **Cards:** 24 original cards — 16 creatures (attack/health) and 8 spells
  (damage, healing, card draw, board-wide fire, buffs). All names, values
  and art are original; nothing is copied from a commercial game.
- **Combat:** click one of your creatures, then an enemy creature or the
  enemy hero, to attack. The defender strikes back if it survives.
  Creatures cannot attack the turn they are played.
- **AI:** the Warden plays cards, casts spells and attacks with a simple
  heuristic — it hunts kills, goes for lethal, and heals when hurt.

## How to play

- **Mouse:** click a card in your hand to play it (spells that need a
  target ask you to click one). Click a creature, then an enemy, to attack.
  Click **END TURN** to pass.
- **Keyboard:** `1`–`7` pick a hand card, `Enter`/`Space` ends your turn,
  `Esc` deselects.

## Play it

Serve the `game/` folder with any static server and open `index.html`
in a desktop browser, e.g. `python3 -m http.server` inside `game/`.

## Files

- `game/` — the playable game (`index.html`, `style.css`, `src/*.js`)
- `screenshots/` — 4 renders of the game itself: title, mid-game table,
  win screen, loss screen
- `main.ts` — the entry program: copies `game/` + `screenshots/` to the
  output directory and writes `dossier.json` with the vendored make.fun
  library (`vendor/makefun-game.ts`)
- `shots.json` — how each screenshot was produced (`?shot=` + `?seed=`)

## License

MIT — see `LICENSE`.
