'use client';

// ─── Neon Arcade · App shell ─────────────────────────────────────────────────
// Header nav, XP HUD, view router, settings drawer, mobile bottom nav, footer.

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Gamepad2, LayoutDashboard, Music, Settings as SettingsIcon, ShoppingBag, User, Volume2, VolumeX } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import type { Difficulty, GameId } from '@/lib/arcade/data';
import { levelProgress, useArcade } from '@/lib/arcade/store';
import { audio } from '@/lib/arcade/audio';
import { HubView } from '@/components/arcade/hub-view';
import { DashboardView } from '@/components/arcade/dashboard-view';
import { BlogView } from '@/components/arcade/blog-view';
import { ShopView } from '@/components/arcade/shop-view';
import { GameShell } from '@/components/arcade/game-shell';
import { MemoryMatch } from '@/components/arcade/games/memory-match';
import { FruitCatcher } from '@/components/arcade/games/fruit-catcher';
import { SimonSays } from '@/components/arcade/games/simon-says';
import { Game2048 } from '@/components/arcade/games/game-2048';
import { WhackAMole } from '@/components/arcade/games/whack-a-mole';
import { cn } from '@/lib/utils';

type View =
  | { name: 'hub' }
  | { name: 'dashboard' }
  | { name: 'shop' }
  | { name: 'blog'; articleId?: string }
  | { name: 'game'; gameId: GameId; difficulty?: Difficulty };

const NAV: { key: string; label: string; icon: React.ReactNode; view: View }[] = [
  { key: 'hub', label: 'Arcade', icon: <Gamepad2 className="w-4 h-4" />, view: { name: 'hub' } },
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, view: { name: 'dashboard' } },
  { key: 'shop', label: 'Shop', icon: <ShoppingBag className="w-4 h-4" />, view: { name: 'shop' } },
  { key: 'blog', label: 'Blog', icon: <BookOpen className="w-4 h-4" />, view: { name: 'blog' } },
];

const emptySubscribe = () => () => {};

