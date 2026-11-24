// ─── Neon Arcade · Data layer ────────────────────────────────────────────────
// Game metadata, difficulty tiers, blog articles, shop products, achievements.

export type GameId = 'memory' | 'fruit' | 'simon' | '2048' | 'mole';
export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_META: Record<Difficulty, { label: string; color: string }> = {
  easy: { label: 'Easy', color: 'emerald' },
  normal: { label: 'Normal', color: 'amber' },
  hard: { label: 'Hard', color: 'rose' },
};

export interface GameMeta {
  id: GameId;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  accent: string;          // hex for glow
  accentSoft: string;
  difficulties: Record<Difficulty, { label: string; detail: string }>;
  xpHint: string;
}

export const GAMES: GameMeta[] = [
  {
    id: 'memory',
    name: 'Memory Match',
    tagline: 'Flip. Remember. Ascend.',
    description:
      'A neon take on the classic pair-matching game. 3D card flips, escalating combo fanfares and a star rating that judges your precision. The board watches — do you?',
    emoji: '🃏',
    accent: '#e879f9',
    accentSoft: 'rgba(232,121,249,0.18)',
    xpHint: 'Up to 150 XP',
    difficulties: {
      easy: { label: '4×3', detail: '6 pairs · relaxed pace' },
      normal: { label: '4×4', detail: '8 pairs · balanced' },
      hard: { label: '6×4', detail: '12 pairs · true test' },
    },
  },
  {
    id: 'fruit',
    name: 'Fruit Catcher',
    tagline: 'Catch the harvest, dodge the boom.',
    description:
      'Fruits rain from the neon sky. Steer your basket, chain catches for a combo multiplier, and keep your eyes on the bombs. One splash and the streak is gone.',
    emoji: '🧺',
    accent: '#34d399',
    accentSoft: 'rgba(52,211,153,0.18)',
    xpHint: 'Up to 150 XP',
    difficulties: {
      easy: { label: 'Breezy', detail: 'Slow rain · wide basket' },
      normal: { label: 'Rush', detail: 'Faster rain · more bombs' },
      hard: { label: 'Storm', detail: 'Tropical storm · tiny basket' },
    },
  },
  {
    id: 'simon',
    name: 'Simon Says',
    tagline: 'The sequence grows. Can you?',
    description:
      'Four glowing pads, four rising tones. Watch the light show, then replay it perfectly. Every level adds a step — and the pads get impatient.',
    emoji: '🎵',
    accent: '#fbbf24',
    accentSoft: 'rgba(251,191,36,0.18)',
    xpHint: 'Up to 120 XP',
    difficulties: {
      easy: { label: 'Chill', detail: 'Slow tempo · reach level 8' },
      normal: { label: 'Classic', detail: 'Arcade tempo · reach level 12' },
      hard: { label: 'Maestro', detail: 'Fast & relentless · level 16' },
    },
  },
  {
    id: '2048',
    name: '2048',
    tagline: 'Slide, merge, transcend.',
    description:
      'The tile-sliding legend, reborn with silky-smooth merges and satisfying pops. Hard mode walls off part of the board — geometry becomes your enemy.',
    emoji: '🔢',
    accent: '#22d3ee',
    accentSoft: 'rgba(34,211,238,0.18)',
    xpHint: 'Up to 200 XP',
    difficulties: {
      easy: { label: '5×5', detail: 'Roomy board · reach 2048' },
      normal: { label: '4×4', detail: 'The classic · reach 2048' },
      hard: { label: 'Walled', detail: '4×4 + blockers · reach 2048' },
    },
  },
  {
    id: 'mole',
    name: 'Whack-a-Mole',
    tagline: 'Reflexes for rent. Whacks sold separately.',
    description:
      'Moles erupt from neon burrows — golden ones pay double, bombs punish greed. Windows shrink as the timer drains. How long can your streak breathe?',
    emoji: '🔨',
    accent: '#fb7185',
    accentSoft: 'rgba(251,113,133,0.18)',
    xpHint: 'Up to 140 XP',
    difficulties: {
      easy: { label: 'Garden', detail: '60s · sleepy moles' },
      normal: { label: 'Burrow', detail: '45s · frisky moles' },
      hard: { label: 'Volcano', detail: '35s · bomb party' },
    },
  },
];

