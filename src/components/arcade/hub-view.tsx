'use client';

// ─── Neon Arcade · Hub ───────────────────────────────────────────────────────
// Hero, player strip, 3D tilt game cards, features, latest articles.

import { motion } from 'framer-motion';
import { ArrowRight, Flame, Gamepad2, ShoppingBag, Smartphone, Sparkles, Trophy } from 'lucide-react';
import { ACHIEVEMENTS, ARTICLES, GAMES, type Difficulty, type GameId } from '@/lib/arcade/data';
import { levelProgress, rankFor, useArcade } from '@/lib/arcade/store';
import { audio } from '@/lib/arcade/audio';
import { Tilt3D } from '@/components/arcade/shared';

const ORBS = ['👾', '🕹️', '🎰', '🪙', '⚡', '🏆'];

export function HubView({ onPlay, onBlog, onShop }: { onPlay: (gameId: GameId, difficulty?: Difficulty) => void; onBlog: (articleId?: string) => void; onShop: () => void }) {
  const xp = useArcade((s) => s.xp);
  const coins = useArcade((s) => s.coins);
  const wins = useArcade((s) => s.wins);
  const gamesPlayed = useArcade((s) => s.gamesPlayed);
  const bestStreak = useArcade((s) => s.bestStreak);
  const achievements = useArcade((s) => s.achievements);
  const highScores = useArcade((s) => s.highScores);
  const prog = levelProgress(xp);

  return (
    <div className="relative overflow-hidden">
      {/* ── hero ── */}
      <section className="relative">
        <div className="absolute inset-0 hero-grid" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 pt-14 pb-10 md:pt-20 md:pb-14 text-center">
          {ORBS.map((o, i) => (
            <span
              key={i}
              className="absolute hidden md:block text-4xl opacity-30 anim-float-y select-none"
              style={{
                left: `${8 + i * 16}%`,
                top: i % 2 === 0 ? '12%' : '58%',
                animationDelay: `${i * 0.5}s`,
                filter: 'drop-shadow(0 0 14px rgba(232,121,249,.4))',
                transform: `translateZ(${20 + i * 8}px)`,
              }}
              aria-hidden
            >
              {o}
            </span>
          ))}

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="glass rounded-full px-4 py-1.5 text-xs font-bold tracking-[0.25em] uppercase text-fuchsia-300 inline-flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" aria-hidden /> 5 games · one arcade
            </span>
            <h1 className="mt-5 text-5xl md:text-7xl font-black tracking-tighter leading-[1.05]">
              <span className="text-fuchsia-400 neon-text">NEON</span>{' '}
              <span className="text-cyan-300 neon-text">ARCADE</span>
            </h1>
            <p className="mt-4 text-white/60 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
              Memory Match with 3D card physics, four more arcade hits, procedural synthwave music,
              XP levels, coins, achievements — and a shop to spend it all in.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => { audio.click(); onPlay('memory'); }}
                className="rounded-xl px-7 py-3.5 font-black text-sm tracking-wide transition-transform hover:scale-[1.04] active:scale-95 flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg,#e879f9,#a855f7)', color: '#16041f', boxShadow: '0 0 30px rgba(232,121,249,.45)' }}
              >
                <Gamepad2 className="w-4.5 h-4.5" aria-hidden /> INSERT COIN · PLAY NOW
              </button>
              <button
                onClick={() => { audio.click(); onBlog(); }}
                className="glass rounded-xl px-6 py-3.5 font-bold text-sm text-white/80 hover:bg-white/10 transition flex items-center gap-2"
              >
                Read the blog <ArrowRight className="w-4 h-4" aria-hidden />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── player strip ── */}
      <section className="max-w-6xl mx-auto px-4 -mt-2 mb-12">
        <div className="glass rounded-2xl p-4 md:p-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl preserve-3d"
              style={{ background: 'linear-gradient(135deg, rgba(232,121,249,.25), rgba(34,211,238,.2))', border: '1px solid rgba(232,121,249,.35)' }}
              aria-hidden
            >
              👾
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/45">Player</div>
              <div className="font-black text-white">
                Lv.{prog.level} <span className="text-fuchsia-300 text-sm font-bold">{rankFor(prog.level)}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-[180px]">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/45 mb-1">
              <span>XP</span>
              <span>{prog.into} / {prog.need}</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/8 overflow-hidden" role="progressbar" aria-valuenow={Math.round(prog.pct)} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${prog.pct}%`, background: 'linear-gradient(90deg,#e879f9,#22d3ee)', boxShadow: '0 0 12px rgba(232,121,249,.6)' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-5 text-sm">
            <span className="flex items-center gap-1.5 text-amber-300 font-bold" title="Coins">🪙 {coins}</span>
            <span className="flex items-center gap-1.5 text-white/70" title="Games played"><Gamepad2 className="w-4 h-4 text-fuchsia-300" aria-hidden /> {gamesPlayed}</span>
            <span className="flex items-center gap-1.5 text-white/70" title="Wins"><Trophy className="w-4 h-4 text-amber-300" aria-hidden /> {wins}</span>
            <span className="flex items-center gap-1.5 text-white/70" title="Best streak"><Flame className="w-4 h-4 text-rose-400" aria-hidden /> {bestStreak}</span>
            <span className="hidden sm:flex items-center gap-1.5 text-white/70" title="Achievements">🏅 {achievements.length}/{ACHIEVEMENTS.length}</span>
          </div>
        </div>
      </section>

      {/* ── games grid ── */}
      <section className="max-w-6xl mx-auto px-4 mb-16" aria-label="Games">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game, i) => {
            const bestEasy = highScores[`${game.id}:easy`];
            const bestNormal = highScores[`${game.id}:normal`];
            const bestHard = highScores[`${game.id}:hard`];
            const hasBest = bestEasy !== undefined || bestNormal !== undefined || bestHard !== undefined;
            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
              >
                <Tilt3D className="h-full">
                  <div
                    className="glass rounded-3xl p-5 h-full flex flex-col relative overflow-hidden group transition-shadow duration-300"
                    style={{ boxShadow: `0 0 0 rgba(0,0,0,0)` }}
                  >
                    <div
                      className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-25 transition-opacity duration-300 group-hover:opacity-50"
                      style={{ background: game.accent }}
                      aria-hidden
                    />
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-5xl anim-float-y inline-block" style={{ animationDelay: `${i * 0.4}s`, filter: `drop-shadow(0 0 16px ${game.accentSoft})` }} aria-hidden>
                        {game.emoji}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: game.accentSoft, color: game.accent }}>
                        {game.xpHint}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white tracking-tight">
                      <span className="neon-text-soft" style={{ color: game.accent }}>{game.name}</span>
                    </h3>
                    <p className="text-xs text-white/50 mt-0.5 italic">{game.tagline}</p>
                    <p className="text-sm text-white/60 mt-3 leading-relaxed flex-1">{game.description}</p>

                    {/* difficulties */}
                    <div className="grid grid-cols-3 gap-1.5 mt-4">
                      {(Object.keys(game.difficulties) as Difficulty[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => { audio.click(); onPlay(game.id, d); }}
                          className="rounded-lg px-2 py-2 text-center transition-all hover:scale-[1.05] active:scale-95 min-h-[44px]"
                          style={{
                            background: d === 'easy' ? 'rgba(52,211,153,.10)' : d === 'normal' ? 'rgba(251,191,36,.10)' : 'rgba(251,113,133,.10)',
                            border: `1px solid ${d === 'easy' ? 'rgba(52,211,153,.3)' : d === 'normal' ? 'rgba(251,191,36,.3)' : 'rgba(251,113,133,.3)'}`,
                          }}
                          title={game.difficulties[d].detail}
                        >
                          <div className="text-[11px] font-bold text-white/85">{game.difficulties[d].label}</div>
                          <div className="text-[9px] uppercase tracking-wider text-white/40">{d}</div>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[11px] text-white/40">
                        {hasBest
                          ? `Best: ${Math.max(bestEasy ?? 0, bestNormal ?? 0, bestHard ?? 0)}`
                          : 'No record yet'}
                      </span>
                      <button
                        onClick={() => { audio.click(); onPlay(game.id); }}
                        className="rounded-xl px-5 py-2.5 font-black text-xs tracking-wide transition-transform hover:scale-[1.05] active:scale-95"
                        style={{ background: `linear-gradient(135deg, ${game.accent}, ${game.accent}aa)`, color: '#16041f', boxShadow: `0 0 18px ${game.accent}55` }}
                      >
                        ▶ PLAY
                      </button>
                    </div>
                  </div>
                </Tilt3D>
              </motion.div>
            );
          })}

          {/* shop teaser card */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: 0.35 }}>
            <Tilt3D className="h-full" max={6}>
              <button
                onClick={() => { audio.click(); onShop(); }}
                className="w-full h-full text-left glass rounded-3xl p-5 relative overflow-hidden group"
              >
                <div className="absolute -bottom-14 -left-14 w-40 h-40 rounded-full blur-3xl opacity-25 bg-amber-400 group-hover:opacity-50 transition-opacity" aria-hidden />
                <span className="text-5xl anim-float-y inline-block" aria-hidden>🛍️</span>
                <h3 className="text-xl font-black text-amber-300 tracking-tight mt-3 neon-text-soft">Coin Shop</h3>
                <p className="text-sm text-white/60 mt-2 leading-relaxed flex-1">
                  Spend hard-earned coins on card themes, or grab arcade merch from the physical shelf.
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-bold text-amber-300">
                  Visit the shop <ShoppingBag className="w-4 h-4" aria-hidden />
                </span>
              </button>
            </Tilt3D>
          </motion.div>
        </div>
      </section>

      {/* ── features strip ── */}
      <section className="max-w-6xl mx-auto px-4 mb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: '⚡', title: 'XP & Levels', desc: 'Every round pays XP. Climb from Rookie to Arcade Legend and unlock level-up coin bonuses.' },
            { icon: '🏅', title: 'Achievements', desc: '12 badges with coin rewards — from your first win to the legendary 2048 club.' },
            { icon: '🎚️', title: 'Live Synth Audio', desc: 'Layered procedural soundtrack + reactive SFX, synthesized in your browser. Zero downloads.' },
            { icon: <Smartphone className="w-5 h-5" aria-hidden />, title: 'Mobile Native Feel', desc: 'Swipe, drag and tap controls, haptic feedback, safe-area layout and a bottom nav on phones.' },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="glass rounded-2xl p-5"
            >
              <div className="text-3xl mb-2" aria-hidden>{typeof f.icon === 'string' ? f.icon : f.icon}</div>
              <h4 className="font-black text-white text-sm tracking-wide">{f.title}</h4>
              <p className="text-xs text-white/55 mt-1.5 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── latest articles ── */}
      <section className="max-w-6xl mx-auto px-4 mb-20">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300 mb-1">From the blog</div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Strategy & Stories</h2>
          </div>
          <button onClick={() => { audio.click(); onBlog(); }} className="glass rounded-xl px-4 py-2 text-sm font-bold text-white/75 hover:bg-white/10 transition flex items-center gap-1.5">
            All articles <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {ARTICLES.slice(0, 3).map((a, i) => (
            <motion.button
              key={a.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              onClick={() => { audio.click(); onBlog(a.id); }}
              className="glass rounded-2xl p-5 text-left hover:bg-white/8 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl" aria-hidden>{a.emoji}</span>
                <span className="text-[10px] uppercase tracking-widest text-white/40">{a.readMin} min read</span>
              </div>
              <h3 className="font-bold text-white mt-3 leading-snug group-hover:text-fuchsia-300 transition">{a.title}</h3>
              <p className="text-xs text-white/50 mt-2 leading-relaxed line-clamp-2">{a.excerpt}</p>
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}
