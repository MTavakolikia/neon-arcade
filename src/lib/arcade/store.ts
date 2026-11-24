// ─── Neon Arcade · Global store (zustand + localStorage persistence) ────────

'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ACHIEVEMENTS, GAMES, type Difficulty, type GameId } from './data';
import { audio } from './audio';

// Level curve: level n requires 120 * n * (n+1) / 2 cumulative XP
export function levelFor(xp: number): number {
  let lvl = 1;
  while (xp >= 120 * (lvl * (lvl + 1)) / 2) lvl++;
  return lvl;
}
export function levelProgress(xp: number): { level: number; into: number; need: number; pct: number } {
  const level = levelFor(xp);
  const prevSum = 120 * ((level - 1) * level) / 2;
  const nextSum = 120 * (level * (level + 1)) / 2;
  const into = xp - prevSum;
  const need = nextSum - prevSum;
  return { level, into, need, pct: Math.min(100, (into / need) * 100) };
}

export const RANK_TITLES = [
  'Rookie', 'Button Masher', 'Coin Collector', 'Combo Seeker', 'Arcade Regular',
  'High Roller', 'Neon Ace', 'Grid Master', 'Reflex Legend', 'Arcade Legend',
];
export const rankFor = (level: number) => RANK_TITLES[Math.min(RANK_TITLES.length - 1, Math.floor((level - 1) / 2))];

export interface XpEvent { date: string; xp: number }

interface ArcadeState {
  hydrated: boolean;
  xp: number;
  coins: number;
  gamesPlayed: number;
  wins: number;
  bestStreak: number;
  playedGames: GameId[];
  highScores: Record<string, number>;        // `${game}:${diff}` → best score
  bestStars: Record<string, number>;         // `${game}:${diff}` → 1..3
  achievements: string[];
  unlockedThemes: string[];
  equippedTheme: string;
  purchasedItems: string[];
  cart: string[];
  xpLog: XpEvent[];                          // last 14 days
  settings: {
    musicOn: boolean;
    sfxOn: boolean;
    hapticsOn: boolean;
    reduceMotion: boolean;
    volume: number;
  };
}

interface ArcadeActions {
  setHydrated: () => void;
  addXp: (amount: number) => { leveledUp: boolean; level: number };
  addCoins: (amount: number) => void;
  recordGame: (game: GameId) => void;
  recordResult: (o: {
    game: GameId; difficulty: Difficulty; score: number; won: boolean;
    stars?: number; streak?: number; xp: number; coins: number;
  }) => { leveledUp: boolean; level: number };
  unlockAchievement: (id: string) => void;
  buyProduct: (id: string, costCoins: number, themeId?: string) => boolean;
  toggleCart: (id: string) => void;
  clearCart: () => void;
  equipTheme: (id: string) => void;
  updateSettings: (patch: Partial<ArcadeState['settings']>) => void;
  resetProgress: () => void;
}

type Store = ArcadeState & ArcadeActions;

const initial: ArcadeState = {
  hydrated: false,
  xp: 0,
  coins: 120,
  gamesPlayed: 0,
  wins: 0,
  bestStreak: 0,
  playedGames: [],
  highScores: {},
  bestStars: {},
  achievements: [],
  unlockedThemes: ['neon-grid'],
  equippedTheme: 'neon-grid',
  purchasedItems: [],
  cart: [],
  xpLog: [],
  settings: { musicOn: true, sfxOn: true, hapticsOn: true, reduceMotion: false, volume: 0.8 },
};

const todayKey = () => new Date().toISOString().slice(0, 10);

