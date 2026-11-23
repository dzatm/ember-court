// Ember Court — the card pool. All names, values and art are original.
// Suits (elements): 🔥 ember, 💧 tide, 🌿 thorn, 🪨 stone. Costs 1-8.
// Creatures have attack/health; spells have an effect + a target rule.
export const CARDS = [
  // ---- creatures ----
  { id: 'page',    name: 'Cinder Page',   cost: 1, type: 'creature', atk: 1, hp: 1, art: '🕯️', text: 'A small flame learning to stand.' },
  { id: 'imp',     name: 'Spark Imp',     cost: 1, type: 'creature', atk: 2, hp: 1, art: '😈', text: 'Quick, loud, and slightly on fire.' },
  { id: 'hound',   name: 'Ash Hound',     cost: 2, type: 'creature', atk: 2, hp: 2, art: '🐺', text: 'It hunts through the grey snowfall.' },
  { id: 'golem',   name: 'Coal Golem',    cost: 2, type: 'creature', atk: 1, hp: 4, art: '🗿', text: 'Slow, heavy, and impossible to move.' },
  { id: 'squire',  name: 'Ember Squire',  cost: 2, type: 'creature', atk: 3, hp: 2, art: '🛡️', text: 'Sworn to the court, shield still warm.' },
  { id: 'dancer',  name: 'Flame Dancer',  cost: 3, type: 'creature', atk: 3, hp: 3, art: '💃', text: 'Every step leaves a little fire behind.' },
  { id: 'wisp',    name: 'Smoke Wisp',    cost: 3, type: 'creature', atk: 4, hp: 2, art: '🌫️', text: 'Hard to hit. Harder to hold.' },
  { id: 'smith',   name: 'Forge Smith',   cost: 3, type: 'creature', atk: 2, hp: 5, art: '🔨', text: 'He mends armour between battles.' },
  { id: 'wolf',    name: 'Cinder Wolf',   cost: 4, type: 'creature', atk: 4, hp: 4, art: '🐺', text: 'Its howl sounds like cracking timber.' },
  { id: 'brute',   name: 'Magma Brute',   cost: 4, type: 'creature', atk: 5, hp: 3, art: '🦍', text: 'A walking volcano with opinions.' },
  { id: 'chick',   name: 'Phoenix Chick', cost: 4, type: 'creature', atk: 3, hp: 5, art: '🐣', text: 'It has already burned down once.' },
  { id: 'knight',  name: 'Ashen Knight',  cost: 5, type: 'creature', atk: 5, hp: 5, art: '⚔️', text: 'His armour is grey. His oath is not.' },
  { id: 'serpent', name: 'Lava Serpent',  cost: 5, type: 'creature', atk: 6, hp: 4, art: '🐍', text: 'It swims through stone like water.' },
  { id: 'crow',    name: 'Storm Crow',    cost: 6, type: 'creature', atk: 6, hp: 6, art: '🦅', text: 'Thunder follows wherever it lands.' },
  { id: 'drake',   name: 'Inferno Drake', cost: 7, type: 'creature', atk: 7, hp: 7, art: '🐉', text: 'The sky catches fire when it flies.' },
  { id: 'queen',   name: 'Ember Queen',   cost: 8, type: 'creature', atk: 8, hp: 8, art: '👑', text: 'The court kneels. The fire does not.' },
  // ---- spells ----
  { id: 'bolt',    name: 'Firebolt',      cost: 2, type: 'spell', art: '🔥', text: 'Deal 3 damage to any target.', effect: 'dmg3', target: 'any' },
  { id: 'kindling',name: 'Kindling',      cost: 1, type: 'spell', art: '📜', text: 'Draw 2 cards.', effect: 'draw2', target: 'none' },
  { id: 'mend',    name: 'Mend Flames',   cost: 2, type: 'spell', art: '💚', text: 'Restore 5 life to yourself.', effect: 'heal5', target: 'none' },
  { id: 'wildfire',name: 'Wildfire',      cost: 4, type: 'spell', art: '🌋', text: 'Deal 2 damage to all enemy creatures.', effect: 'aoe2', target: 'none' },
  { id: 'blast',   name: 'Cinder Blast',  cost: 5, type: 'spell', art: '💥', text: 'Deal 6 damage to any target.', effect: 'dmg6', target: 'any' },
  { id: 'rally',   name: 'Rally Horn',    cost: 3, type: 'spell', art: '📯', text: 'Your creatures gain +2 attack.', effect: 'rally', target: 'none' },
  { id: 'skin',    name: 'Stone Skin',    cost: 2, type: 'spell', art: '🪨', text: 'Give a friendly creature +0/+4.', effect: 'buff', target: 'friendly' },
  { id: 'rain',    name: 'Ember Rain',    cost: 6, type: 'spell', art: '☄️', text: 'Deal 3 damage to all enemy creatures and the enemy hero.', effect: 'rain', target: 'none' },
];

export function cardById(id) { return CARDS.find((c) => c.id === id); }

// Deterministic RNG (mulberry32) so ?seed= replays the same shuffle.
export function rngFromSeed(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffledDeck(rng) {
  const ids = CARDS.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

let uidCounter = 1;
export function makeInstance(defId) {
  const def = cardById(defId);
  return { uid: uidCounter++, defId, atk: def.atk ?? 0, hp: def.hp ?? 0, maxHp: def.hp ?? 0, canAttack: false };
}
