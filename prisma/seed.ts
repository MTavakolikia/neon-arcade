// ─── Neon Arcade · Database seed ──────────────────────────────────────────────
// Idempotent: safe to re-run. Creates the three staff/player accounts, the card
// themes, shop catalogue, achievements and the starter blog posts.
//
// Demo credentials (override with SEED_ADMIN_PASSWORD / SEED_EDITOR_PASSWORD /
// SEED_PLAYER_PASSWORD before running in any real environment).

import { PrismaClient, type Prisma, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

const DEMO_PASSWORD = 'neonarcade';

async function upsertUser(
  email: string,
  name: string,
  role: Role,
  callsign: string | null,
  overrides: Partial<Prisma.UserCreateInput> = {},
) {
  const passwordHash = await bcrypt.hash(
    process.env[`SEED_${role}_PASSWORD`] ?? DEMO_PASSWORD,
    10,
  );
  return db.user.upsert({
    where: { email },
    update: { name, role, callsign, status: 'ACTIVE', passwordHash },
    create: { email, name, role, callsign, passwordHash, coins: 120, ...overrides },
  });
}

// ─── Card themes ──────────────────────────────────────────────────────────────

const CARD_THEMES = [
  {
    id: 'neon-grid',
    name: 'Neon Grid',
    emoji: '🟪',
    price: 0,
    sortOrder: 0,
    glow: 'rgba(232,121,249,0.55)',
    css: 'linear-gradient(135deg,#3b0764 0%,#831843 100%)',
  },
  {
    id: 'aurora',
    name: 'Aurora Veil',
    emoji: '🌌',
    price: 150,
    sortOrder: 1,
    glow: 'rgba(52,211,153,0.55)',
    css: 'linear-gradient(135deg,#064e3b 0%,#134e4a 55%,#7c2d12 120%)',
  },
  {
    id: 'pixel',
    name: 'Pixel Pals',
    emoji: '👾',
    price: 250,
    sortOrder: 2,
    glow: 'rgba(34,211,238,0.55)',
    css: 'repeating-conic-gradient(#164e63 0% 25%, #083344 0% 50%) 0 0/28px 28px',
  },
  {
    id: 'dragon',
    name: 'Golden Dragon',
    emoji: '🐲',
    price: 400,
    sortOrder: 3,
    glow: 'rgba(251,191,36,0.6)',
    css: 'radial-gradient(circle at 30% 20%, #92400e 0%, #451a03 70%)',
  },
];

// ─── Shop catalogue ───────────────────────────────────────────────────────────

const PRODUCTS = [
  {
    id: 'theme-aurora',
    name: 'Aurora Veil Theme',
    description:
      'Northern-lights card backs for Memory Match. Unlocks and equips the moment you buy it.',
    emoji: '🌌',
    type: 'DIGITAL' as const,
    priceCents: 0,
    coinPrice: 150,
    themeId: 'aurora',
    tag: 'Theme',
    sortOrder: 1,
  },
  {
    id: 'theme-pixel',
    name: 'Pixel Pals Theme',
    description: 'Retro checkered card backs straight out of a 1989 cabinet.',
    emoji: '👾',
    type: 'DIGITAL' as const,
    priceCents: 0,
    coinPrice: 250,
    themeId: 'pixel',
    tag: 'Theme',
    sortOrder: 2,
  },
  {
    id: 'theme-dragon',
    name: 'Golden Dragon Theme',
    description: 'The rarest card back in the arcade. Feels heavy. Looks expensive.',
    emoji: '🐲',
    type: 'DIGITAL' as const,
    priceCents: 0,
    coinPrice: 400,
    themeId: 'dragon',
    tag: 'Rare',
    sortOrder: 3,
  },
  {
    id: 'coin-pack-s',
    name: 'Pouch of Coins',
    description: 'A free top-up of 200 coins when the shop tempts you and the balance is shy.',
    emoji: '🪙',
    type: 'DIGITAL' as const,
    priceCents: 0,
    coinPrice: 0,
    coinGrant: 200,
    tag: 'Top-up',
    sortOrder: 4,
  },
  {
    id: 'poster-neon',
    name: 'Neon Arcade Poster',
    description: 'A2 glow-in-the-dark print of the arcade hub art. Ships rolled in a matte tube.',
    emoji: '🖼️',
    type: 'PHYSICAL' as const,
    priceCents: 1900,
    shippingCents: 600,
    stock: 120,
    tag: 'Merch',
    sortOrder: 10,
  },
  {
    id: 'mug-neon',
    name: 'Press-Start Mug',
    description: '360ml ceramic mug. Glowing rim art, dishwasher-arguing approved.',
    emoji: '☕',
    type: 'PHYSICAL' as const,
    priceCents: 1400,
    shippingCents: 600,
    stock: 200,
    tag: 'Merch',
    sortOrder: 11,
  },
  {
    id: 'led-strip',
    name: 'Cabinet LED Strip',
    description: '2m USB addressable strip, preloaded with the Neon Arcade light show.',
    emoji: '💡',
    type: 'PHYSICAL' as const,
    priceCents: 2900,
    shippingCents: 0,
    stock: 75,
    tag: 'Merch',
    sortOrder: 12,
  },
  {
    id: 'plush-mole',
    name: 'Mole Plush (Guilty)',
    description: '25cm plush mole. Whacking it back earns no points but immense peace.',
    emoji: '🧸',
    type: 'PHYSICAL' as const,
    priceCents: 2400,
    shippingCents: 600,
    stock: 40,
    tag: 'Limited',
    sortOrder: 13,
  },
];

// ─── Achievements ─────────────────────────────────────────────────────────────

const ACHIEVEMENTS = [
  ['first-win', 'First Blood', 'Win your first round of any game', '🥇', 20],
  ['memory-3star', 'Photographic', 'Earn 3 stars in Memory Match', '🧠', 40],
  ['memory-streak5', 'Chain Reactor', 'Hit a 5x match streak', '⚡', 30],
  ['simon-8', 'Perfect Echo', 'Reach level 8 in Simon Says', '🎶', 40],
  ['fruit-40combo', 'Juice Lord', 'Catch 40 fruits in one run', '🍓', 40],
  ['g2048', 'The 2048 Club', 'Merge your way to the 2048 tile', '🏅', 100],
  ['mole-15streak', 'Mole Marshal', 'Whack 15 moles in a row', '🔨', 40],
  ['shopper', 'Big Spender', 'Buy anything from the shop', '🛍️', 25],
  ['level-5', 'Arcade Regular', 'Reach player level 5', '🕹️', 60],
  ['level-10', 'Neon Legend', 'Reach player level 10', '👑', 150],
  ['all-games', 'Full Circuit', 'Play every game at least once', '🎡', 80],
  ['hard-winner', 'Hard Mode Hero', 'Win any game on Hard difficulty', '🔥', 70],
] as const;

// ─── Blog ─────────────────────────────────────────────────────────────────────
// Bodies are stored as markdown; the reader splits on blank lines.

const POSTS = [
  {
    slug: 'memory-palace',
    title: 'The Memory Palace Technique, Tuned for Card Games',
    excerpt:
      'Ancient Greek orators memorized speeches by rooms of a house. Here is how to point that same machinery at a 6×4 grid of emoji.',
    emoji: '🧠',
    accent: '#e879f9',
    tags: ['Strategy', 'Memory Match'],
    readMin: 6,
    featured: true,
    publishedAt: new Date('2026-08-14'),
    body: [
      'Two thousand years ago, the poet Simonides of Ceos allegedly walked out of a collapsed banquet hall and reconstructed the identity of every guest by remembering where each had been sitting. That trick — anchoring information to physical locations — became known as the method of loci, or the memory palace, and it remains the single most effective memorization framework ever studied by cognitive science. The reason is simple: human spatial memory evolved long before symbolic memory, and your brain stores places with almost no effort at all. When you attach an abstract item, like a card, to a location, you are borrowing an ancient, high-bandwidth system to do modern work.',
      'Memory Match is a pure spatial game. Every card lives at a coordinate, which means every card is already halfway into your palace. The mistake most players make is treating each reveal as an isolated event — "there was a shark somewhere top-left" — instead of binding the card to its coordinate deliberately. When you flip a card, spend a fraction of a second verbalizing the full address: "shark, second row, third column." The spoken (or sub-vocalized) tag creates a second memory trace in your auditory loop, and the coordinate creates a third in your spatial system. Three weak traces are dramatically more durable than one.',
      'The second technique is chunking by narrative. On the hard 6×4 board you will eventually hold twelve pairs in mind. Rather than storing twelve disconnected facts, link consecutive discoveries into a silly story: the shark in row two is afraid of the pizza in row one, and both are hiding from the rocket. Absurd, emotionally charged narratives survive short-term memory pressure far better than raw data, because absurdity is itself a retrieval cue. Competitive memory athletes use exactly this machinery to memorize decks of cards in under a minute.',
      'Finally, manage your scanning pattern. Random flipping feels active but wastes the two most valuable pieces of information the board gives you: adjacency and overlap. Sweep the board in consistent rows during the opening so every card gets a clean coordinate tag, then prioritize flipping cards that intersect the most known pairs. If you know where nine of the twelve pairs live, the board is already solved — stop exploring and start executing. Precision, not speed, is what turns three stars.',
    ],
  },
  {
    slug: '2048-math',
    title: 'The Quiet Mathematics of 2048',
    excerpt:
      'Why the corner strategy works, what the snake pattern really is, and why your worst enemy is a number with a plus sign.',
    emoji: '🔢',
    accent: '#22d3ee',
    tags: ['Strategy', '2048'],
    readMin: 7,
    featured: false,
    publishedAt: new Date('2026-08-28'),
    body: [
      'Every tile in 2048 is a power of two, and that single fact shapes the entire game. Merging two tiles of value v produces 2v, which means your progress is exponential, not linear: the road from 512 to 1024 takes roughly as much work as everything you did before it. This is why games feel like they collapse at the end — the board is the same size, but each doubling demands twice the raw material. The winning insight is that you cannot beat exponential pressure with reactive play; you need structure, and structure in 2048 means geometry.',
      'The famous corner strategy is really a monotonicity constraint. Pick one corner and forbid yourself from ever moving your largest tile out of it. The row and column leading to that corner should hold tiles in strictly decreasing order — a "snake" that folds back through the board. When the chain is monotonic, every swipe toward the corner is productive: tiles compact toward the anchor, and merges happen in sequence like dominoes. Break the chain, and a small tile strands between two large ones, which is precisely how dead boards are born.',
      'Spawn randomness is the other half of the equation. New tiles appear uniformly on empty cells as either a 2 (90%) or a 4 (10%), and each swipe that fails to move anything does not consume a spawn. Good players therefore play the probabilities: they prefer moves that create the largest number of empty cells, because emptiness is optionality. A board with six open squares can absorb a bad spawn; a board with one cannot. When you feel cornered, the practical fix is to merge the smallest tiles first — small merges cascade upward and typically reopen two or three cells at once.',
      'There is one final, counter-intuitive rule: avoid chasing merges. A move that merges two tiles but scrambles your snake is almost always a net loss, because structure takes many moves to rebuild and a merge takes one. Think of the snake pattern as capital and merges as interest. Spend interest, keep the capital, and 2048 stops being a lucky outcome and becomes an invoice you methodically collect.',
    ],
  },
  {
    slug: 'procedural-audio',
    title: 'How the Arcade Writes Its Own Music',
    excerpt:
      'No audio files ship with this arcade. Every chime, thud and bassline is synthesized live in your browser — here is how.',
    emoji: '🎚️',
    accent: '#fbbf24',
    tags: ['Deep Dive', 'Audio'],
    readMin: 8,
    featured: false,
    publishedAt: new Date('2026-09-05'),
    body: [
      'Traditional web games ship megabytes of MP3 files and cross their fingers about looping gaps. This arcade does none of that. It uses the Web Audio API as a tiny modular synth studio: oscillators generate raw waves, filters shape their tone, envelopes decide how notes attack and decay, and a scheduler stitches everything into music. Because sound is computed on the fly, the entire soundtrack costs zero download bytes, never loops awkwardly, and can react to gameplay in real time — the background literally brightens when your streak climbs.',
      'The layered background music runs on a sixteen-step sequencer. A lookahead scheduler wakes up every 25 milliseconds and schedules any notes that fall within the next tenth of a second using the audio hardware clock, which never drifts the way JavaScript timers do. Four layers stack on top of that grid: a sub-bass following an A-minor progression, a sixteenth-note arpeggio through a resonant low-pass filter, a slowly breathing detuned pad, and noise-based hi-hats with a synthesized kick. Each layer owns its own gain node, so "streak mode" is just an automation curve that fades the filter open and pulls the arpeggio forward.',
      'Sound effects follow one design rule: pitch communicates meaning. A correct match plays a bell-like FM chime whose root note rises with your streak, so you can hear your combo climbing without reading the HUD. A miss is a descending minor second with a wobble — instantly recognizably "wrong" to human ears trained by centuries of harmony. Simon Says is the purest example: its four pads are tuned to a major arpeggio, which is why the game is pleasant to fail at; even your mistakes form chords.',
      'The perceptual trick that ties it together is masking discipline. Loud sounds hide quiet ones if they share frequencies, so every effect is allocated its own register: chimes live high, thuds live low, and the music ducks a few decibels during fanfares. Good game audio is less about clever synthesis and more about negotiated space — an orchestra where every instrument signed a roommate agreement.',
    ],
  },
  {
    slug: 'reflex-science',
    title: 'Reflexes Are Trainable: What Fruit Catcher and Whack-a-Mole Actually Measure',
    excerpt:
      'Simple reaction time, choice reaction time, and anticipation — three different skills hiding inside two cute arcade games.',
    emoji: '⚡',
    accent: '#34d399',
    tags: ['Science', 'Fruit Catcher', 'Whack-a-Mole'],
    readMin: 6,
    featured: false,
    publishedAt: new Date('2026-09-18'),
    body: [
      'Psychologists split reaction time into two flavors. Simple reaction time is one stimulus, one response — a light appears, you press a button; humans average around 250 milliseconds. Choice reaction time adds decisions: which of four moles, which of three falling objects. By Hick\'s law, every extra option adds measurable delay, roughly a logarithmic function of the number of choices. This is why Whack-a-Mole on Volcano difficulty feels categorically harder than the Garden: you have not just sped up the clock, you have multiplied the decisions per second.',
      'But raw reaction speed is the smallest part of arcade performance. The larger share belongs to anticipation — the learned ability to predict where a stimulus will be before it arrives. Watch a strong Fruit Catcher player and you will notice the basket moving before the fruit is halfway down the screen. They are not reacting faster; they are solving a physics problem early, using spawn position and fall rate to commit to a trajectory. Anticipation is pattern exposure plus attention, and it improves with every run even when your "pure" reaction time never changes.',
      'There is also a motor component researchers call Fitts\'s law: the time to hit a target grows with distance and shrinks with target size. This is why the tiny Storm-mode basket is so punishing — the same hand movement now must terminate with more precision, and error rates rise even for identical decisions. Games that shrink hitboxes are secretly raising difficulty in a way that has nothing to do with reflexes, which is exactly why it feels fair: you can see the small basket and adapt your movements deliberately.',
      'The practical takeaway is optimistic. Choice reaction training transfers weakly between contexts, but anticipation transfers strongly within a game. If you want a higher Fruit Catcher score, do not chase speed — chase predictability: fix your eyes on the spawn line, read trajectories in pairs, and let your hands learn the basket\'s acceleration. Reflexes are rented; anticipation is owned.',
    ],
  },
  {
    slug: 'neon-history',
    title: 'A Brief History of the Neon Arcade Aesthetic',
    excerpt:
      'From 1978 Space Invaders cabinets to synthwave album covers — why glowing purple became the color of games.',
    emoji: '🌆',
    accent: '#fb7185',
    tags: ['Culture'],
    readMin: 5,
    featured: false,
    publishedAt: new Date('2026-09-24'),
    body: [
      'The neon arcade look was born from limitation, not style. Early cathode-ray tube monitors rendered glowing phosphor against black because that is simply what CRTs did — darkness was the cheapest possible background, and bright primaries were the most legible foreground. Space Invaders in 1978 used colored cellophane strips over a monochrome screen to fake multicolor bands. The result was an aesthetic of pure light: no textures, no shadows, just saturated geometry floating in the void. Players did not see a technical compromise; they saw the future.',
      'As arcade hardware matured, the palette grew but the grammar stayed. Pac-Man\'s 1980 maze made darkness a character — the ghosts were visible threats because the field around them was black. Vector games like Tempest and Battlezone drew entire worlds in glowing lines, and the image of a dark room carved by neon light seeped into how a generation imagined technology. When home consoles arrived with weaker graphics, magazines compensated with cover art that exaggerated the arcade look: chrome logos, airbrushed glows, purple-and-cyan sunsets over wireframe grids.',
      'The 2010s closed the loop. Synthwave musicians and the game genre named after the neon-noir film Drive resurrected the 80s palette deliberately, and modern indie games adopted it because it communicates instantly: glow means digital, glow means play. What began as a phosphor constraint is now a semantic code — you can put neon gridlines on a poster with no other context and a stranger will guess "video games" within a second.',
      'This arcade wears the aesthetic with the same dual loyalty: part homage, part ergonomics. High-contrast accents on near-black backgrounds are genuinely readable in a glance, motion glows draw the eye to interactive elements, and the party atmosphere lowers the stakes of failure. The neon look was never really about nostalgia. It is about making light itself feel like feedback — and feedback is what games are made of.',
    ],
  },
];

// ─── Run ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('▸ Seeding Neon Arcade…');

  const admin = await upsertUser('admin@neonarcade.dev', 'Arcade Owner', 'ADMIN', 'OWNER');
  const editor = await upsertUser('editor@neonarcade.dev', 'Content Editor', 'EDITOR', 'WRITER');
  const player = await upsertUser('player@neonarcade.dev', 'Test Player', 'PLAYER', 'GUEST');

  console.log(`  users      → ${admin.email}, ${editor.email}, ${player.email}`);

  for (const theme of CARD_THEMES) {
    await db.cardTheme.upsert({
      where: { id: theme.id },
      update: { name: theme.name, emoji: theme.emoji, css: theme.css, glow: theme.glow, price: theme.price, sortOrder: theme.sortOrder, active: true },
      create: theme,
    });
  }
  console.log(`  themes     → ${CARD_THEMES.length}`);

  for (const product of PRODUCTS) {
    await db.product.upsert({
      where: { id: product.id },
      update: product,
      create: { status: 'ACTIVE', ...product },
    });
  }
  console.log(`  products   → ${PRODUCTS.length}`);

  for (const [index, [id, name, description, emoji, coinsReward]] of ACHIEVEMENTS.entries()) {
    await db.achievement.upsert({
      where: { id },
      update: { name, description, emoji, coinsReward, sortOrder: index, active: true },
      create: { id, name, description, emoji, coinsReward, sortOrder: index },
    });
  }
  console.log(`  achievements → ${ACHIEVEMENTS.length}`);

  for (const post of POSTS) {
    const { body, publishedAt, ...meta } = post;
    await db.post.upsert({
      where: { slug: meta.slug },
      update: { ...meta, body: body.join('\n\n'), tags: JSON.stringify(meta.tags), authorId: admin.id, publishedAt },
      create: {
        ...meta,
        body: body.join('\n\n'),
        tags: JSON.stringify(meta.tags),
        status: 'PUBLISHED',
        authorId: admin.id,
        publishedAt,
      },
    });
  }
  console.log(`  posts      → ${POSTS.length}`);

  console.log('\n✅ Seed complete.\n');
  console.log('   Demo logins (password: %s)', DEMO_PASSWORD);
  console.log('   admin@neonarcade.dev   → ADMIN  (full access)');
  console.log('   editor@neonarcade.dev  → EDITOR (blog + shop)');
  console.log('   player@neonarcade.dev  → PLAYER (no admin access)\n');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
