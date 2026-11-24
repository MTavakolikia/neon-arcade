'use client';

// ─── Neon Arcade · Simon Says ────────────────────────────────────────────────
// Watch the sequence, replay it perfectly. Pads play rising tones.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Difficulty } from '@/lib/arcade/data';
import { useArcade } from '@/lib/arcade/store';
import { audio } from '@/lib/arcade/audio';
import { celebration } from '@/lib/arcade/confetti';
import { NeonButton, ResultModal, StatChip } from '@/components/arcade/shared';
import { cn } from '@/lib/utils';

const PADS = [
  { color: '#e879f9', label: 'Fuchsia', glow: 'rgba(232,121,249,.65)' },
  { color: '#22d3ee', label: 'Cyan', glow: 'rgba(34,211,238,.65)' },
  { color: '#34d399', label: 'Emerald', glow: 'rgba(52,211,153,.65)' },
  { color: '#fbbf24', label: 'Amber', glow: 'rgba(251,191,36,.65)' },
];

const DIFF: Record<Difficulty, { step: number; target: number }> = {
  easy: { step: 620, target: 8 },
  normal: { step: 470, target: 12 },
  hard: { step: 340, target: 16 },
};

type Phase = 'idle' | 'showing' | 'input' | 'over' | 'won';

export function SimonSays({ difficulty, onExit }: { difficulty: Difficulty; onExit: () => void }) {
  const cfg = DIFF[difficulty];
  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [lit, setLit] = useState<number | null>(null);
  const [inputIdx, setInputIdx] = useState(0);
  const [bestLevel, setBestLevel] = useState(0);
  const [flashAll, setFlashAll] = useState(false);
  const [result, setResult] = useState<{ level: number; won: boolean; xp: number; coins: number } | null>(null);
  const [round, setRound] = useState(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const recordResult = useArcade((s) => s.recordResult);
  const reduceMotion = useArcade((s) => s.settings.reduceMotion);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const playSequence = useCallback((seq: number[]) => {
    setPhase('showing');
    const step = reduceMotion ? cfg.step * 0.6 : cfg.step;
    seq.forEach((pad, i) => {
      later(() => {
        setLit(pad);
        audio.simonTone(pad);
        later(() => setLit(null), step * 0.55);
      }, 400 + i * step);
    });
    later(() => {
      setPhase('input');
      setInputIdx(0);
    }, 400 + seq.length * step + 120);
  }, [cfg.step, later, reduceMotion]);

  const start = useCallback(() => {
    clearTimers();
    setResult(null);
    setBestLevel(0);
    audio.gameStart();
    audio.setProfile('game');
    const seq = [Math.floor(Math.random() * 4)];
    setSequence(seq);
    playSequence(seq);
  }, [clearTimers, playSequence]);

  useEffect(() => () => clearTimers(), [clearTimers, round]);

  const press = (pad: number) => {
    if (phase !== 'input') return;
    setLit(pad);
    audio.simonTone(pad);
    audio.vibrate(12);
    setTimeout(() => setLit(null), 180);

    if (sequence[inputIdx] !== pad) {
      // ── fail ──
      setPhase('over');
      setFlashAll(true);
      audio.miss();
      audio.setProfile('menu');
      later(() => setFlashAll(false), 700);
      const level = sequence.length - 1;
      const xp = level * 12;
      const coins = level * 3;
      const res = recordResult({ game: 'simon', difficulty, score: level, won: false, xp, coins });
      setBestLevel((b) => Math.max(b, level));
      later(() => {
        setResult({ level, won: false, xp, coins });
        if (res.leveledUp) audio.levelUp();
      }, 900);
      return;
    }

    const nextIdx = inputIdx + 1;
    if (nextIdx >= sequence.length) {
      // ── level complete ──
      const newLevel = sequence.length;
      setBestLevel((b) => Math.max(b, newLevel));
      if (newLevel >= cfg.target) {
        // ── won the whole run ──
        setPhase('won');
        audio.victory();
        if (!reduceMotion) celebration();
        const xp = newLevel * 12 + 40;
        const coins = newLevel * 3 + 50;
        recordResult({ game: 'simon', difficulty, score: newLevel, won: true, xp, coins });
        later(() => setResult({ level: newLevel, won: true, xp, coins }), 600);
      } else {
        audio.match(newLevel);
        setPhase('showing');
        later(() => {
          const seq = [...sequence, Math.floor(Math.random() * 4)];
          setSequence(seq);
          playSequence(seq);
        }, 750);
      }
    } else {
      setInputIdx(nextIdx);
    }
  };

  // keyboard 1-4
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx >= 0) press(idx);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
     
  }, [phase, sequence, inputIdx]);

  const nextDiff: Difficulty | null = difficulty === 'easy' ? 'normal' : difficulty === 'normal' ? 'hard' : null;
  const gotoNext = () => {
    window.dispatchEvent(new CustomEvent('arcade:set-difficulty', { detail: { game: 'simon', difficulty: nextDiff } }));
    onExit();
  };

  const statusText = phase === 'idle' ? 'Press start' : phase === 'showing' ? 'Watch…' : phase === 'input' ? 'Your turn!' : phase === 'won' ? 'Perfect!' : 'Oops!';

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-center gap-2 md:gap-3 mb-6 flex-wrap">
        <StatChip label="Level" value={sequence.length === 0 ? 0 : phase === 'over' || phase === 'won' ? bestLevel : sequence.length} accent="#fbbf24" />
        <StatChip label="Target" value={cfg.target} accent="#e879f9" />
        <StatChip label="Best" value={bestLevel} accent="#22d3ee" />
      </div>

      {/* status */}
      <div className="text-center mb-5 h-7">
        <span className={cn('font-bold tracking-widest uppercase text-sm', phase === 'input' ? 'text-emerald-400 anim-blink' : 'text-white/60')}>
          {statusText}
        </span>
      </div>

      <div className={cn('relative aspect-square max-w-sm mx-auto', flashAll && 'anim-shake')}>
        {/* pads */}
        <div className="grid grid-cols-2 grid-rows-2 gap-3 md:gap-4 h-full">
          {PADS.map((pad, i) => (
            <button
              key={i}
              className={cn(
                'simon-pad rounded-3xl border-2 border-white/15 outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                lit === i && 'lit'
              )}
              style={{
                background: `radial-gradient(circle at 32% 28%, ${pad.color}55, ${pad.color}18 65%)`,
                boxShadow: lit === i ? undefined : `inset 0 0 26px ${pad.glow}33, 0 0 12px ${pad.glow}22`,
                ['--pad-glow' as string]: pad.glow,
              }}
              onClick={() => press(i)}
              disabled={phase !== 'input'}
              aria-label={`Simon pad ${i + 1} (${pad.label})`}
            />
          ))}
        </div>

        {/* center hub */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-24 h-24 md:w-28 md:h-28 rounded-full glass flex flex-col items-center justify-center border-2"
            style={{ borderColor: 'rgba(232,121,249,.4)', boxShadow: '0 0 30px rgba(232,121,249,.35), inset 0 0 20px rgba(0,0,0,.5)' }}
          >
            <span className="text-2xl font-black text-white neon-text-soft">{sequence.length === 0 ? '–' : phase === 'over' ? bestLevel : sequence.length}</span>
            <span className="text-[9px] uppercase tracking-widest text-white/50">{phase === 'input' ? `${inputIdx}/${sequence.length}` : 'level'}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-7">
        {phase === 'idle' || phase === 'over' || phase === 'won' ? (
          <NeonButton onClick={start} color="#fbbf24">
            {phase === 'idle' ? '▶ Start sequence' : '↻ Try again'}
          </NeonButton>
        ) : (
          <div className="text-xs text-white/40">Keys 1–4 also work · {difficulty === 'easy' ? 'slow tempo' : difficulty === 'normal' ? 'arcade tempo' : 'fast tempo'}</div>
        )}
      </div>

      {result && (
        <ResultModal
          open
          won={result.won}
          title={result.won ? 'Maestro!' : 'Sequence Broken'}
          subtitle={`Reached level ${result.level} · target was ${cfg.target}`}
          stats={[
            { label: 'Level reached', value: result.level, accent: '#fbbf24' },
            { label: 'Best this run', value: bestLevel, accent: '#22d3ee' },
          ]}
          xp={result.xp}
          coins={result.coins}
          onReplay={start}
          onNext={nextDiff ? gotoNext : undefined}
          onExit={() => { setResult(null); onExit(); }}
        />
      )}
    </div>
  );
}