export const gameById = (id: GameId) => GAMES.find((g) => g.id === id)!;

// ─── Card themes (unlockable in shop, used by Memory Match) ──────────────────

export interface CardTheme {
  id: string;
  name: string;
  css: string;             // css background for card back
  glow: string;
  price: number;           // 0 = free default
  emoji: string;
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: 'neon-grid',
    name: 'Neon Grid',
    price: 0,
    emoji: '🟪',
    glow: 'rgba(232,121,249,0.55)',
    css: 'linear-gradient(135deg,#3b0764 0%,#831843 100%)',
  },
  {
    id: 'aurora',
    name: 'Aurora Veil',
    price: 150,
    emoji: '🌌',
    glow: 'rgba(52,211,153,0.55)',
    css: 'linear-gradient(135deg,#064e3b 0%,#134e4a 55%,#7c2d12 120%)',
  },
  {
    id: 'pixel',
    name: 'Pixel Pals',
    price: 250,
    emoji: '👾',
    glow: 'rgba(34,211,238,0.55)',
    css: 'repeating-conic-gradient(#164e63 0% 25%, #083344 0% 50%) 0 0/28px 28px',
  },
  {
    id: 'dragon',
    name: 'Golden Dragon',
    price: 400,
    emoji: '🐲',
    glow: 'rgba(251,191,36,0.6)',
    css: 'radial-gradient(circle at 30% 20%, #92400e 0%, #451a03 70%)',
  },
];

export const themeById = (id: string) => CARD_THEMES.find((t) => t.id === id) ?? CARD_THEMES[0];

// ─── Achievements ─────────────────────────────────────────────────────────────

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  reward: number;          // bonus coins
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-win', name: 'First Blood', desc: 'Win your first round of any game', emoji: '🥇', reward: 20 },
  { id: 'memory-3star', name: 'Photographic', desc: 'Earn 3 stars in Memory Match', emoji: '🧠', reward: 40 },
  { id: 'memory-streak5', name: 'Chain Reactor', desc: 'Hit a 5x match streak', emoji: '⚡', reward: 30 },
  { id: 'simon-8', name: 'Perfect Echo', desc: 'Reach level 8 in Simon Says', emoji: '🎶', reward: 40 },
  { id: 'fruit-40combo', name: 'Juice Lord', desc: 'Catch 40 fruits in one run', emoji: '🍓', reward: 40 },
  { id: 'g2048', name: 'The 2048 Club', desc: 'Merge your way to the 2048 tile', emoji: '🏅', reward: 100 },
  { id: 'mole-15streak', name: 'Mole Marshal', desc: 'Whack 15 moles in a row', emoji: '🔨', reward: 40 },
  { id: 'shopper', name: 'Big Spender', desc: 'Buy anything from the shop', emoji: '🛍️', reward: 25 },
  { id: 'level-5', name: 'Arcade Regular', desc: 'Reach player level 5', emoji: '🕹️', reward: 60 },
  { id: 'level-10', name: 'Neon Legend', desc: 'Reach player level 10', emoji: '👑', reward: 150 },
  { id: 'all-games', name: 'Full Circuit', desc: 'Play every game at least once', emoji: '🎡', reward: 80 },
  { id: 'hard-winner', name: 'Hard Mode Hero', desc: 'Win any game on Hard difficulty', emoji: '🔥', reward: 70 },
];

// ─── Shop ─────────────────────────────────────────────────────────────────────

export interface ShopProduct {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  type: 'digital' | 'physical';
  price: number;           // coins for digital, simulated $ for physical
  priceLabel: string;
  themeId?: string;        // unlocks a card theme
  tag?: string;
}

