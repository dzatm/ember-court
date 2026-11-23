// Ember Court — game state, rules and the AI opponent. No DOM here.
import { cardById, makeInstance, rngFromSeed, shuffledDeck } from './cards.js';

export const MAX_LIFE = 30;
export const MAX_BOARD = 5;

export function newSide(rng) {
  return {
    life: MAX_LIFE, mana: 0, maxMana: 0,
    deck: shuffledDeck(rng), hand: [], board: [],
  };
}

export function newGame(seed) {
  const rng = rngFromSeed(seed ?? (Math.random() * 1e9) | 0);
  const g = {
    screen: 'title', turn: 'player', turnCount: 1, over: false, winner: null,
    player: newSide(rng), ai: newSide(rng),
    log: ['Welcome to the Ember Court.'],
    selected: null, // {kind:'hand',index} | {kind:'board',index}
    fast: false, // test hook: skip AI delays
    onChange: null,
  };
  // Opening hands: 3 cards each.
  for (let i = 0; i < 3; i++) { drawCard(g, 'player'); drawCard(g, 'ai'); }
  return g;
}

export function emit(g) { if (g.onChange) g.onChange(g); }

export function log(g, html) {
  g.log.unshift(html);
  if (g.log.length > 5) g.log.length = 5;
}

export function sideOf(g, who) { return who === 'player' ? g.player : g.ai; }
export function foeOf(g, who) { return who === 'player' ? g.ai : g.player; }

export function drawCard(g, who) {
  const s = sideOf(g, who);
  if (!s.deck.length) return null;
  const inst = makeInstance(s.deck.pop());
  if (s.hand.length >= 7) { log(g, `<b>${who === 'player' ? 'You' : 'The Warden'}</b> drew — hand full, card burned.`); return inst; }
  s.hand.push(inst);
  return inst;
}

export function startGame(g) {
  g.screen = 'table'; g.turn = 'player'; g.turnCount = 1;
  g.player.maxMana = 1; g.player.mana = 1;
  g.ai.maxMana = 0; g.ai.mana = 0;
  log(g, 'Your turn — <b>1 mana</b>. Play a card or end your turn.');
  emit(g);
}

function checkEnd(g) {
  if (g.over) return;
  if (g.ai.life <= 0) { g.ai.life = 0; g.over = true; g.winner = 'player'; g.screen = 'win'; log(g, '<b>The Warden falls!</b>'); }
  else if (g.player.life <= 0) { g.player.life = 0; g.over = true; g.winner = 'ai'; g.screen = 'loss'; log(g, '<b>Your embers fade…</b>'); }
  emit(g);
}

export function damageCreature(g, who, idx, amount) {
  const s = sideOf(g, who);
  const c = s.board[idx];
  if (!c) return;
  c.hp -= amount;
  if (c.hp <= 0) {
    const def = cardById(c.defId);
    log(g, `<b>${def.name}</b> is destroyed.`);
    s.board.splice(idx, 1);
  }
}

export function damageHero(g, who, amount) {
  const s = sideOf(g, who);
  s.life = Math.max(0, s.life - amount);
  checkEnd(g);
}

// --- playing cards ---
export function canPlay(g, who, handIdx) {
  const s = sideOf(g, who);
  const inst = s.hand[handIdx];
  if (!inst) return false;
  const def = cardById(inst.defId);
  if (def.cost > s.mana) return false;
  if (def.type === 'creature' && s.board.length >= MAX_BOARD) return false;
  return true;
}

// target: {kind:'hero',who} | {kind:'board',who,index} | null
export function playCard(g, who, handIdx, target) {
  const s = sideOf(g, who);
  const inst = s.hand[handIdx];
  if (!inst || !canPlay(g, who, handIdx)) return false;
  const def = cardById(inst.defId);
  s.mana -= def.cost;
  s.hand.splice(handIdx, 1);
  const me = who === 'player' ? 'You' : 'The Warden';
  if (def.type === 'creature') {
    inst.canAttack = false; // summoning sickness: attacks next turn
    s.board.push(inst);
    log(g, `${me} played <b>${def.name}</b> (${def.atk}/${def.hp}).`);
  } else {
    applySpell(g, who, def, target);
  }
  checkEnd(g);
  return true;
}