export default function ArcadeApp() {
  // hydration gate without setState-in-effect: false on server + first paint, true after
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [view, setView] = useState<View>({ name: 'hub' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingDiff, setPendingDiff] = useState<{ game: GameId; difficulty: Difficulty } | null>(null);

  const settings = useArcade((s) => s.settings);
  const updateSettings = useArcade((s) => s.updateSettings);
  const prog = levelProgress(useArcade((s) => s.xp));
  const coins = useArcade((s) => s.coins);

  // audio unlock on first gesture (browser autoplay policy)
  useEffect(() => {
    const unlock = () => {
      audio.init();
      audio.setProfile('menu');
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // difficulty requests from games ("try next difficulty")
  useEffect(() => {
    const onSetDiff = (e: Event) => {
      const detail = (e as CustomEvent).detail as { game: GameId; difficulty: Difficulty };
      setPendingDiff(detail);
      setView({ name: 'game', gameId: detail.game, difficulty: detail.difficulty });
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('arcade:set-difficulty', onSetDiff);
    return () => window.removeEventListener('arcade:set-difficulty', onSetDiff);
  }, []);

  const go = useCallback((v: View) => {
    audio.click();
    setPendingDiff(null);
    setView(v);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const openGame = useCallback((gameId: GameId, difficulty?: Difficulty) => {
    setPendingDiff(difficulty ? { game: gameId, difficulty } : null);
    setView({ name: 'game', gameId, difficulty });
    window.scrollTo({ top: 0 });
  }, []);

  const viewKey = view.name === 'game' ? `game-${view.gameId}-${view.difficulty ?? 'default'}` : view.name === 'blog' ? `blog-${view.articleId ?? 'list'}` : view.name;

  const renderView = () => {
    switch (view.name) {
      case 'hub':
        return <HubView onPlay={openGame} onShop={() => go({ name: 'shop' })} onBlog={(articleId) => go({ name: 'blog', articleId })} />;
      case 'dashboard':
        return <DashboardView />;
      case 'shop':
        return <ShopView />;
      case 'blog':
        return <BlogView articleId={view.articleId} onOpen={(id) => go({ name: 'blog', articleId: id })} onBack={() => go({ name: 'blog' })} />;
      case 'game':
        return (
          <GameShell
            key={`${view.gameId}-${pendingDiff?.difficulty ?? 'default'}`}
            gameId={view.gameId}
            initialDifficulty={pendingDiff?.game === view.gameId ? pendingDiff.difficulty : view.difficulty}
            scoreLabel={view.gameId === 'memory' ? 'Best points' : 'Best score'}
            onExit={() => go({ name: 'hub' })}
          >
            {(difficulty) => {
              switch (view.gameId) {
                case 'memory': return <MemoryMatch difficulty={difficulty} onExit={() => go({ name: 'hub' })} />;
                case 'fruit': return <FruitCatcher difficulty={difficulty} onExit={() => go({ name: 'hub' })} />;
                case 'simon': return <SimonSays difficulty={difficulty} onExit={() => go({ name: 'hub' })} />;
                case '2048': return <Game2048 difficulty={difficulty} onExit={() => go({ name: 'hub' })} />;
                case 'mole': return <WhackAMole difficulty={difficulty} onExit={() => go({ name: 'hub' })} />;
              }
            }}
          </GameShell>
        );
    }
  };

  if (!mounted) {
    return <div className="neon-root min-h-screen" aria-hidden />;
  }

  const activeNav = view.name === 'game' ? 'hub' : view.name === 'blog' ? 'blog' : view.name;

  return (
    <div className={cn('neon-root min-h-screen flex flex-col', settings.reduceMotion && 'reduce-motion')}>
      <div className="arcade-crt" aria-hidden />
      <div className="arcade-vignette" aria-hidden />

      {/* ── header ── */}
      <header className="sticky top-0 z-50 border-b border-white/8 backdrop-blur-xl" style={{ background: 'rgba(8,1,15,.72)' }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <button onClick={() => go({ name: 'hub' })} className="flex items-center gap-2.5 group" aria-label="Neon Arcade home">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg preserve-3d transition-transform group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg,#e879f9,#22d3ee)', boxShadow: '0 0 18px rgba(232,121,249,.45)' }}
              aria-hidden
            >
              👾
            </span>
            <span className="font-black tracking-tight text-lg hidden sm:block">
              <span className="text-fuchsia-400 neon-text-soft">NEON</span> <span className="text-cyan-300 neon-text-soft">ARCADE</span>
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => go(n.view)}
                aria-current={activeNav === n.key ? 'page' : undefined}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-bold transition-all flex items-center gap-2',
                  activeNav === n.key ? 'text-fuchsia-300 bg-fuchsia-400/10' : 'text-white/55 hover:text-white hover:bg-white/5'
                )}
              >
                {n.icon} {n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            {/* XP + coins HUD */}
            <div className="glass rounded-xl px-3 py-1.5 hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-2" title={`Level ${prog.level} · ${prog.into}/${prog.need} XP`}>
                <span className="text-[11px] font-black text-fuchsia-300">Lv.{prog.level}</span>
                <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${prog.pct}%`, background: 'linear-gradient(90deg,#e879f9,#22d3ee)' }} />
                </div>
              </div>
              <span className="text-xs font-black text-amber-300" title="Coins">🪙 {coins}</span>
            </div>

            <button
              onClick={() => { updateSettings({ musicOn: !settings.musicOn }); }}
              className="glass rounded-xl w-10 h-10 flex items-center justify-center text-white/70 hover:bg-white/10 transition"
              aria-label={settings.musicOn ? 'Mute music' : 'Unmute music'}
              title={settings.musicOn ? 'Music on' : 'Music off'}
            >
              <Music className={cn('w-4 h-4', settings.musicOn && 'text-fuchsia-300')} />
            </button>
            <button
              onClick={() => { setSettingsOpen(true); audio.click(); }}
              className="glass rounded-xl w-10 h-10 flex items-center justify-center text-white/70 hover:bg-white/10 transition"
              aria-label="Open settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── main ── */}
      <main className="flex-1 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewKey}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: settings.reduceMotion ? 0 : 0.28, ease: 'easeOut' }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── footer ── */}
      <footer className="mt-auto relative z-10 border-t border-white/8 bg-black/30">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <span className="flex items-center gap-2">
            <span aria-hidden>👾</span> NEON ARCADE — five games, one glowing cabinet.
          </span>
          <span className="flex items-center gap-4">
            <button onClick={() => go({ name: 'dashboard' })} className="hover:text-white/70 transition">Dashboard</button>
            <button onClick={() => go({ name: 'shop' })} className="hover:text-white/70 transition">Shop</button>
            <button onClick={() => go({ name: 'blog' })} className="hover:text-white/70 transition">Blog</button>
            <span className="hidden sm:inline">Synth audio · zero downloads</span>
          </span>
        </div>
      </footer>

      {/* ── mobile bottom nav ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/10 backdrop-blur-xl pb-safe"
        style={{ background: 'rgba(8,1,15,.85)' }}
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-5">
          {[
            ...NAV.map((n) => ({ ...n })),
            { key: 'me', label: 'Me', icon: <User className="w-4 h-4" />, view: { name: 'dashboard' } as View },
          ].map((n) => (
            <button
              key={n.key}
              onClick={() => go(n.view)}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition-colors',
                activeNav === n.key ? 'text-fuchsia-300' : 'text-white/45'
              )}
              aria-current={activeNav === n.key ? 'page' : undefined}
            >
              {n.icon}
              {n.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── settings drawer ── */}
      <AnimatePresence>
        {settingsOpen && (
          <div className="fixed inset-0 z-[75] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSettingsOpen(false)} />
            <motion.aside
              initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              className="relative w-full max-w-sm h-full p-6 flex flex-col overflow-y-auto neon-scroll border-l border-white/10"
              style={{ background: 'linear-gradient(180deg,#160826,#0c0318)' }}
              role="dialog" aria-label="Settings"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white">Settings</h3>
                <button onClick={() => { audio.click(); setSettingsOpen(false); }} className="text-white/50 hover:text-white text-2xl leading-none" aria-label="Close settings">×</button>
              </div>

              <div className="space-y-5">
                <div className="glass rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-white">Layered music</div>
                    <div className="text-xs text-white/45">Procedural synthwave that reacts to streaks</div>
                  </div>
                  <Switch checked={settings.musicOn} onCheckedChange={(v) => updateSettings({ musicOn: v })} aria-label="Toggle music" />
                </div>

                <div className="glass rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-white">Sound effects</div>
                    <div className="text-xs text-white/45">Chimes, fanfares, thuds and pops</div>
                  </div>
                  <Switch checked={settings.sfxOn} onCheckedChange={(v) => updateSettings({ sfxOn: v })} aria-label="Toggle sound effects" />
                </div>

                <div className="glass rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      {settings.volume > 0 ? <Volume2 className="w-4 h-4 text-fuchsia-300" /> : <VolumeX className="w-4 h-4 text-white/40" />} Master volume
                    </div>
                    <span className="text-xs font-black text-fuchsia-300">{Math.round(settings.volume * 100)}%</span>
                  </div>
                  <Slider
                    value={[Math.round(settings.volume * 100)]}
                    onValueChange={([v]) => updateSettings({ volume: v / 100 })}
                    max={100}
                    step={5}
                    aria-label="Master volume"
                  />
                </div>

                <div className="glass rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-white">Haptic feedback</div>
                    <div className="text-xs text-white/45">Vibration on mobile devices</div>
                  </div>
                  <Switch checked={settings.hapticsOn} onCheckedChange={(v) => updateSettings({ hapticsOn: v })} aria-label="Toggle haptics" />
                </div>

                <div className="glass rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-white">Reduce motion</div>
                    <div className="text-xs text-white/45">Calmer animations, faster card flips</div>
                  </div>
                  <Switch checked={settings.reduceMotion} onCheckedChange={(v) => updateSettings({ reduceMotion: v })} aria-label="Toggle reduce motion" />
                </div>

                <div className="glass rounded-xl p-4">
                  <div className="font-bold text-sm text-white mb-1.5">About this arcade</div>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Built with Next.js + TypeScript. Every sound is synthesized live with the Web Audio API — no audio files.
                    Progress, XP and purchases live in your browser&apos;s local storage.
                  </p>
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
