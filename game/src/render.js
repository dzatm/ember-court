// Ember Court — DOM rendering and input. Re-renders the whole table on every change.
import { cardById } from './cards.js';
import { canAttackWith, canPlay, playCard, attack, endTurn } from './game.js';

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function cardEl(g, who, inst, where, index) {
  const def = cardById(inst.defId);
  const c = el('div', 'card' + (def.type === 'spell' ? ' spell' : '') + (where === 'board' ? ' mini' : ''));
  c.innerHTML = `<div class="cost">${def.cost}</div>
    <div class="cname">${def.name}</div>
    <div class="cart">${def.art}</div>
    <div class="ctext">${def.text}</div>
    ${def.type === 'creature' ? `<div class="stats"><span class="atk">⚔️${inst.atk}</span><span class="hp">❤️${inst.hp}</span></div>` : ''}`;
  if (where === 'hand') {
    if (!canPlay(g, 'player', index)) c.classList.add('unaffordable');
    if (g.selected && g.selected.kind === 'hand' && g.selected.index === index) c.classList.add('selected');
    c.onclick = () => onHandClick(g, index);
  } else {
    if (who === 'player' && !inst.canAttack) c.classList.add('used');
    if (who === 'player' && g.selected && g.selected.kind === 'board' && g.selected.index === index) c.classList.add('selected');
    if (isTargetable(g, { kind: 'board', who, index })) c.classList.add('targetable');
    c.onclick = () => onBoardClick(g, who, index);
  }
  return c;
}

// Is this target valid for the current selection?
export function isTargetable(g, target) {
  const sel = g.selected;
  if (!sel || g.turn !== 'player' || g.over) return false;
  if (sel.kind === 'hand') {
    const inst = g.player.hand[sel.index];
    if (!inst) return false;
    const def = cardById(inst.defId);
    if (def.type !== 'spell' || !def.target || def.target === 'none') return false;
    if (def.target === 'any') return true; // any creature or hero
    if (def.target === 'friendly') return target.kind === 'board' && target.who === 'player';
    return false;
  }
  if (sel.kind === 'board') {
    // Attacking: enemy creatures and the enemy hero.
    return (target.kind === 'board' && target.who === 'ai') || (target.kind === 'hero' && target.who === 'ai');
  }
  return false;
}

function onHandClick(g, index) {
  if (g.turn !== 'player' || g.over) return;
  const inst = g.player.hand[index];
  if (!inst) return;
  const def = cardById(inst.defId);
  if (g.selected && g.selected.kind === 'hand' && g.selected.index === index) { g.selected = null; render(g); return; }
  if (!canPlay(g, 'player', index)) { g.selected = null; render(g); return; }
  if (def.type === 'spell' && (!def.target || def.target === 'none')) {
    playCard(g, 'player', index, null);
    g.selected = null;
  } else if (def.type === 'creature') {
    playCard(g, 'player', index, null);
    g.selected = null;
  } else {
    g.selected = { kind: 'hand', index }; // needs a target
  }
  render(g);
}

function onBoardClick(g, who, index) {
  if (g.turn !== 'player' || g.over) return;
  const target = { kind: 'board', who, index };
  if (g.selected && isTargetable(g, target)) {
    if (g.selected.kind === 'hand') playCard(g, 'player', g.selected.index, target);
    else attack(g, 'player', g.selected.index, target);
    g.selected = null;
    render(g);
    return;
  }
  if (who === 'player') {
    const c = g.player.board[index];
    if (c && canAttackWith(g, 'player', index)) {
      g.selected = (g.selected && g.selected.kind === 'board' && g.selected.index === index) ? null : { kind: 'board', index };
    } else {
      g.selected = null;
    }
    render(g);
  }
}

function onHeroClick(g, who) {
  if (g.turn !== 'player' || g.over) return;
  const target = { kind: 'hero', who };
  if (g.selected && isTargetable(g, target)) {
    if (g.selected.kind === 'hand') playCard(g, 'player', g.selected.index, target);
    else attack(g, 'player', g.selected.index, target);
    g.selected = null;
    render(g);
  }
}

function heroEl(g, who) {
  const s = who === 'player' ? g.player : g.ai;
  const h = el('div', 'hero' + (who === 'player' ? ' you' : ''));
  const name = who === 'player' ? 'You' : 'The Warden';
  const face = who === 'player' ? '🧑‍🚀' : '🧙';
  h.innerHTML = `<div class="hname">${name}</div><div class="hface">${face}</div>
    <div class="life">❤️ ${s.life}</div><div class="mana">◆ ${s.mana}/${s.maxMana} mana</div>
    <div class="deck">Deck: ${s.deck.length} cards</div>`;
  if (isTargetable(g, { kind: 'hero', who })) h.classList.add('targetable');
  h.onclick = () => onHeroClick(g, who);
  return h;
}

