'use client';

// ─── Neon Arcade · Whack-a-Mole ──────────────────────────────────────────────
// Moles erupt from neon burrows. Gold pays double, bombs punish greed,
// windows shrink as the clock drains. Combo streaks multiply everything.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';
import type { Difficulty } from '@/lib/arcade/data';
import { useArcade } from '@/lib/arcade/store';
import { audio } from '@/lib/arcade/audio';
import { celebration } from '@/lib/arcade/confetti';
import { FloatText, NeonButton, ResultModal, StatChip, useFloatText } from '@/components/arcade/shared';
import { cn } from '@/lib/utils';

const DIFF: Record<Difficulty, {
  duration: number; spawn: [number, number]; up: [number, number];
  bombP: number; goldP: number; winScore: number;
}> = {
  easy: { duration: 60, spawn: [850, 550], up: [1150, 850], bombP: 0.06, goldP: 0.10, winScore: 250 },
  normal: { duration: 45, spawn: [680, 420], up: [900, 650], bombP: 0.14, goldP: 0.10, winScore: 350 },
  hard: { duration: 35, spawn: [520, 320], up: [640, 460], bombP: 0.22, goldP: 0.10, winScore: 450 },
};

type HoleType = 'mole' | 'gold' | 'bomb';
interface Hole { type: HoleType; leaving?: boolean; whacked?: boolean; seq: number }

