'use client';

// ─── Neon Arcade · GameShell ─────────────────────────────────────────────────
// Shared frame for every game: back button, title, difficulty tabs, best score.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy } from 'lucide-react';
import { DIFFICULTY_META, gameById, type Difficulty, type GameId } from '@/lib/arcade/data';
import { useArcade } from '@/lib/arcade/store';
import { audio } from '@/lib/arcade/audio';
import { cn } from '@/lib/utils';

export function GameShell({
  gameId, onExit, children, scoreLabel = 'Best score', scoreSuffix = '', initialDifficulty,
}: {
  gameId: GameId;
  onExit: () => void;
  children: (difficulty: Difficulty) => ReactNode;
  scoreLabel?: string;
  scoreSuffix?: string;
  initialDifficulty?: Difficulty;
}) {
  const meta = gameById(gameId);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty ?? 'normal');
  const recordGame = useArcade((s) => s.recordGame);
  const best = useArcade((s) => s.highScores[`${gameId}:${difficulty}`]);
  const bestStars = useArcade((s) => s.bestStars[`${gameId}:${difficulty}`]);
  const reduceMotion = useArcade((s) => s.settings.reduceMotion);
  const recorded = useRef(false);

  useEffect(() => {
    if (!recorded.current) {
      recorded.current = true;
      recordGame(gameId);
    }
    audio.setProfile('game');
    return () => {
      audio.setProfile('menu');
    };
     
  }, [gameId]);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24 pt-6 md:pt-8">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <button
          onClick={() => { audio.click(); onExit(); }}
          className="glass rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 transition flex items-center gap-2"
          aria-label="Back to arcade hub"
        >
          <ArrowLeft className="w-4 h-4" /> Hub
        </button>

        <div className="glass rounded-xl px-4 py-2 flex items-center gap-2 text-sm">
          <Trophy className="w-4 h-4 text-amber-300" aria-hidden />
          <span className="text-white/55">{scoreLabel}</span>
          <span className="font-black text-amber-300 neon-text-soft">
            {best !== undefined ? `${best}${scoreSuffix}` : '—'}
          </span>
          {bestStars ? <span className="text-xs" aria-label={`${bestStars} stars`}>{'⭐'.repeat(bestStars)}</span> : null}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.4 }}
        className="text-center mb-6"
      >
        <div className="text-5xl mb-2 anim-float-y inline-block" aria-hidden>{meta.emoji}</div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
          <span className="neon-text" style={{ color: meta.accent }}>{meta.name}</span>
        </h1>
        <p className="text-white/55 text-sm mt-1">{meta.tagline}</p>
      </motion.div>

      {/* difficulty tabs */}
      <div className="flex justify-center mb-7" role="tablist" aria-label="Difficulty">
        <div className="glass rounded-2xl p-1.5 flex gap-1">
          {(Object.keys(meta.difficulties) as Difficulty[]).map((d) => {
            const active = d === difficulty;
            const info = meta.difficulties[d];
            const dcolor = d === 'easy' ? '#34d399' : d === 'normal' ? '#fbbf24' : '#fb7185';
            return (
              <button
                key={d}
                role="tab"
                aria-selected={active}
                onClick={() => { audio.click(); setDifficulty(d); }}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-bold transition-all min-h-[44px]',
                  active ? 'text-[#16041f]' : 'text-white/60 hover:text-white'
                )}
                style={active ? { background: `linear-gradient(135deg, ${dcolor}, ${dcolor}aa)`, boxShadow: `0 0 18px ${dcolor}44` } : undefined}
                title={info.detail}
              >
                <span className="hidden sm:inline">{DIFFICULTY_META[d].label} · </span>{info.label}
              </button>
            );
          })}
        </div>
      </div>

      <div key={difficulty}>{children(difficulty)}</div>
    </div>
  );
}
