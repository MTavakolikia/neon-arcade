'use client';

// ─── Neon Arcade · shared UI ─────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { audio } from '@/lib/arcade/audio';
import { cn } from '@/lib/utils';

// ── Star rating ───────────────────────────────────────────────────────────────
export function Stars({ count, size = 28, animate = false }: { count: number; size?: number; animate?: boolean }) {
  const [shown, setShown] = useState(animate ? 0 : count);
  useEffect(() => {
    if (!animate) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setShown(i);
      audio.starPop(i - 1);
      if (i >= count) clearInterval(iv);
    }, 330);
    return () => clearInterval(iv);
  }, [animate, count]);
  return (
    <div className="flex items-center justify-center gap-2" aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('transition-all duration-300', i < shown ? 'anim-pop scale-100' : 'opacity-25 scale-90 grayscale')}
          style={{ fontSize: size, filter: i < shown ? 'drop-shadow(0 0 10px rgba(251,191,36,.8))' : undefined }}
        >
          ⭐
        </span>
      ))}
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
export function StatChip({ label, value, accent = '#e879f9', icon }: { label: string; value: ReactNode; accent?: string; icon?: string }) {
  return (
    <div className="glass rounded-xl px-3 py-2 min-w-[86px] text-center">
      <div className="text-[10px] uppercase tracking-widest text-white/50 flex items-center justify-center gap-1">
        {icon && <span aria-hidden>{icon}</span>}
        {label}
      </div>
      <div className="font-bold text-lg leading-tight neon-text-soft" style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

// ── Combo / score float text ──────────────────────────────────────────────────
export function FloatText({ items }: { items: { id: number; text: string; color?: string; x?: number }[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center" aria-hidden>
      {items.map((it) => (
        <span
          key={it.id}
          className="absolute anim-combo-float font-black text-2xl md:text-3xl neon-text"
          style={{ color: it.color ?? '#fbbf24', left: it.x ? `${it.x}%` : undefined }}
        >
          {it.text}
        </span>
      ))}
    </div>
  );
}

let floatId = 0;
export function useFloatText() {
  const [items, setItems] = useState<{ id: number; text: string; color?: string; x?: number }[]>([]);
  const push = useCallback((text: string, color?: string, x?: number) => {
    const id = ++floatId;
    setItems((prev) => [...prev.slice(-3), { id, text, color, x }]);
    setTimeout(() => setItems((prev) => prev.filter((p) => p.id !== id)), 950);
  }, []);
  return { items, push };
}

// ── 3D tilt wrapper (hub cards) ───────────────────────────────────────────────
export function Tilt3D({ children, className, max = 9 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setStyle({
      transform: `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateZ(6px)`,
      transition: 'transform 60ms linear',
    });
  };
  const onLeave = () => setStyle({ transform: 'perspective(900px) rotateX(0deg) rotateY(0deg)', transition: 'transform 450ms cubic-bezier(.2,.9,.3,1.2)' });
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={style} className={cn('will-change-transform', className)}>
      {children}
    </div>
  );
}

// ── Result modal ──────────────────────────────────────────────────────────────
export interface ResultStat { label: string; value: ReactNode; accent?: string }

export function ResultModal({
  open, title, subtitle, stars, stats, xp, coins, won, onReplay, onNext, nextLabel, onExit,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  stars?: number;
  stats: ResultStat[];
  xp: number;
  coins: number;
  won: boolean;
  onReplay: () => void;
  onNext?: () => void;
  nextLabel?: string;
  onExit: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onExit}
      />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.92, rotateX: -8 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="glass relative rounded-3xl p-6 md:p-8 w-full max-w-md neon-border text-center preserve-3d"
        style={{ background: 'linear-gradient(160deg, rgba(30,12,52,.97), rgba(14,4,28,.98))' }}
        role="dialog" aria-modal="true" aria-label={title}
      >
        <div className="text-5xl mb-2 anim-pop" aria-hidden>{won ? '🏆' : '💀'}</div>
        <h2 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: won ? '#fbbf24' : '#fb7185' }}>
          <span className="neon-text">{title}</span>
        </h2>
        {subtitle && <p className="text-sm text-white/60 mt-1">{subtitle}</p>}
        {stars !== undefined && (
          <div className="my-5">
            <Stars count={stars} size={40} animate />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 my-4">
          {stats.map((s) => (
            <div key={s.label} className="glass rounded-xl px-3 py-2">
              <div className="text-[10px] uppercase tracking-widest text-white/50">{s.label}</div>
              <div className="font-bold text-lg" style={{ color: s.accent ?? '#f4ecff' }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 text-sm mb-5">
          <span className="glass rounded-full px-3 py-1 text-fuchsia-300">+{xp} XP</span>
          <span className="glass rounded-full px-3 py-1 text-amber-300">+{coins} 🪙</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            onClick={() => { audio.click(); onReplay(); }}
            className="rounded-xl px-5 py-3 font-bold text-sm transition-transform hover:scale-[1.03] active:scale-95"
            style={{ background: 'linear-gradient(135deg,#e879f9,#a855f7)', color: '#2b0a38', boxShadow: '0 0 24px rgba(232,121,249,.4)' }}
          >
            🔁 Play again
          </button>
          {onNext && (
            <button
              onClick={() => { audio.click(); onNext(); }}
              className="glass rounded-xl px-5 py-3 font-bold text-sm hover:bg-white/10 transition-transform hover:scale-[1.03] active:scale-95 text-cyan-300"
            >
              {nextLabel ?? 'Next difficulty'} →
            </button>
          )}
          <button
            onClick={() => { audio.click(); onExit(); }}
            className="glass rounded-xl px-5 py-3 font-semibold text-sm text-white/70 hover:bg-white/10 transition"
          >
            Exit
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Neon button ───────────────────────────────────────────────────────────────
export function NeonButton({
  children, onClick, color = '#e879f9', variant = 'solid', className, disabled, ariaLabel,
}: {
  children: ReactNode; onClick?: () => void; color?: string;
  variant?: 'solid' | 'ghost'; className?: string; disabled?: boolean; ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'rounded-xl px-5 py-2.5 font-bold text-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
        variant === 'solid' ? 'hover:scale-[1.03]' : 'glass hover:bg-white/10',
        className
      )}
      style={variant === 'solid'
        ? { background: `linear-gradient(135deg, ${color}, ${color}bb)`, color: '#16041f', boxShadow: `0 0 22px ${color}55` }
        : { color }}
    >
      {children}
    </button>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
export function SectionTitle({ kicker, title, accent = '#e879f9' }: { kicker?: string; title: string; accent?: string }) {
  return (
    <div className="mb-6">
      {kicker && (
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] mb-1" style={{ color: accent }}>
          {kicker}
        </div>
      )}
      <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">{title}</h2>
    </div>
  );
}
