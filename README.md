# 🕹️ Neon Arcade — 5-Game Retro Platform

A neon-styled arcade game platform built with **Next.js 16 + TypeScript + Tailwind CSS + zustand + framer-motion**. Zero audio files, zero image assets for game logic — everything (music, SFX, visuals) is generated procedurally in code.

## 🎮 Games Included

| Game | Highlights |
|------|-----------|
| **Memory Match** | 3D card flip (CSS `transform-style: preserve-3d`), chime + float-fade on match, shake-and-flip-back on miss, combo horn at 3+, layered bg music, confetti + star rating on completion |
| **Fruit Catcher** | Canvas-rendered falling fruit, bombs cost lives, escalating spawn rate |
| **Simon Says** | Tonal sequence playback with per-pad colors + sounds, progressive speed-up |
| **2048** | Smooth slide/merge animations, undo, Hard mode adds 🧱 blocker tiles |
| **Whack-a-Mole** | Multiple simultaneous moles, Volcano difficulty = whole-board hits |

## ✨ Platform Features

- **XP / Level system** — exponential curve, persisted to `localStorage` via zustand
- **Coins + Shop** — 8 items incl. 4 unlockable card-back themes (Aurora, Golden Dragon…)
- **12 Achievements** — auto-unlock with toast + coin rewards (e.g. "Full Circuit" for playing all 5)
- **Dashboard** — per-game high scores, games played, level progress
- **Blog** — 5 built-in posts (strategy guides, dev notes)
- **Audio engine** — pure Web Audio API: 4-layer 16-step sequencer (bass/arp/pad/drums, 112 BPM, A-minor) with `menu / game / streak / victory` modes + ~20 synthesized SFX
- **Confetti** — burst / rain / celebration modes
- **Responsive** — mobile bottom nav, works from 390px up

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run the dev server
npm run dev

# 3. Open http://localhost:3000
```

Click **INSERT COIN** on the hub screen to enter the arcade.

> Audio only starts after the first user interaction (browser autoplay policy).

## 🗂️ Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout + Toaster
│   ├── page.tsx            # Mounts <ArcadeApp />
│   └── globals.css         # Tailwind + neon keyframe animations
├── components/arcade/
│   ├── arcade-app.tsx      # Router shell + settings drawer + mobile nav
│   ├── game-shell.tsx      # Difficulty selector wrapper
│   ├── hub-view.tsx        # Game picker cards
│   ├── dashboard-view.tsx  # Stats / level / achievements
│   ├── shop-view.tsx       # Theme & item shop
│   ├── blog-view.tsx       # Blog reader
│   ├── shared.tsx          # Stars / ResultModal / Tilt3D / FloatText …
│   └── games/
│       ├── memory-match.tsx
│       ├── fruit-catcher.tsx
│       ├── simon-says.tsx
│       ├── game-2048.tsx
│       └── whack-a-mole.tsx
└── lib/arcade/
    ├── data.ts             # Metadata, difficulties, themes, achievements, shop, posts
    ├── audio.ts            # Web Audio engine (music sequencer + SFX)
    ├── confetti.ts         # Canvas confetti system
    └── store.ts            # zustand store (XP, coins, unlocks, high scores)
```

## 🛠️ Tech Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS 4 · shadcn/ui components
- zustand (with `persist` middleware)
- framer-motion · sonner (toasts)
- Web Audio API (procedural audio — no audio files)
- Canvas 2D (Fruit Catcher, confetti)

## 📝 Notes

- Progress (XP, coins, unlocks, high scores) is stored in `localStorage` under a namespaced key — clear browser storage to reset.
- All card-back themes, game visuals and UI are CSS/emoji/canvas based; no external image hosting required.
- Lint passes with zero errors: `npm run lint`.