export const PRODUCTS: ShopProduct[] = [
  {
    id: 'theme-aurora', name: 'Aurora Veil Theme', desc: 'Northern-lights card backs for Memory Match. Instantly unlocks and equips.', emoji: '🌌', type: 'digital', price: 150, priceLabel: '150 coins', themeId: 'aurora', tag: 'Theme',
  },
  {
    id: 'theme-pixel', name: 'Pixel Pals Theme', desc: 'Retro checkered card backs straight out of a 1989 cabinet.', emoji: '👾', type: 'digital', price: 250, priceLabel: '250 coins', themeId: 'pixel', tag: 'Theme',
  },
  {
    id: 'theme-dragon', name: 'Golden Dragon Theme', desc: 'The rarest card back in the arcade. Feels heavy. Looks expensive.', emoji: '🐲', type: 'digital', price: 400, priceLabel: '400 coins', themeId: 'dragon', tag: 'Rare',
  },
  {
    id: 'coin-pack-s', name: 'Pouch of Coins', desc: 'Top up 200 coins when the shop tempts you and the balance is shy.', emoji: '🪙', type: 'digital', price: 0, priceLabel: 'Free demo', tag: 'Top-up',
  },
  {
    id: 'poster-neon', name: 'Neon Arcade Poster', desc: 'A2 glow-in-the-dark print of the arcade hub art. Ships rolled in a matte tube.', emoji: '🖼️', type: 'physical', price: 19, priceLabel: '$19.00',
  },
  {
    id: 'mug-neon', name: 'Press-Start Mug', desc: '360ml ceramic mug. Glowing rim art, dishwasher-arguing approved.', emoji: '☕', type: 'physical', price: 14, priceLabel: '$14.00',
  },
  {
    id: 'led-strip', name: 'Cabinet LED Strip', desc: '2m USB addressable strip, preloaded with the Neon Arcade light show.', emoji: '💡', type: 'physical', price: 29, priceLabel: '$29.00',
  },
  {
    id: 'plush-mole', name: 'Mole Plush (Guilty)', desc: '25cm plush mole. Whacking it back earns no points but immense peace.', emoji: '🧸', type: 'physical', price: 24, priceLabel: '$24.00',
  },
];

// ─── Blog ─────────────────────────────────────────────────────────────────────

export interface BlogArticle {
  id: string;
  title: string;
  excerpt: string;
  tags: string[];
  readMin: number;
  date: string;
  emoji: string;
  accent: string;
  body: string[];
}

