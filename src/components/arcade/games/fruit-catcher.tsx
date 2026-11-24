'use client';

// ─── Neon Arcade · Fruit Catcher ─────────────────────────────────────────────
// Canvas game: steer the basket, chain combos, avoid bombs.
// Controls: mouse / touch drag / arrow keys or A-D.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import type { Difficulty } from '@/lib/arcade/data';
import { useArcade } from '@/lib/arcade/store';
import { audio } from '@/lib/arcade/audio';
import { celebration } from '@/lib/arcade/confetti';
import { ResultModal, StatChip } from '@/components/arcade/shared';

const FRUITS = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍒', '🍍', '🥝'];

const DIFF: Record<Difficulty, { spawn: number; speed: [number, number]; bombP: number; starP: number; basketW: number; winScore: number }> = {
  easy: { spawn: 850, speed: [130, 190], bombP: 0.14, starP: 0.08, basketW: 120, winScore: 250 },
  normal: { spawn: 620, speed: [180, 260], bombP: 0.20, starP: 0.07, basketW: 95, winScore: 400 },
  hard: { spawn: 470, speed: [240, 340], bombP: 0.26, starP: 0.06, basketW: 74, winScore: 550 },
};

interface Falling { x: number; y: number; vx: number; vy: number; emoji: string; type: 'fruit' | 'bomb' | 'star' }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string }
interface Popup { x: number; y: number; text: string; life: number; color: string }

