// Ember Court — bootstrap, keyboard input and the ?shot= hook for screenshots.
import { newGame, startGame, setupShot, playCard, attack, endTurn } from './game.js';
import { render } from './render.js';
import { cardById } from './cards.js';

const params = new URLSearchParams(location.search);
const seed = params.get('seed') ? parseInt(params.get('seed'), 10) : undefined;
const shot = params.get('shot');
const fast = params.get('fast') === '1';

let g = newGame(seed);
g.fast = fast;
g.onChange = () => render(g);

// Test/debug hooks (used by the Playwright play-test, not by the game UI).
window.__ember = {
  get state() { return g; },
  start() { startGame(g); render(g); },
  restart() { g = newGame(seed); g.fast = fast; g.onChange = () => render(g); startGame(g); render(g); },
  playCard(i, target) { const ok = playCard(g, 'player', i, target || null); render(g); return ok; },
  attack(i, target) { const ok = attack(g, 'player', i, target); render(g); return ok; },
  endTurn() { endTurn(g); render(g); },
  cardName(id) { return cardById(id).name; },
  cardDef(id) { return cardById(id); },
};

if (shot) {
  setupShot(g, shot);
  render(g);
} else {
  render(g);
}

// Keyboard: 1-7 select a hand card, Enter/Space end turn, Esc deselect.
document.addEventListener('keydown', (e) => {
  if (g.screen !== 'table' || g.turn !== 'player' || g.over) return;
  if (e.key >= '1' && e.key <= '7') {
    const idx = parseInt(e.key, 10) - 1;
    const inst = g.player.hand[idx];
    if (!inst) return;
    const def = cardById(inst.defId);
    if (def.type === 'creature' || !def.target || def.target === 'none') {
      window.__ember.playCard(idx, null);
    } else {
      g.selected = { kind: 'hand', index: idx };
      render(g);
    }
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    window.__ember.endTurn();
  } else if (e.key === 'Escape') {
    g.selected = null;
    render(g);
  }
});