export const useArcade = create<Store>()(
  persist(
    (set, get) => ({
      ...initial,

      setHydrated: () => set({ hydrated: true }),

      addXp: (amount) => {
        const before = levelFor(get().xp);
        const xp = get().xp + amount;
        const after = levelFor(xp);
        const date = todayKey();
        set((s) => {
          const log = [...s.xpLog];
          const today = log.find((e) => e.date === date);
          if (today) today.xp += amount;
          else log.push({ date, xp: amount });
          return { xp, xpLog: log.slice(-30) };
        });
        if (after > before) {
          audio.levelUp();
          const bonus = after * 15;
          set((s) => ({ coins: s.coins + bonus }));
          if (after >= 5) get().unlockAchievement('level-5');
          if (after >= 10) get().unlockAchievement('level-10');
          return { leveledUp: true, level: after };
        }
        return { leveledUp: false, level: after };
      },

      addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),

      recordGame: (game) => {
        const played = get().playedGames;
        set((s) => ({
          gamesPlayed: s.gamesPlayed + 1,
          playedGames: played.includes(game) ? played : [...played, game],
        }));
        if (get().playedGames.length >= GAMES.length) get().unlockAchievement('all-games');
      },

      recordResult: ({ game, difficulty, score, won, stars, streak, xp, coins }) => {
        const s = get();
        const key = `${game}:${difficulty}`;
        const highScores = { ...s.highScores };
        if (!highScores[key] || score > highScores[key]) highScores[key] = score;
        const bestStars = { ...s.bestStars };
        if (stars && (!bestStars[key] || stars > bestStars[key])) bestStars[key] = stars;

        set({
          highScores,
          bestStars,
          wins: won ? s.wins + 1 : s.wins,
          bestStreak: streak ? Math.max(s.bestStreak, streak) : s.bestStreak,
        });

        const res = get().addXp(xp);
        if (coins > 0) get().addCoins(coins);

        if (won) {
          get().unlockAchievement('first-win');
          if (difficulty === 'hard') get().unlockAchievement('hard-winner');
        }
        if (stars === 3) get().unlockAchievement('memory-3star');
        if (streak && streak >= 5 && game === 'memory') get().unlockAchievement('memory-streak5');
        if (game === 'simon' && score >= 8) get().unlockAchievement('simon-8');
        if (game === 'fruit' && score >= 40) get().unlockAchievement('fruit-40combo');
        if (game === '2048' && score >= 2048) get().unlockAchievement('g2048');
        if (game === 'mole' && streak && streak >= 15) get().unlockAchievement('mole-15streak');
        if (levelFor(get().xp) >= 5) get().unlockAchievement('level-5');
        if (levelFor(get().xp) >= 10) get().unlockAchievement('level-10');
        return res;
      },

      unlockAchievement: (id) => {
        if (get().achievements.includes(id)) return;
        const def = ACHIEVEMENTS.find((a) => a.id === id);
        set((s) => ({
          achievements: [...s.achievements, id],
          coins: s.coins + (def?.reward ?? 0),
        }));
      },

      buyProduct: (id, costCoins, themeId) => {
        const s = get();
        if (s.purchasedItems.includes(id)) return false;
        if (s.coins < costCoins) return false;
        set((st) => ({
          coins: st.coins - costCoins,
          purchasedItems: [...st.purchasedItems, id],
          unlockedThemes: themeId ? [...new Set([...st.unlockedThemes, themeId])] : st.unlockedThemes,
          equippedTheme: themeId ?? st.equippedTheme,
        }));
        get().unlockAchievement('shopper');
        return true;
      },

      toggleCart: (id) => set((s) => ({
        cart: s.cart.includes(id) ? s.cart.filter((c) => c !== id) : [...s.cart, id],
      })),

      clearCart: () => set({ cart: [] }),

      equipTheme: (id) => {
        if (get().unlockedThemes.includes(id)) set({ equippedTheme: id });
      },

      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
        const st = get().settings;
        audio.setConfig({ musicOn: st.musicOn, sfxOn: st.sfxOn, hapticsOn: st.hapticsOn, volume: st.volume });
      },

      resetProgress: () => set({ ...initial, hydrated: true }),
    }),
    {
      name: 'neon-arcade-v1',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
        audio.setConfig({
          musicOn: state?.settings.musicOn ?? true,
          sfxOn: state?.settings.sfxOn ?? true,
          hapticsOn: state?.settings.hapticsOn ?? true,
          volume: state?.settings.volume ?? 0.8,
        });
      },
      partialize: (s) => ({
        xp: s.xp, coins: s.coins, gamesPlayed: s.gamesPlayed, wins: s.wins,
        bestStreak: s.bestStreak, playedGames: s.playedGames, highScores: s.highScores,
        bestStars: s.bestStars, achievements: s.achievements, unlockedThemes: s.unlockedThemes,
        equippedTheme: s.equippedTheme, purchasedItems: s.purchasedItems, cart: s.cart,
        xpLog: s.xpLog, settings: s.settings,
      }),
    }
  )
);

// Convenience: XP award tables per game result
export function memoryXp(difficulty: Difficulty, stars: number): number {
  const base = { easy: 30, normal: 60, hard: 100 }[difficulty];
  return Math.round(base * (0.6 + stars * 0.2));
}