export function FruitCatcher({ difficulty, onExit }: { difficulty: Difficulty; onExit: () => void }) {
  const cfg = DIFF[difficulty];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [mult, setMult] = useState(1);
  const [lives, setLives] = useState(3);
  const [caught, setCaught] = useState(0);
  const [result, setResult] = useState<{ score: number; caught: number; won: boolean; xp: number; coins: number; best: number } | null>(null);
  const [round, setRound] = useState(0);

  const recordResult = useArcade((s) => s.recordResult);
  const unlock = useArcade((s) => s.unlockAchievement);
  const reduceMotion = useArcade((s) => s.settings.reduceMotion);
  const endedRef = useRef(false);

  const end = useCallback((finalScore: number, finalCaught: number) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const won = finalScore >= cfg.winScore;
    const xp = Math.min(150, Math.floor(finalScore / 8));
    const coins = Math.floor(finalScore / 20);
    if (won) {
      audio.victory();
      if (!reduceMotion) celebration();
    } else {
      audio.gameOver();
    }
    if (finalCaught >= 40) unlock('fruit-40combo');
    const res = recordResult({ game: 'fruit', difficulty, score: finalScore, won, xp, coins });
    const best = useArcade.getState().highScores[`fruit:${difficulty}`] ?? finalScore;
    setResult({ score: finalScore, caught: finalCaught, won, xp, coins, best });
     
  }, [cfg.winScore, difficulty, recordResult, reduceMotion, unlock]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      const rect = wrapRef.current!.getBoundingClientRect();
      W = rect.width; H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current!);

    // ── mutable game state ──
    const g = {
      basketX: W / 2, basketW: cfg.basketW, basketY: H - 46,
      items: [] as Falling[], particles: [] as Particle[], popups: [] as Popup[],
      score: 0, combo: 0, caught: 0, lives: 3,
      spawnT: 0, elapsed: 0, shake: 0, flash: 0,
      keys: { left: false, right: false },
    };
    endedRef.current = false;

    const multFor = (c: number) => Math.min(4, 1 + Math.floor(c / 5) * 0.5);

    const spawn = () => {
      const r = Math.random();
      const type: Falling['type'] = r < cfg.starP ? 'star' : r < cfg.starP + cfg.bombP ? 'bomb' : 'fruit';
      const [lo, hi] = cfg.speed;
      g.items.push({
        x: 30 + Math.random() * (W - 60),
        y: -30,
        vx: difficulty === 'hard' ? (Math.random() - 0.5) * 60 : (Math.random() - 0.5) * 24,
        vy: lo + Math.random() * (hi - lo),
        emoji: type === 'star' ? '⭐' : type === 'bomb' ? '💣' : FRUITS[Math.floor(Math.random() * FRUITS.length)],
        type,
      });
    };

    const addParticles = (x: number, y: number, color: string, n = 10) => {
      if (reduceMotion) return;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        g.particles.push({ x, y, vx: Math.cos(a) * (40 + Math.random() * 120), vy: Math.sin(a) * (40 + Math.random() * 120) - 60, life: 1, color });
      }
    };

    const addPopup = (x: number, y: number, text: string, color: string) => {
      g.popups.push({ x, y, text, color, life: 1 });
    };

    // ── input ──
    const pointerX = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      return clientX - rect.left;
    };
    const onPointerMove = (e: PointerEvent) => { g.basketX = pointerX(e.clientX); };
    const onPointerDown = (e: PointerEvent) => { g.basketX = pointerX(e.clientX); };
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) { g.keys.left = down; e.preventDefault(); }
      if (['ArrowRight', 'd', 'D'].includes(e.key)) { g.keys.right = down; e.preventDefault(); }
    };
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    const kd = onKey(true), ku = onKey(false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    // ── loop ──
    let raf = 0;
    let last = performance.now();
    const loop = (ts: number) => {
      const dt = Math.min((ts - last) / 1000, 0.05);
      last = ts;
      const ramp = 1 + Math.min(0.5, g.elapsed / 90 * 0.5);
      g.elapsed += dt;

      // keyboard move
      const kspeed = 460 * dt;
      if (g.keys.left) g.basketX -= kspeed;
      if (g.keys.right) g.basketX += kspeed;
      g.basketX = Math.max(g.basketW / 2 + 6, Math.min(W - g.basketW / 2 - 6, g.basketX));

      // spawn
      g.spawnT += dt * 1000;
      const interval = cfg.spawn * (1 - Math.min(0.35, g.elapsed / 100 * 0.35));
      if (g.spawnT >= interval) { g.spawnT = 0; spawn(); }

      // update items
      for (const it of g.items) {
        it.y += it.vy * ramp * dt;
        it.x += it.vx * dt;
        if (it.x < 16 || it.x > W - 16) it.vx *= -1;
      }

      // catches / misses
      for (let i = g.items.length - 1; i >= 0; i--) {
        const it = g.items[i];
        const nearBasket = it.y > g.basketY - 26 && it.y < g.basketY + 26;
        const overlapX = Math.abs(it.x - g.basketX) < g.basketW / 2 + 14;
        if (nearBasket && overlapX) {
          g.items.splice(i, 1);
          if (it.type === 'bomb') {
            g.lives--; g.combo = 0; g.shake = 12; g.flash = 0.5;
            audio.bomb();
            addParticles(it.x, it.y, '#fb7185', 16);
            addPopup(it.x, it.y, '💥 -1 LIFE', '#fb7185');
            setLives(g.lives); setCombo(0); setMult(1);
            if (g.lives <= 0) { end(g.score, g.caught); }
          } else {
            const base = it.type === 'star' ? 30 : 10;
            g.combo++; g.caught++;
            const m = multFor(g.combo);
            const gained = Math.round(base * m);
            g.score += gained;
            if (it.type === 'star') audio.golden(); else audio.catchFruit();
            audio.vibrate(8);
            addParticles(it.x, it.y, it.type === 'star' ? '#fbbf24' : '#34d399', it.type === 'star' ? 14 : 8);
            addPopup(it.x, it.y, `+${gained}${m > 1 ? ` ×${m}` : ''}`, it.type === 'star' ? '#fbbf24' : '#34d399');
            setScore(g.score); setCaught(g.caught);
            setCombo(g.combo); setMult(m);
          }
        } else if (it.y > H + 34) {
          g.items.splice(i, 1);
          if (it.type !== 'bomb' && g.combo >= 5) addPopup(it.x, H - 60, 'COMBO LOST', '#fb7185');
          if (it.type !== 'bomb' && g.combo > 0) { g.combo = 0; setCombo(0); setMult(1); }
        }
      }

      // particles / popups
      for (let i = g.particles.length - 1; i >= 0; i--) {
        const p = g.particles[i];
        p.vy += 340 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.2;
        if (p.life <= 0) g.particles.splice(i, 1);
      }
      for (let i = g.popups.length - 1; i >= 0; i--) {
        const p = g.popups[i];
        p.y -= 55 * dt; p.life -= dt * 1.4;
        if (p.life <= 0) g.popups.splice(i, 1);
      }
      g.shake = Math.max(0, g.shake - dt * 40);
      g.flash = Math.max(0, g.flash - dt);

      // ── draw ──
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      if (g.shake > 0 && !reduceMotion) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);

      // backdrop
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#14052a');
      bg.addColorStop(0.7, '#0d0320');
      bg.addColorStop(1, '#1a0733');
      ctx.fillStyle = bg;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      // neon horizon lines
      ctx.strokeStyle = 'rgba(34,211,238,0.10)';
      ctx.lineWidth = 1;
      const scroll = (g.elapsed * 40) % 48;
      for (let y = scroll; y < H; y += 48) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (let x = 0; x < W; x += 64) {
        ctx.strokeStyle = 'rgba(232,121,249,0.06)';
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }

      // items
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const it of g.items) {
        ctx.font = it.type === 'star' ? '30px serif' : '28px serif';
        if (it.type === 'bomb') { ctx.shadowColor = 'rgba(251,113,133,.8)'; ctx.shadowBlur = 14; }
        if (it.type === 'star') { ctx.shadowColor = 'rgba(251,191,36,.9)'; ctx.shadowBlur = 16; }
        ctx.fillText(it.emoji, it.x, it.y);
        ctx.shadowBlur = 0;
      }

      // basket glow pad
      ctx.fillStyle = 'rgba(52,211,153,0.10)';
      ctx.fillRect(g.basketX - g.basketW / 2, g.basketY + 12, g.basketW, 4);
      ctx.font = '40px serif';
      ctx.shadowColor = 'rgba(52,211,153,.7)';
      ctx.shadowBlur = 12;
      ctx.fillText('🧺', g.basketX, g.basketY + 4);
      ctx.shadowBlur = 0;

      // particles
      for (const p of g.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      // popups
      for (const p of g.popups) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.4));
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, p.y);
      }
      ctx.globalAlpha = 1;

      // bomb flash
      if (g.flash > 0) {
        ctx.fillStyle = `rgba(251,113,133,${g.flash * 0.25})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [cfg, difficulty, end, reduceMotion, round]);

  const replay = () => {
    setScore(0); setCombo(0); setMult(1); setLives(3); setCaught(0); setResult(null);
    setRound((r) => r + 1);
  };
  const nextDiff: Difficulty | null = difficulty === 'easy' ? 'normal' : difficulty === 'normal' ? 'hard' : null;
  const gotoNext = () => {
    window.dispatchEvent(new CustomEvent('arcade:set-difficulty', { detail: { game: 'fruit', difficulty: nextDiff } }));
    onExit();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-center gap-2 md:gap-3 mb-4 flex-wrap">
        <StatChip label="Score" value={score} accent="#34d399" />
        <StatChip label="Combo" value={combo > 0 ? `×${mult}` : '—'} accent="#fbbf24" icon="🔥" />
        <StatChip label="Caught" value={caught} accent="#22d3ee" />
        <div className="glass rounded-xl px-3 py-2 min-w-[86px] text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/50">Lives</div>
          <div className="flex justify-center gap-0.5 pt-0.5" aria-label={`${lives} lives`}>
            {[0, 1, 2].map((i) => (
              <Heart key={i} className={`w-4 h-4 ${i < lives ? 'fill-rose-400 text-rose-400' : 'text-white/15'}`} aria-hidden />
            ))}
          </div>
        </div>
      </div>

      <div ref={wrapRef} className="relative rounded-2xl overflow-hidden neon-border touch-none select-none" style={{ height: 'min(58vh, 460px)' }}>
        <canvas ref={canvasRef} className="w-full h-full block cursor-none" aria-label="Fruit Catcher play field. Move pointer or drag to steer the basket." />
        <div className="absolute top-2 right-3 text-[10px] uppercase tracking-widest text-white/30 pointer-events-none">
          Target · {cfg.winScore} pts
        </div>
      </div>

      <p className="text-center text-xs text-white/40 mt-4">
        Drag or use ← → keys · golden stars pay triple · bombs cost a life and your combo
      </p>

      {result && (
        <ResultModal
          open
          won={result.won}
          title={result.won ? 'Harvest Master!' : 'Game Over'}
          subtitle={result.won ? `${difficulty.toUpperCase()} target smashed` : `Score ${result.score} / target ${cfg.winScore}`}
          stats={[
            { label: 'Score', value: result.score, accent: '#34d399' },
            { label: 'Fruits caught', value: result.caught, accent: '#22d3ee' },
            { label: 'Best', value: result.best, accent: '#fbbf24' },
            { label: 'Difficulty', value: difficulty.toUpperCase(), accent: '#fb7185' },
          ]}
          xp={result.xp}
          coins={result.coins}
          onReplay={replay}
          onNext={nextDiff ? gotoNext : undefined}
          onExit={() => { setResult(null); onExit(); }}
        />
      )}
    </div>
  );
}