function applySpell(g, who, def, target) {
  const me = who === 'player' ? 'You' : 'The Warden';
  const foe = foeOf(g, who);
  const mine = sideOf(g, who);
  switch (def.effect) {
    case 'dmg3': case 'dmg6': {
      const dmg = def.effect === 'dmg3' ? 3 : 6;
      if (target && target.kind === 'hero') { damageHero(g, target.who, dmg); log(g, `${me} cast <b>${def.name}</b> at the ${target.who === 'player' ? 'player' : 'Warden'} for ${dmg}.`); }
      else if (target && target.kind === 'board') { damageCreature(g, target.who, target.index, dmg); log(g, `${me} cast <b>${def.name}</b> for ${dmg}.`); }
      break;
    }
    case 'draw2': drawCard(g, who); drawCard(g, who); log(g, `${me} cast <b>${def.name}</b> and drew 2 cards.`); break;
    case 'heal5': mine.life = Math.min(MAX_LIFE, mine.life + 5); log(g, `${me} cast <b>${def.name}</b> and recovered 5 life.`); break;
    case 'aoe2': for (let i = foe.board.length - 1; i >= 0; i--) damageCreature(g, who === 'player' ? 'ai' : 'player', i, 2); log(g, `${me} cast <b>${def.name}</b> — fire sweeps the enemy board.`); break;
    case 'rally': for (const c of mine.board) c.atk += 2; log(g, `${me} sounded the <b>${def.name}</b> — creatures gain +2 attack.`); break;
    case 'buff': if (target && target.kind === 'board') { const c = mine.board[target.index]; if (c) { c.hp += 4; c.maxHp += 4; log(g, `${me} cast <b>${def.name}</b> — a creature gains +0/+4.`); } } break;
    case 'rain': for (let i = foe.board.length - 1; i >= 0; i--) damageCreature(g, who === 'player' ? 'ai' : 'player', i, 3); damageHero(g, who === 'player' ? 'ai' : 'player', 3); log(g, `${me} cast <b>${def.name}</b> — embers rain on everything.`); break;
    default: break;
  }
}

// --- combat ---
export function canAttackWith(g, who, boardIdx) {
  const c = sideOf(g, who).board[boardIdx];
  return !!c && c.canAttack && g.turn === who && !g.over;
}

export function attack(g, who, boardIdx, target) {
  const s = sideOf(g, who);
  const att = s.board[boardIdx];
  if (!att || !canAttackWith(g, who, boardIdx)) return false;
  att.canAttack = false;
  const me = who === 'player' ? 'You' : 'The Warden';
  if (target.kind === 'hero') {
    damageHero(g, target.who, att.atk);
    log(g, `${me}'s <b>${cardById(att.defId).name}</b> hit the ${target.who === 'player' ? 'player' : 'Warden'} for ${att.atk}.`);
  } else {
    const foe = sideOf(g, target.who);
    const def = foe.board[target.index];
    if (!def) return false;
    const defAtk = def.atk;
    damageCreature(g, target.who, target.index, att.atk);
    // Retaliation: the defender strikes back if it survived.
    const stillThere = foe.board[target.index] === def;
    if (stillThere) {
      att.hp -= defAtk;
      if (att.hp <= 0) { log(g, `<b>${cardById(att.defId).name}</b> is destroyed.`); s.board.splice(boardIdx, 1); }
    }
    log(g, `${me}'s <b>${cardById(att.defId).name}</b> attacked <b>${cardById(def.defId).name}</b>.`);
  }
  checkEnd(g);
  return true;
}