function boardEl(g, who) {
  const s = who === 'player' ? g.player : g.ai;
  const b = el('div', 'board');
  if (!s.board.length) b.appendChild(el('div', 'empty', who === 'player' ? 'Your side of the table is empty — play a creature.' : 'The Warden has no creatures yet.'));
  s.board.forEach((inst, i) => b.appendChild(cardEl(g, who, inst, 'board', i)));
  return b;
}

function handEl(g) {
  const h = el('div', 'hand-zone');
  if (!g.player.hand.length) h.appendChild(el('div', 'empty', 'Your hand is empty.'));
  g.player.hand.forEach((inst, i) => h.appendChild(cardEl(g, 'player', inst, 'hand', i)));
  return h;
}

function backsEl(g) {
  const wrap = el('div', 'backs');
  const n = Math.min(g.ai.hand.length, 7);
  for (let i = 0; i < n; i++) wrap.appendChild(el('div', 'back'));
  wrap.appendChild(el('span', 'hand-count', `×${g.ai.hand.length}`));
  return wrap;
}

export function render(g) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  if (g.screen === 'title') {
    const s = el('div', 'screen');
    s.innerHTML = `<h1><span class="flame">🔥</span> EMBER COURT <span class="flame">🔥</span></h1>
      <p class="sub">A duel of cards in a court that never stops burning.</p>
      <div class="rules">You face <b>The Warden</b> — first to bring the other to <b>0 life</b> wins.
      Each turn you gain <b>+1 mana</b> (up to 10) and draw a card. Click a card to play it;
      click one of your creatures, then an enemy, to attack. Spells with a target need one too.
      <b>Keys:</b> 1–7 pick a card, Enter ends your turn.</div>`;
    const btn = el('button', 'big', '▶ &nbsp;PLAY');
    btn.onclick = () => window.__ember.start();
    s.appendChild(btn);
    s.appendChild(el('div', 'hint', '24 original cards · creatures and spells · fully offline'));
    app.appendChild(s);
    return;
  }
  if (g.screen === 'win' || g.screen === 'loss') {
    const win = g.screen === 'win';
    const s = el('div', 'screen ' + (win ? 'win' : 'loss'));
    s.innerHTML = win
      ? `<h1>🏆 VICTORY</h1><p class="sub">The Warden's court is yours. The embers bow to you.</p>`
      : `<h1>💀 DEFEAT</h1><p class="sub">Your embers fade, and the court goes dark.</p>`;
    s.appendChild(el('div', 'final', win
      ? `Final life — <b>You ${g.player.life}</b> · <b>The Warden ${g.ai.life}</b> · ${g.turnCount} turn${g.turnCount === 1 ? '' : 's'}`
      : `Final life — <b>You ${g.player.life}</b> · <b>The Warden ${g.ai.life}</b> · ${g.turnCount} turn${g.turnCount === 1 ? '' : 's'}`));
    const btn = el('button', 'big', '↻ &nbsp;PLAY AGAIN');
    btn.onclick = () => window.__ember.restart();
    s.appendChild(btn);
    app.appendChild(s);
    return;
  }
  // Table
  const t = el('div', 'table');
  const top = el('div', 'row');
  top.appendChild(heroEl(g, 'ai'));
  top.appendChild(boardEl(g, 'ai'));
  top.appendChild(backsEl(g));
  t.appendChild(top);

  const mid = el('div', 'mid');
  const turn = el('div', 'turnbox');
  turn.innerHTML = `<div class="t1">${g.turn === 'player' ? '☀️ Your turn' : '🌙 Warden’s turn'}</div><div class="t2">Turn ${g.turnCount} · Board ${g.player.board.length + g.ai.board.length}/10 creatures</div>`;
  mid.appendChild(turn);
  const logEl = el('div', 'log', g.log.map((l) => `<div>${l}</div>`).join(''));
  mid.appendChild(logEl);
  const end = el('button', '', 'END TURN ⏎');
  end.id = 'endturn';
  end.disabled = g.turn !== 'player' || g.over;
  end.onclick = () => { endTurn(g); render(g); };
  mid.appendChild(end);
  t.appendChild(mid);

  const bot = el('div', 'row');
  bot.appendChild(heroEl(g, 'player'));
  bot.appendChild(boardEl(g, 'player'));
  t.appendChild(bot);

  const handRow = el('div', 'row');
  handRow.appendChild(handEl(g));
  t.appendChild(handRow);
  t.appendChild(el('div', 'hint', 'Click a card to play it · click a creature, then an enemy, to attack · <kbd>1</kbd>–<kbd>7</kbd> pick a card · <kbd>Enter</kbd> end turn · <kbd>Esc</kbd> deselect'));
  app.appendChild(t);
}
