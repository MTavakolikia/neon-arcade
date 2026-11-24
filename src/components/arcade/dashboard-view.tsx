'use client';

// ─── Neon Arcade · Dashboard ─────────────────────────────────────────────────
// Player profile, level ring, 14-day XP chart, per-game bests, achievements.

import { motion } from 'framer-motion';
import { Award, Coins, Flame, Gamepad2, Target, TrendingUp, Trophy } from 'lucide-react';
import { ACHIEVEMENTS, CARD_THEMES, GAMES, type Difficulty } from '@/lib/arcade/data';
import { levelProgress, rankFor, useArcade } from '@/lib/arcade/store';
import { audio } from '@/lib/arcade/audio';
import { SectionTitle } from '@/components/arcade/shared';
import { cn } from '@/lib/utils';

function LevelRing({ pct, level }: { pct: number; level: number }) {
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={R} fill="none"
          stroke="url(#ringGrad)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)}
          style={{ filter: 'drop-shadow(0 0 8px rgba(232,121,249,.7))', transition: 'stroke-dashoffset 1s ease' }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[9px] uppercase tracking-widest text-white/45">Level</span>
        <span className="text-3xl font-black text-white neon-text-soft">{level}</span>
      </div>
    </div>
  );
}

export function DashboardView() {
  const s = useArcade();
  const prog = levelProgress(s.xp);
  const winRate = s.gamesPlayed > 0 ? Math.round((s.wins / s.gamesPlayed) * 100) : 0;

  // last 14 days of XP
  const days: { label: string; xp: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ label: d.getDate().toString(), xp: s.xpLog.find((e) => e.date === key)?.xp ?? 0 });
  }
  const maxXp = Math.max(...days.map((d) => d.xp), 10);
  const activeDays = days.filter((d) => d.xp > 0).length;

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24 pt-8">
      {/* ── profile ── */}
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <SectionTitle kicker="Player HQ" title="Your Dashboard" accent="#22d3ee" />
        <div className="glass rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-fuchsia-500/15 blur-3xl" aria-hidden />
          <LevelRing pct={prog.pct} level={prog.level} />
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-2xl font-black text-white">
              <span className="neon-text-soft text-fuchsia-300">{rankFor(prog.level)}</span>
            </h3>
            <p className="text-sm text-white/55 mt-1">
              {prog.into} / {prog.need} XP toward level {prog.level + 1} · {s.xp} XP total
            </p>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
              <span className="glass rounded-full px-3 py-1.5 text-xs font-bold text-amber-300 flex items-center gap-1.5"><Coins className="w-3.5 h-3.5" aria-hidden /> {s.coins} coins</span>
              <span className="glass rounded-full px-3 py-1.5 text-xs font-bold text-fuchsia-300 flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5" aria-hidden /> {s.gamesPlayed} rounds</span>
              <span className="glass rounded-full px-3 py-1.5 text-xs font-bold text-emerald-300 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" aria-hidden /> {winRate}% win rate</span>
              <span className="glass rounded-full px-3 py-1.5 text-xs font-bold text-rose-300 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" aria-hidden /> streak ×{s.bestStreak}</span>
              <span className="glass rounded-full px-3 py-1.5 text-xs font-bold text-cyan-300 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" aria-hidden /> {activeDays} active days</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── XP chart ── */}
      <section className="mt-10">
        <SectionTitle kicker="Last 14 days" title="XP Activity" accent="#34d399" />
        <div className="glass rounded-2xl p-5">
          <div className="flex items-end gap-1.5 h-36" aria-label="Bar chart of daily XP for the last 14 days">
            {days.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                  <div
                    className="w-full rounded-t-md transition-all duration-500 relative"
                    style={{
                      height: `${Math.max(4, (d.xp / maxXp) * 100)}%`,
                      background: d.xp > 0 ? 'linear-gradient(180deg,#e879f9,#7c3aed)' : 'rgba(255,255,255,.06)',
                      boxShadow: d.xp > 0 ? '0 0 12px rgba(232,121,249,.35)' : undefined,
                    }}
                    title={`${d.xp} XP`}
                  >
                    {d.xp > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-fuchsia-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {d.xp}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-[9px] text-white/35">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── per-game bests ── */}
      <section className="mt-10">
        <SectionTitle kicker="Hall of records" title="Personal Bests" accent="#fbbf24" />
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto neon-scroll">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-white/40 border-b border-white/8">
                  <th className="px-5 py-3 font-semibold">Game</th>
                  {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                    <th key={d} className="px-5 py-3 font-semibold">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GAMES.map((g) => (
                  <tr key={g.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition">
                    <td className="px-5 py-3.5 font-bold text-white/85">
                      <span className="mr-2" aria-hidden>{g.emoji}</span>
                      <span style={{ color: g.accent }}>{g.name}</span>
                    </td>
                    {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => {
                      const v = s.highScores[`${g.id}:${d}`];
                      const stars = s.bestStars[`${g.id}:${d}`];
                      return (
                        <td key={d} className="px-5 py-3.5">
                          {v !== undefined ? (
                            <span className="flex items-center gap-2">
                              <span className="font-black text-white">{v}</span>
                              {stars ? <span className="text-[10px]" aria-label={`${stars} stars`}>{'⭐'.repeat(stars)}</span> : null}
                            </span>
                          ) : <span className="text-white/25">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── themes quick-equip ── */}
      <section className="mt-10">
        <SectionTitle kicker="Memory Match skins" title="Card Themes" accent="#e879f9" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CARD_THEMES.map((t) => {
            const unlocked = s.unlockedThemes.includes(t.id);
            const equipped = s.equippedTheme === t.id;
            return (
              <button
                key={t.id}
                disabled={!unlocked}
                onClick={() => { audio.click(); s.equipTheme(t.id); }}
                className={cn(
                  'rounded-2xl p-3 text-left transition-all border',
                  equipped ? 'border-fuchsia-400 scale-[1.02]' : 'border-white/10 hover:border-white/25',
                  !unlocked && 'opacity-40 cursor-not-allowed'
                )}
              >
                <div className="h-16 rounded-xl mb-2 border border-white/15" style={{ background: t.css, boxShadow: `0 0 14px ${t.glow}55` }} aria-hidden />
                <div className="text-xs font-bold text-white/85 flex items-center justify-between">
                  {t.name}
                  {equipped ? <span className="text-[9px] text-fuchsia-300 uppercase tracking-wider">on</span> : !unlocked ? <span className="text-[9px] text-white/40">🔒</span> : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── achievements ── */}
      <section className="mt-10">
        <SectionTitle kicker={`${s.achievements.length} / ${ACHIEVEMENTS.length} unlocked`} title="Achievements" accent="#fb7185" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a, i) => {
            const got = s.achievements.includes(a.id);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className={cn(
                  'glass rounded-2xl p-4 flex items-center gap-3 border',
                  got ? 'border-amber-400/40' : 'border-white/8 opacity-50'
                )}
                style={got ? { boxShadow: '0 0 18px rgba(251,191,36,.12)' } : undefined}
              >
                <span className={cn('text-3xl', !got && 'grayscale')} aria-hidden>{a.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    {a.name}
                    {got && <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden />}
                  </div>
                  <div className="text-xs text-white/50 leading-snug">{a.desc}</div>
                </div>
                <span className={cn('text-xs font-bold shrink-0', got ? 'text-amber-300' : 'text-white/35')}>+{a.reward}🪙</span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── danger zone ── */}
      <section className="mt-12 mb-4">
        <div className="glass rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-white text-sm">Reset progress</h4>
            <p className="text-xs text-white/45 mt-1">Wipes XP, coins, records, purchases and achievements. This cannot be undone.</p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Reset ALL arcade progress? This cannot be undone.')) {
                audio.error();
                useArcade.getState().resetProgress();
              }
            }}
            className="rounded-xl px-5 py-2.5 text-sm font-bold text-rose-300 border border-rose-400/40 hover:bg-rose-400/10 transition shrink-0"
          >
            Reset everything
          </button>
        </div>
      </section>
    </div>
  );
}
