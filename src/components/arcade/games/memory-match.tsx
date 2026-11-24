'use client';

// ─── Neon Arcade · Memory Match ──────────────────────────────────────────────
// 3D card flips · chime + float-fade on match · shake-and-flip-back on miss ·
// streak fanfare · layered procedural BGM · confetti + star rating on completion.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Clock, Move, Zap } from 'lucide-react';
import type { Difficulty } from '@/lib/arcade/data';
import { themeById } from '@/lib/arcade/data';
import { useArcade } from '@/lib/arcade/store';
import { audio } from '@/lib/arcade/audio';
import { burst, celebration } from '@/lib/arcade/confetti';
import { FloatText, NeonButton, ResultModal, StatChip, useFloatText } from '@/components/arcade/shared';
import { cn } from '@/lib/utils';

const POOL = ['🚀', '🌙', '⭐', '🪐', '👾', '🎮', '🤖', '🎰', '🍄', '🔮', '🧿', '⚡', '💎', '🌈', '🦄', '🐙', '🍕', '🍩'];

const DIFF: Record<Difficulty, { cols: number; rows: number; base: number }> = {
  easy: { cols: 4, rows: 3, base: 40 },
  normal: { cols: 4, rows: 4, base: 80 },
  hard: { cols: 6, rows: 4, base: 130 },
};

type CardState = 'hidden' | 'flipped' | 'matched';
interface Card { id: number; emoji: string; state: CardState; pairId: number }

function buildDeck(pairs: number): Card[] {
  const picks = [...POOL].sort(() => Math.random() - 0.5).slice(0, pairs);
  const deck = [...picks, ...picks]
    .map((emoji, i) => ({ id: i, emoji, state: 'hidden' as CardState, pairId: 0 }));
  // assign pair ids
  const seen = new Map<string, number>();
  deck.forEach((c) => {
    if (!seen.has(c.emoji)) seen.set(c.emoji, seen.size);
    c.pairId = seen.get(c.emoji)!;
  });
  return deck.sort(() => Math.random() - 0.5).map((c, i) => ({ ...c, id: i }));
}

