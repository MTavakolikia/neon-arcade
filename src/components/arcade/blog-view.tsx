'use client';

// ─── Neon Arcade · Blog ──────────────────────────────────────────────────────
// Strategy articles & arcade culture, with an in-page reader.

import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3 } from 'lucide-react';
import { ARTICLES } from '@/lib/arcade/data';
import { audio } from '@/lib/arcade/audio';
import { SectionTitle } from '@/components/arcade/shared';

export function BlogView({ articleId, onOpen, onBack }: { articleId?: string; onOpen: (id: string) => void; onBack: () => void }) {
  const article = ARTICLES.find((a) => a.id === articleId);

  // ── reader ──
  if (article) {
    const idx = ARTICLES.findIndex((a) => a.id === article.id);
    const prev = ARTICLES[idx - 1];
    const next = ARTICLES[idx + 1];
    return (
      <div className="max-w-3xl mx-auto px-4 pb-24 pt-8">
        <button
          onClick={() => { audio.click(); onBack(); }}
          className="glass rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 transition flex items-center gap-2 mb-8"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden /> All articles
        </button>

        <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-5xl" aria-hidden>{article.emoji}</span>
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map((t) => (
                <span key={t} className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest" style={{ background: `${article.accent}22`, color: article.accent }}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
            <span className="neon-text-soft" style={{ color: article.accent }}>{article.title}</span>
          </h1>
          <div className="flex items-center gap-4 mt-4 text-xs text-white/45">
            <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" aria-hidden /> {new Date(article.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span className="flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5" aria-hidden /> {article.readMin} min read</span>
          </div>

          <div
            className="h-px w-full my-8"
            style={{ background: `linear-gradient(90deg, transparent, ${article.accent}88, transparent)` }}
            aria-hidden
          />

          <div className="space-y-6">
            {article.body.map((p, i) => (
              <p key={i} className="text-white/75 leading-8 text-[15px] md:text-base" style={i === 0 ? { fontSize: '1.05rem', color: 'rgba(244,236,255,.88)' } : undefined}>
                {p}
              </p>
            ))}
          </div>

          <div className="flex justify-between gap-3 mt-12 pt-6 border-t border-white/8">
            {prev ? (
              <button onClick={() => { audio.click(); onOpen(prev.id); }} className="glass rounded-xl px-4 py-3 text-left text-sm hover:bg-white/10 transition group max-w-[46%]">
                <span className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1"><ArrowLeft className="w-3 h-3" aria-hidden /> Previous</span>
                <span className="font-bold text-white/80 group-hover:text-fuchsia-300 transition line-clamp-1">{prev.title}</span>
              </button>
            ) : <span />}
            {next && (
              <button onClick={() => { audio.click(); onOpen(next.id); }} className="glass rounded-xl px-4 py-3 text-right text-sm hover:bg-white/10 transition group max-w-[46%] ml-auto">
                <span className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1 justify-end">Next <ArrowRight className="w-3 h-3" aria-hidden /></span>
                <span className="font-bold text-white/80 group-hover:text-fuchsia-300 transition line-clamp-1">{next.title}</span>
              </button>
            )}
          </div>
        </motion.article>
      </div>
    );
  }

  // ── list ──
  const [featured, ...rest] = ARTICLES;
  return (
    <div className="max-w-5xl mx-auto px-4 pb-24 pt-8">
      <SectionTitle kicker="The Neon Journal" title="Strategy, Science & Arcade Culture" accent="#22d3ee" />

      {/* featured */}
      <motion.button
        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        onClick={() => { audio.click(); onOpen(featured.id); }}
        className="w-full text-left glass rounded-3xl p-6 md:p-8 mb-6 relative overflow-hidden group hover:bg-white/6 transition"
      >
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20 group-hover:opacity-35 transition-opacity" style={{ background: featured.accent }} aria-hidden />
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1 rounded-full" style={{ background: `${featured.accent}22`, color: featured.accent }}>
          Featured
        </span>
        <div className="flex items-start gap-5 mt-4">
          <span className="text-6xl anim-float-y shrink-0" aria-hidden>{featured.emoji}</span>
          <div>
            <h2 className="text-xl md:text-3xl font-black text-white tracking-tight leading-tight group-hover:text-fuchsia-300 transition">
              {featured.title}
            </h2>
            <p className="text-sm md:text-[15px] text-white/55 mt-2 leading-relaxed">{featured.excerpt}</p>
            <div className="flex items-center gap-4 mt-4 text-[11px] text-white/40">
              <span>{featured.readMin} min read</span>
              <span>{new Date(featured.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </motion.button>

      {/* grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {rest.map((a, i) => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            onClick={() => { audio.click(); onOpen(a.id); }}
            className="text-left glass rounded-2xl p-5 hover:bg-white/6 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl" aria-hidden>{a.emoji}</span>
              <span className="text-[10px] uppercase tracking-widest text-white/40">{a.readMin} min</span>
            </div>
            <h3 className="font-bold text-white mt-3 leading-snug group-hover:text-cyan-300 transition">{a.title}</h3>
            <p className="text-xs text-white/50 mt-2 leading-relaxed line-clamp-3">{a.excerpt}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {a.tags.map((t) => (
                <span key={t} className="rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest" style={{ background: `${a.accent}18`, color: a.accent }}>{t}</span>
              ))}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