// --- turns ---
export function endTurn(g) {
  if (g.turn !== 'player' || g.over) return;
  g.selected = null;
  g.turn = 'ai';
  log(g, 'The Warden takes the turn…');
  emit(g);
  runAiTurn(g);
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function runAiTurn(g) {
  const wait = g.fast ? 0 : 350;
  await sleep(wait);
  if (g.over) return;
  // AI turn start: mana +1 (max 10), draw.
  const ai = g.ai;
  ai.maxMana = Math.min(10, ai.maxMana + 1);
  ai.mana = ai.maxMana;
  drawCard(g, 'ai');
  g.turnCount += 1;
  emit(g);
  // Play cards: repeat while an affordable, useful play exists.
  for (let guard = 0; guard < 12; guard++) {
    if (g.over) return;
    const pick = aiPickPlay(g);
    if (!pick) break;
    playCard(g, 'ai', pick.index, pick.target);
    emit(g);
    await sleep(wait);
  }
  // Attack with every ready creature.
  for (let i = 0; i < ai.board.length; i++) {
    if (g.over) return;
    const c = ai.board[i];
    if (!c || !c.canAttack) continue;
    // Prefer a killable player creature, else go for the face.
    let target = { kind: 'hero', who: 'player' };
    for (let j = 0; j < g.player.board.length; j++) {
      const pc = g.player.board[j];
      if (pc && pc.hp <= c.atk) { target = { kind: 'board', who: 'player', index: j }; break; }
    }
    attack(g, 'ai', i, target);
    emit(g);
    await sleep(wait);
  }
  if (g.over) return;
  // Back to the player: mana +1 (max 10), draw, refresh attacks.
  g.turn = 'player';
  const p = g.player;
  p.maxMana = Math.min(10, p.maxMana + 1);
  p.mana = p.maxMana;
  drawCard(g, 'player');
  for (const c of p.board) c.canAttack = true;
  for (const c of ai.board) c.canAttack = true;
  log(g, `Your turn — <b>${p.mana} mana</b>.`);
  emit(g);
}

// Choose one AI play, or null when nothing useful is affordable.
function aiPickPlay(g) {
  const ai = g.ai;
  const foe = g.player;
  for (let i = 0; i < ai.hand.length; i++) {
    const inst = ai.hand[i];
    const def = cardById(inst.defId);
    if (!canPlay(g, 'ai', i)) continue;
    if (def.type === 'creature') {
      if (ai.board.length < MAX_BOARD) return { index: i, target: null };
      continue;
    }
    switch (def.effect) {
      case 'heal5': if (ai.life <= 20) return { index: i, target: null }; break;
      case 'draw2': if (ai.hand.length <= 4) return { index: i, target: null }; break;
      case 'rally': if (ai.board.length >= 2) return { index: i, target: null }; break;
      case 'buff': if (ai.board.length) return { index: i, target: { kind: 'board', who: 'ai', index: 0 } }; break;
      case 'aoe2': if (foe.board.length >= 2) return { index: i, target: null }; break;
      case 'rain': if (foe.board.length >= 1 || foe.life <= 12) return { index: i, target: null }; break;
      case 'dmg3': case 'dmg6': {
        const dmg = def.effect === 'dmg3' ? 3 : 6;
        if (foe.life <= dmg) return { index: i, target: { kind: 'hero', who: 'player' } };
        const killable = foe.board.findIndex((c) => c.hp <= dmg);
        if (killable >= 0) return { index: i, target: { kind: 'board', who: 'player', index: killable } };
        if (foe.board.length === 0) return { index: i, target: { kind: 'hero', who: 'player' } };
        break;
      }
      default: break;
    }
  }
  return null;
}

// --- screenshot states: drive the real game into a state, then render ---
export function setupShot(g, shot) {
  if (shot === 'start') { g.screen = 'title'; return; }
  startGame(g);
  if (shot === 'play') {
    // A lively mid-game: both boards staffed, hands full, mana 5.
    const p = g.player, a = g.ai;
    p.life = 26; a.life = 22; p.maxMana = 5; p.mana = 5; a.maxMana = 4; a.mana = 0;
    p.board = ['hound', 'dancer', 'smith'].map((id) => { const c = makeInstance(id); c.canAttack = true; return c; });
    a.board = ['golem', 'wisp'].map((id) => { const c = makeInstance(id); c.canAttack = false; return c; });
    p.hand = ['imp', 'bolt', 'wolf', 'mend', 'kindling'].map((id) => makeInstance(id));
    a.hand = ['page', 'brute'].map((id) => makeInstance(id));
    g.log = ['<b>The Warden</b> played <b>Smoke Wisp</b> (4/2).', 'You played <b>Flame Dancer</b> (3/3).', 'Your turn — <b>5 mana</b>.'];
    emit(g);
    return;
  }
  if (shot === 'win') { g.ai.life = 1; damageHero(g, 'ai', 1); return; }
  if (shot === 'loss') { g.player.life = 1; damageHero(g, 'player', 1); return; }
}