export function MemoryMatch({ difficulty, onExit }: { difficulty: Difficulty; onExit: () => void }) {
  const cfg = DIFF[difficulty];
  const pairs = (cfg.cols * cfg.rows) / 2;
  const par = Math.round(pairs * 1.6);

  const equipped = useArcade((s) => s.equippedTheme);
  const theme = themeById(equipped);
  const recordResult = useArcade((s) => s.recordResult);
  const reduceMotion = useArcade((s) => s.settings.reduceMotion);

  const [cards, setCards] = useState<Card[]>(() => buildDeck(pairs).map((c) => ({ ...c, state: 'flipped' as CardState })));
  const [selected, setSelected] = useState<number[]>([]);
  const [locked, setLocked] = useState(true);
  const [shakePair, setShakePair] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestRun, setBestRun] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<'preview' | 'playing' | 'won'>('preview');
  const [result, setResult] = useState<{ stars: number; xp: number; coins: number; score: number } | null>(null);
  const { items: floats, push: pushFloat } = useFloatText();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const bestRunRef = useRef(0);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  // preview flip on mount — cards start flipped, then hide after a beat.
  // (difficulty changes remount this component via GameShell's keyed wrapper)
  useEffect(() => {
    audio.gameStart();
    audio.setProfile(reduceMotion ? 'menu' : 'game');
    const t1 = setTimeout(() => {
      setCards((prev) => prev.map((c) => ({ ...c, state: 'hidden' })));
      setLocked(false);
      setStatus('playing');
    }, reduceMotion ? 600 : 1300);
    timers.current.push(t1);
    return clearTimers;
  }, [reduceMotion, clearTimers]);

  // timer
  useEffect(() => {
    if (status !== 'playing') return;
    const iv = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [status]);

  const starsFor = useCallback((m: number) => (m <= par ? 3 : m <= par * 1.5 ? 2 : 1), [par]);

  const finish = useCallback((finalMoves: number) => {
    const stars = starsFor(finalMoves);
    const base = pairs * 100 - Math.max(0, finalMoves - pairs) * 12;
    const score = Math.max(10, Math.round(base)) + stars * 50;
    const xp = Math.round(cfg.base * (0.6 + stars * 0.2));
    const coins = stars * 15 + (difficulty === 'hard' ? 30 : difficulty === 'normal' ? 15 : 0);
    setStatus('won');
    audio.setProfile('victory');
    audio.victory();
    if (!reduceMotion) celebration();
    const res = recordResult({ game: 'memory', difficulty, score, won: true, stars, streak: bestRunRef.current, xp, coins });
    setResult({ stars, xp, coins, score });
    if (res.leveledUp) pushFloat(`LEVEL UP → ${res.level}`, '#e879f9');
     
  }, [cfg.base, difficulty, pairs, recordResult, reduceMotion, starsFor, pushFloat]);

  const flip = (idx: number) => {
    if (locked || status !== 'playing') return;
    const card = cards[idx];
    if (card.state !== 'hidden' || selected.length >= 2) return;

    audio.flip();
    audio.vibrate(10);
    setCards((prev) => prev.map((c) => (c.id === idx ? { ...c, state: 'flipped' } : c)));
    const next = [...selected, idx];
    setSelected(next);

    if (next.length === 2) {
      setLocked(true);
      setMoves((m) => m + 1);
      const [a, b] = next;
      const ca = cards[a], cb = cards[b];

      later(() => {
        if (ca.pairId === cb.pairId) {
          // ── MATCH: chime + float-fade ──
          const newStreak = streak + 1;
          setStreak(newStreak);
          bestRunRef.current = Math.max(bestRunRef.current, newStreak);
          setBestRun(bestRunRef.current);
          audio.match(newStreak);
          audio.vibrate([12, 30, 12]);
          setCards((prev) => prev.map((c) => (c.id === a || c.id === b ? { ...c, state: 'matched' } : c)));
          setSelected([]);
          setLocked(false);
          const newMatches = matches + 1;
          setMatches(newMatches);

          if (newStreak >= 3) {
            audio.fanfare(newStreak);
            audio.setProfile('streak');
            pushFloat(`COMBO ×${newStreak}`, '#fbbf24');
          }
          if (newMatches === pairs) {
            later(() => finish((moves ?? 0) + 1), reduceMotion ? 250 : 950);
          }
        } else {
          // ── MISS: buzz + shake + flip back ──
          setStreak(0);
          audio.miss();
          audio.setProfile('game');
          setShakePair([a, b]);
          later(() => {
            setCards((prev) => prev.map((c) => (c.id === a || c.id === b ? { ...c, state: 'hidden' } : c)));
            setShakePair([]);
            setSelected([]);
            setLocked(false);
          }, 720);
        }
      }, 560);
    }
  };

  const mmss = useMemo(() => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, [seconds]);

  const replay = () => {
    clearTimers();
    setResult(null);
    setSelected([]);
    setLocked(true);
    setMoves(0); setMatches(0); setStreak(0); setBestRun(0); setSeconds(0);
    bestRunRef.current = 0;
    setStatus('preview');
    setShakePair([]);
    setCards(buildDeck(pairs).map((c) => ({ ...c, state: 'flipped' as CardState })));
    later(() => {
      setCards((prev) => prev.map((c) => ({ ...c, state: 'hidden' })));
      setLocked(false);
      setStatus('playing');
      audio.setProfile('game');
    }, reduceMotion ? 600 : 1300);
  };

  const nextDiff: Difficulty | null = difficulty === 'easy' ? 'normal' : difficulty === 'normal' ? 'hard' : null;
  // "Next difficulty" handled by parent through page reload of shell; simplest: window event
  const gotoNext = () => {
    window.dispatchEvent(new CustomEvent('arcade:set-difficulty', { detail: { game: 'memory', difficulty: nextDiff } }));
    onExit();
  };

  return (
    <div className="relative">
      {/* HUD */}
      <div className="flex justify-center gap-2 md:gap-3 mb-6 flex-wrap">
        <StatChip label="Moves" value={moves} icon="🎯" accent="#e879f9" />
        <StatChip label="Pairs" value={`${matches}/${pairs}`} icon="🃏" accent="#22d3ee" />
        <StatChip label="Streak" value={`×${streak}`} icon="🔥" accent="#fb7185" />
        <StatChip label="Time" value={mmss} icon="⏱" accent="#34d399" />
      </div>

      {/* Board */}
      <div ref={boardRef} className="relative mx-auto" style={{ maxWidth: cfg.cols === 6 ? 660 : 520 }}>
        <FloatText items={floats} />
        <div
          className="grid gap-2 md:gap-3 perspective-1000"
          style={{ gridTemplateColumns: `repeat(${cfg.cols}, minmax(0, 1fr))` }}
          role="grid"
          aria-label={`Memory board, ${cfg.cols} by ${cfg.rows}`}
        >
          {cards.map((card) => {
            const shaking = shakePair.includes(card.id);
            return (
              <div key={card.id} className={cn('relative', shaking && 'anim-shake')}>
                <div
                  className="aspect-[3/4] perspective-1000"
                >
                  <div
                    className={cn('memory-card absolute inset-0 cursor-pointer group', card.state !== 'hidden' && 'flipped')}
                    onClick={() => flip(card.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={card.state === 'hidden' ? `Card ${card.id + 1}, face down` : `Card ${card.id + 1}, ${card.emoji}`}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(card.id); } }}
                  >
                    {/* inner wrapper handles float-fade so it never fights the 3D flip */}
                    <div className={cn('absolute inset-0 preserve-3d', card.state === 'matched' && !reduceMotion && 'anim-float-fade')}>
                      {/* back design (visible when hidden) */}
                      <div
                        className="card-face border border-white/15 shadow-lg transition-all duration-300 group-hover:brightness-125"
                        style={{
                          background: theme.css,
                          boxShadow: `0 0 14px ${theme.glow}44, inset 0 0 18px rgba(0,0,0,.35)`,
                        }}
                      >
                        <span className="text-2xl md:text-3xl font-black text-white/85 neon-text-soft select-none">?</span>
                        <span className="absolute inset-0 rounded-[0.9rem] border border-white/10 m-1.5" aria-hidden />
                      </div>
                      {/* face (visible when flipped) */}
                      <div
                        className="card-face card-back-face border bg-[#1b0b33]/95"
                        style={{
                          borderColor: card.state === 'matched' ? 'rgba(251,191,36,.6)' : 'rgba(232,121,249,.35)',
                          boxShadow: card.state === 'matched' ? '0 0 24px rgba(251,191,36,.35)' : '0 0 12px rgba(232,121,249,.2)',
                        }}
                      >
                        <span className="text-3xl md:text-4xl select-none" aria-hidden>{card.emoji}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* streak edge glow */}
        {streak >= 3 && status === 'playing' && (
          <div className="pointer-events-none absolute -inset-3 rounded-3xl anim-glow-pulse" aria-hidden />
        )}
      </div>

      {/* how stars are judged */}
      <p className="text-center text-xs text-white/40 mt-5 flex items-center justify-center gap-1.5 flex-wrap">
        <Zap className="w-3.5 h-3.5 text-amber-300" aria-hidden />
        3 stars at ≤ {par} moves · <Move className="w-3.5 h-3.5 text-fuchsia-300" aria-hidden /> chain matches for combo fanfares · <Clock className="w-3.5 h-3.5 text-cyan-300" aria-hidden /> precision beats speed
      </p>

      <AnimatePresence>
        {result && (
          <ResultModal
            open
            won
            title="Board Cleared!"
            subtitle={`${difficulty.toUpperCase()} · ${mmss} · ${moves} moves`}
            stars={result.stars}
            stats={[
              { label: 'Moves', value: moves, accent: '#e879f9' },
              { label: 'Best streak', value: `×${bestRun}`, accent: '#fb7185' },
              { label: 'Score', value: result.score, accent: '#fbbf24' },
              { label: 'Time', value: mmss, accent: '#34d399' },
            ]}
            xp={result.xp}
            coins={result.coins}
            onReplay={replay}
            onNext={nextDiff ? gotoNext : undefined}
            nextLabel={nextDiff ? `Try ${nextDiff === 'normal' ? '4×4' : '6×4'}` : undefined}
            onExit={() => { setResult(null); onExit(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