export const ARTICLES: BlogArticle[] = [
  {
    id: 'memory-palace',
    title: 'The Memory Palace Technique, Tuned for Card Games',
    excerpt: 'Ancient Greek orators memorized speeches by rooms of a house. Here is how to point that same machinery at a 6×4 grid of emoji.',
    tags: ['Strategy', 'Memory Match'],
    readMin: 6,
    date: '2026-08-14',
    emoji: '🧠',
    accent: '#e879f9',
    body: [
      'Two thousand years ago, the poet Simonides of Ceos allegedly walked out of a collapsed banquet hall and reconstructed the identity of every guest by remembering where each had been sitting. That trick — anchoring information to physical locations — became known as the method of loci, or the memory palace, and it remains the single most effective memorization framework ever studied by cognitive science. The reason is simple: human spatial memory evolved long before symbolic memory, and your brain stores places with almost no effort at all. When you attach an abstract item, like a card, to a location, you are borrowing an ancient, high-bandwidth system to do modern work.',
      'Memory Match is a pure spatial game. Every card lives at a coordinate, which means every card is already halfway into your palace. The mistake most players make is treating each reveal as an isolated event — "there was a shark somewhere top-left" — instead of binding the card to its coordinate deliberately. When you flip a card, spend a fraction of a second verbalizing the full address: "shark, second row, third column." The spoken (or sub-vocalized) tag creates a second memory trace in your auditory loop, and the coordinate creates a third in your spatial system. Three weak traces are dramatically more durable than one.',
      'The second technique is chunking by narrative. On the hard 6×4 board you will eventually hold twelve pairs in mind. Rather than storing twelve disconnected facts, link consecutive discoveries into a silly story: the shark in row two is afraid of the pizza in row one, and both are hiding from the rocket. Absurd, emotionally charged narratives survive short-term memory pressure far better than raw data, because absurdity is itself a retrieval cue. Competitive memory athletes use exactly this machinery to memorize decks of cards in under a minute.',
      'Finally, manage your scanning pattern. Random flipping feels active but wastes the two most valuable pieces of information the board gives you: adjacency and overlap. Sweep the board in consistent rows during the opening so every card gets a clean coordinate tag, then prioritize flipping cards that intersect the most known pairs. If you know where nine of the twelve pairs live, the board is already solved — stop exploring and start executing. Precision, not speed, is what turns three stars.',
    ],
  },
  {
    id: '2048-math',
    title: 'The Quiet Mathematics of 2048',
    excerpt: 'Why the corner strategy works, what the snake pattern really is, and why your worst enemy is a number with a plus sign.',
    tags: ['Strategy', '2048'],
    readMin: 7,
    date: '2026-08-28',
    emoji: '🔢',
    accent: '#22d3ee',
    body: [
      'Every tile in 2048 is a power of two, and that single fact shapes the entire game. Merging two tiles of value v produces 2v, which means your progress is exponential, not linear: the road from 512 to 1024 takes roughly as much work as everything you did before it. This is why games feel like they collapse at the end — the board is the same size, but each doubling demands twice the raw material. The winning insight is that you cannot beat exponential pressure with reactive play; you need structure, and structure in 2048 means geometry.',
      'The famous corner strategy is really a monotonicity constraint. Pick one corner and forbid yourself from ever moving your largest tile out of it. The row and column leading to that corner should hold tiles in strictly decreasing order — a "snake" that folds back through the board. When the chain is monotonic, every swipe toward the corner is productive: tiles compact toward the anchor, and merges happen in sequence like dominoes. Break the chain, and a small tile strands between two large ones, which is precisely how dead boards are born.',
      'Spawn randomness is the other half of the equation. New tiles appear uniformly on empty cells as either a 2 (90%) or a 4 (10%), and each swipe that fails to move anything does not consume a spawn. Good players therefore play the probabilities: they prefer moves that create the largest number of empty cells, because emptiness is optionality. A board with six open squares can absorb a bad spawn; a board with one cannot. When you feel cornered, the practical fix is to merge the smallest tiles first — small merges cascade upward and typically reopen two or three cells at once.',
      'There is one final, counter-intuitive rule: avoid chasing merges. A move that merges two tiles but scrambles your snake is almost always a net loss, because structure takes many moves to rebuild and a merge takes one. Think of the snake pattern as capital and merges as interest. Spend interest, keep the capital, and 2048 stops being a lucky outcome and becomes an invoice you methodically collect.',
    ],
  },
  {
    id: 'procedural-audio',
    title: 'How the Arcade Writes Its Own Music',
    excerpt: 'No audio files ship with this arcade. Every chime, thud and bassline is synthesized live in your browser — here is how.',
    tags: ['Deep Dive', 'Audio'],
    readMin: 8,
    date: '2026-09-05',
    emoji: '🎚️',
    accent: '#fbbf24',
    body: [
      'Traditional web games ship megabytes of MP3 files and cross their fingers about looping gaps. This arcade does none of that. It uses the Web Audio API as a tiny modular synth studio: oscillators generate raw waves, filters shape their tone, envelopes decide how notes attack and decay, and a scheduler stitches everything into music. Because sound is computed on the fly, the entire soundtrack costs zero download bytes, never loops awkwardly, and can react to gameplay in real time — the background literally brightens when your streak climbs.',
      'The layered background music runs on a sixteen-step sequencer. A lookahead scheduler — the pattern recommended in the classic "A Tale of Two Clocks" article — wakes up every 25 milliseconds and schedules any notes that fall within the next tenth of a second using the audio hardware clock, which never drifts the way JavaScript timers do. Four layers stack on top of that grid: a sub-bass following an A-minor progression, a sixteenth-note arpeggio through a resonant low-pass filter, a slowly breathing detuned pad, and noise-based hi-hats with a synthesized kick. Each layer owns its own gain node, so "streak mode" is just an automation curve that fades the filter open and pulls the arpeggio forward.',
      'Sound effects follow one design rule: pitch communicates meaning. A correct match plays a bell-like FM chime whose root note rises with your streak, so you can hear your combo climbing without reading the HUD. A miss is a descending minor second with a wobble — instantly recognizably "wrong" to human ears trained by centuries of harmony. Simon Says is the purest example: its four pads are tuned to a major arpeggio, which is why the game is pleasant to fail at; even your mistakes form chords.',
      'The perceptual trick that ties it together is masking discipline. Loud sounds hide quiet ones if they share frequencies, so every effect is allocated its own register: chimes live high, thuds live low, and the music ducks a few decibels during fanfares. Good game audio is less about clever synthesis and more about negotiated space — an orchestra where every instrument signed a roommate agreement.',
    ],
  },
  {
    id: 'reflex-science',
    title: 'Reflexes Are Trainable: What Fruit Catcher and Whack-a-Mole Actually Measure',
    excerpt: 'Simple reaction time, choice reaction time, and anticipation — three different skills hiding inside two cute arcade games.',
    tags: ['Science', 'Fruit Catcher', 'Whack-a-Mole'],
    readMin: 6,
    date: '2026-09-18',
    emoji: '⚡',
    accent: '#34d399',
    body: [
      'Psychologists split reaction time into two flavors. Simple reaction time is one stimulus, one response — a light appears, you press a button; humans average around 250 milliseconds. Choice reaction time adds decisions: which of four moles, which of three falling objects. By Hick\'s law, every extra option adds measurable delay, roughly a logarithmic function of the number of choices. This is why Whack-a-Mole on Volcano difficulty feels categorically harder than the Garden: you have not just sped up the clock, you have multiplied the decisions per second.',
      'But raw reaction speed is the smallest part of arcade performance. The larger share belongs to anticipation — the learned ability to predict where a stimulus will be before it arrives. Watch a strong Fruit Catcher player and you will notice the basket moving before the fruit is halfway down the screen. They are not reacting faster; they are solving a physics problem early, using spawn position and fall rate to commit to a trajectory. Anticipation is pattern exposure plus attention, and it improves with every run even when your "pure" reaction time never changes.',
      'There is also a motor component researchers call Fitts\'s law: the time to hit a target grows with distance and shrinks with target size. This is why the tiny Storm-mode basket is so punishing — the same hand movement now must terminate with more precision, and error rates rise even for identical decisions. Games that shrink hitboxes are secretly raising difficulty in a way that has nothing to do with reflexes, which is exactly why it feels fair: you can see the small basket and adapt your movements deliberately.',
      'The practical takeaway is optimistic. Choice reaction training transfers weakly between contexts, but anticipation transfers strongly within a game. If you want a higher Fruit Catcher score, do not chase speed — chase predictability: fix your eyes on the spawn line, read trajectories in pairs, and let your hands learn the basket\'s acceleration. Reflexes are rented; anticipation is owned.',
    ],
  },
  {
    id: 'neon-history',
    title: 'A Brief History of the Neon Arcade Aesthetic',
    excerpt: 'From 1978 Space Invaders cabinets to synthwave album covers — why glowing purple became the color of games.',
    tags: ['Culture'],
    readMin: 5,
    date: '2026-09-24',
    emoji: '🌆',
    accent: '#fb7185',
    body: [
      'The neon arcade look was born from limitation, not style. Early cathode-ray tube monitors rendered glowing phosphor against black because that is simply what CRTs did — darkness was the cheapest possible background, and bright primaries were the most legible foreground. Space Invaders in 1978 used colored cellophane strips over a monochrome screen to fake multicolor bands. The result was an aesthetic of pure light: no textures, no shadows, just saturated geometry floating in the void. Players did not see a technical compromise; they saw the future.',
      'As arcade hardware matured, the palette grew but the grammar stayed. Pac-Man\'s 1980 maze made darkness a character — the ghosts were visible threats because the field around them was black. Vector games like Tempest and Battlezone drew entire worlds in glowing lines, and the image of a dark room carved by neon light seeped into how a generation imagined technology. When home consoles arrived with weaker graphics, magazines compensated with cover art that exaggerated the arcade look: chrome logos, airbrushed glows, purple-and-cyan sunsets over wireframe grids.',
      'The 2010s closed the loop. Synthwave musicians and the game genre named after the neon-noir film Drive resurrected the 80s palette deliberately, and modern indie games adopted it because it communicates instantly: glow means digital, glow means play. What began as a phosphor constraint is now a semantic code — you can put neon gridlines on a poster with no other context and a stranger will guess "video games" within a second.',
      'This arcade wears the aesthetic with the same dual loyalty: part homage, part ergonomics. High-contrast accents on near-black backgrounds are genuinely readable in a glance, motion glows draw the eye to interactive elements, and the party atmosphere lowers the stakes of failure. The neon look was never really about nostalgia. It is about making light itself feel like feedback — and feedback is what games are made of.',
    ],
  },
];