export function WhackAMole({ difficulty, onExit }: { difficulty: Difficulty; onExit: () => void }) {
  const cfg = DIFF[difficulty];
  const [holes, setHoles] = useState<(Hole | null)[]>(Array(9).fill(null));
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hits, setHits] = useState(0);
  const [expired, setExpired] = useState(0);
  const [timeLeft, setTimeLeft] = useState(cfg.duration);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ score: number; hits: number; bestStreak: number; won: boolean; xp: number; coins: number } | null>(null);
  const [round, setRound] = useState(0);
  const [flash, setFlash] = useState(false);

  const { items: floats, push: pushFloat } = useFloatText();
  const seqRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stateRef = useRef({ score: 0, streak: 0, hits: 0, expired: 0, bestStreak: 0, running: false });
  const holesRef = useRef<(Hole | null)[]>(Array(9).fill(null));
  const timeLeftRef = useRef(cfg.duration);

  const recordResult = useArcade((s) => s.recordResult);
  const reduceMotion = useArcade((s) => s.settings.reduceMotion);

  // keep refs in sync with committed state (read inside timers/callbacks)
  useEffect(() => { holesRef.current = holes; }, [holes]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  const multFor = (s: number) => Math.min(4, 1 + Math.floor(s / 8) * 0.5);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const endRound = useCallback(() => {
    if (!stateRef.current.running) return;
    stateRef.current.running = false;
    setRunning(false);
    clearAll();
    setHoles(Array(9).fill(null));
    const s = stateRef.current;
    const won = s.score >= cfg.winScore;
    const accuracy = s.hits + s.expired > 0 ? Math.round((s.hits / (s.hits + s.expired)) * 100) : 0;
    const xp = Math.floor(s.score / 9) + Math.round(accuracy * 0.4);
    const coins = Math.floor(s.score / 25);
    if (won) { audio.victory(); if (!reduceMotion) celebration(); } else audio.gameOver();
    const res = recordResult({ game: 'mole', difficulty, score: s.score, won, streak: s.bestStreak, xp, coins });
    if (res.leveledUp) audio.levelUp();
    setResult({ score: s.score, hits: s.hits, bestStreak: s.bestStreak, won, xp, coins });
     
  }, [cfg.winScore, clearAll, difficulty, recordResult, reduceMotion]);

  const despawn = useCallback((idx: number, penalize: boolean) => {
    const hole = holesRef.current[idx];
    if (!hole || hole.leaving) return;
    if (penalize && !hole.whacked && hole.type !== 'bomb') {
      stateRef.current.expired++;
      stateRef.current.streak = 0;
      setStreak(0);
      setExpired(stateRef.current.expired);
      audio.error();
    }
    holesRef.current[idx] = { ...hole, leaving: true };   // sync guard against re-taps
    setHoles((prev) => prev.map((h, i) => (i === idx && h ? { ...h, leaving: true } : h)));
    later(() => setHoles((prev) => prev.map((h, i) => (i === idx ? null : h))), 170);
  }, [later]);

  const spawnLoopRef = useRef<(() => void) | null>(null);

  const spawnLoop = useCallback(() => {
    if (!stateRef.current.running) return;
    const progress = Math.min(1, (cfg.duration - timeLeftRef.current) / cfg.duration);
    const spawnEvery = cfg.spawn[0] + (cfg.spawn[1] - cfg.spawn[0]) * progress;
    const upFor = (cfg.up[0] + (cfg.up[1] - cfg.up[0]) * progress) * (reduceMotion ? 1.25 : 1);

    const empties = holesRef.current.map((h, i) => (h === null ? i : -1)).filter((i) => i >= 0);
    if (empties.length > 0) {
      const idx = empties[Math.floor(Math.random() * empties.length)];
      const r = Math.random();
      const type: HoleType = r < cfg.goldP ? 'gold' : r < cfg.goldP + cfg.bombP ? 'bomb' : 'mole';
      setHoles((prev) => prev.map((h, i) => (i === idx ? { type, seq: ++seqRef.current } : h)));
      later(() => despawn(idx, true), upFor);
    }
    timers.current.push(setTimeout(() => spawnLoopRef.current?.(), spawnEvery * (reduceMotion ? 1.2 : 1)));
     
  }, [cfg, despawn, later, reduceMotion]);

  useEffect(() => { spawnLoopRef.current = spawnLoop; }, [spawnLoop]);

  const start = useCallback(() => {
    clearAll();
    setResult(null);
    holesRef.current = Array(9).fill(null);
    setHoles(Array(9).fill(null));
    setScore(0); setStreak(0); setHits(0); setExpired(0); setTimeLeft(cfg.duration);
    stateRef.current = { score: 0, streak: 0, hits: 0, expired: 0, bestStreak: 0, running: true };
    setRunning(true);
    audio.gameStart();
    audio.setProfile('game');

    // countdown (endRound must NEVER run inside a setState updater)
    let remaining = cfg.duration;
    const iv = setInterval(() => {
      remaining = Math.max(0, remaining - 0.1);
      setTimeLeft(remaining);
      if (remaining <= 0) { clearInterval(iv); endRound(); }
    }, 100);
    timers.current.push(iv as unknown as ReturnType<typeof setTimeout>);

    spawnLoop();
  }, [cfg.duration, clearAll, endRound, spawnLoop]);

  useEffect(() => () => clearAll(), [clearAll, round]);

  const whack = (idx: number) => {
    if (!stateRef.current.running) return;
    const hole = holesRef.current[idx];
    if (!hole || hole.leaving || hole.whacked) {
      // whiffed tap — no penalty, tiny sound
      audio.click();
      return;
    }
    holesRef.current[idx] = { ...hole, whacked: true };     // sync guard: block double-taps
    if (hole.type === 'bomb') {
      stateRef.current.score = Math.max(0, stateRef.current.score - 25);
      stateRef.current.streak = 0;
      setScore(stateRef.current.score);
      setStreak(0);
      audio.bomb();
      audio.vibrate([60, 30, 60]);
      setFlash(true);
      later(() => setFlash(false), 350);
      pushFloat('💥 -25', '#fb7185');
      setHoles((prev) => prev.map((h, i) => (i === idx && h ? { ...h, whacked: true } : h)));
      later(() => despawn(idx, false), 260);
    } else {
      const base = hole.type === 'gold' ? 25 : 10;
      stateRef.current.streak++;
      stateRef.current.hits++;
      stateRef.current.bestStreak = Math.max(stateRef.current.bestStreak, stateRef.current.streak);
      const m = multFor(stateRef.current.streak);
      const gained = Math.round(base * m);
      stateRef.current.score += gained;
      setScore(stateRef.current.score);
      setStreak(stateRef.current.streak);
      setHits(stateRef.current.hits);
      if (hole.type === 'gold') audio.golden(); else audio.whack();
      audio.vibrate(15);
      pushFloat(`+${gained}${m > 1 ? ` ×${m}` : ''}`, hole.type === 'gold' ? '#fbbf24' : '#34d399');
      setHoles((prev) => prev.map((h, i) => (i === idx && h ? { ...h, whacked: true } : h)));
      later(() => despawn(idx, false), 240);
      if (stateRef.current.streak === 15) {
        // achievement hook (recorded via recordResult streak on end; unlock now for the toast)
        useArcade.getState().unlockAchievement('mole-15streak');
      }
    }
  };

  const mult = multFor(streak);
  const timePct = (timeLeft / cfg.duration) * 100;
  const mmss = `${Math.floor(timeLeft)}s`;

  const face = (hole: Hole) => {
    if (hole.whacked && hole.type !== 'bomb') return '💫';
    return hole.type === 'gold' ? '🌟' : hole.type === 'bomb' ? '💣' : '🐹';
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-center gap-2 md:gap-3 mb-4 flex-wrap">
        <StatChip label="Score" value={score} accent="#fb7185" />
        <StatChip label="Streak" value={`×${streak}`} accent="#fbbf24" icon="🔥" />
        <StatChip label="Multiplier" value={mult > 1 ? `×${mult}` : '—'} accent="#34d399" icon="⚡" />
      </div>

      {/* time bar */}
      <div className="glass rounded-full h-4 mb-5 overflow-hidden relative" role="timer" aria-label={`Time left ${mmss}`}>
        <div
          className="h-full rounded-full transition-[width] duration-100 ease-linear"
          style={{
            width: `${timePct}%`,
            background: timePct > 40 ? 'linear-gradient(90deg,#34d399,#22d3ee)' : 'linear-gradient(90deg,#fb7185,#fbbf24)',
            boxShadow: '0 0 14px rgba(34,211,238,.4)',
          }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-widest text-white/80">
          {running ? mmss : `${cfg.duration}s ROUND`}
        </span>
      </div>

      <div className={cn('relative', flash && 'anim-shake')}>
        <FloatText items={floats} />
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {holes.map((hole, i) => (
            <button
              key={i}
              onClick={() => whack(i)}
              disabled={!running}
              className="relative aspect-square rounded-2xl overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400 disabled:cursor-default"
              style={{
                background: 'radial-gradient(circle at 50% 42%, #2a0f4a 0%, #170729 62%)',
                border: '1px solid rgba(232,121,249,.18)',
                boxShadow: 'inset 0 10px 26px rgba(0,0,0,.75), 0 0 12px rgba(232,121,249,.08)',
              }}
              aria-label={hole ? `Burrow ${i + 1}: ${hole.type} visible` : `Burrow ${i + 1}: empty`}
            >
              {/* pit rim */}
              <span className="absolute inset-x-4 bottom-3 h-4 rounded-full bg-black/60 blur-[2px]" aria-hidden />
              {hole && (
                <span
                  className={cn(
                    'absolute inset-x-0 bottom-1 top-1 flex items-center justify-center text-5xl md:text-6xl',
                    hole.leaving ? 'anim-mole-down' : 'anim-mole-up',
                    hole.whacked && 'grayscale-[0.2]'
                  )}
                  style={{ filter: hole.type === 'gold' ? 'drop-shadow(0 0 14px rgba(251,191,36,.8))' : hole.type === 'bomb' ? 'drop-shadow(0 0 12px rgba(251,113,133,.75))' : undefined }}
                  aria-hidden
                >
                  {face(hole)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center mt-6">
        {!running && !result && (
          <NeonButton onClick={start} color="#fb7185">
            ▶ Start {cfg.duration}s round
          </NeonButton>
        )}
        {running && (
          <p className="text-xs text-white/40 flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5" aria-hidden /> hammer every mole you can — not the bombs
          </p>
        )}
      </div>

      {result && (
        <ResultModal
          open
          won={result.won}
          title={result.won ? 'Mole Marshal!' : 'Time Up!'}
          subtitle={result.won ? `${difficulty.toUpperCase()} target reached` : `Score ${result.score} / target ${cfg.winScore}`}
          stats={[
            { label: 'Score', value: result.score, accent: '#fb7185' },
            { label: 'Moles whacked', value: result.hits, accent: '#34d399' },
            { label: 'Best streak', value: `×${result.bestStreak}`, accent: '#fbbf24' },
            { label: 'Accuracy', value: `${result.hits + expired > 0 ? Math.round((result.hits / (result.hits + expired)) * 100) : 0}%`, accent: '#22d3ee' },
          ]}
          xp={result.xp}
          coins={result.coins}
          onReplay={start}
          onExit={() => { setResult(null); onExit(); }}
        />
      )}
    </div>
  );
}
