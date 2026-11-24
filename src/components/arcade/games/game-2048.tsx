'use client';

// ─── Neon Arcade · 2048 ──────────────────────────────────────────────────────
// Silky tile slides, merge pops, swipe/keys/D-pad. Hard mode adds blockers.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Undo2 } from 'lucide-react';
import type { Difficulty } from '@/lib/arcade/data';
import { useArcade } from '@/lib/arcade/store';
import { audio } from '@/lib/arcade/audio';
import { celebration } from '@/lib/arcade/confetti';
import { NeonButton, ResultModal, StatChip } from '@/components/arcade/shared';
import { cn } from '@/lib/utils';

const GAP = 10;

interface Tile { id: number; val: number; r: number; c: number; isNew?: boolean; merged?: boolean; pendingVal?: number }
type Dir = 'up' | 'down' | 'left' | 'right';

const CONF: Record<Difficulty, { n: number; blockers: string[] }> = {
  easy: { n: 5, blockers: [] },
  normal: { n: 4, blockers: [] },
  hard: { n: 4, blockers: ['1,1', '2,2'] },
};

const tileStyle = (val: number): React.CSSProperties => {
  const map: Record<number, React.CSSProperties> = {
    2: { background: 'rgba(255,255,255,0.10)' },
    4: { background: 'rgba(52,211,153,0.28)', color: '#d1fae5' },
    8: { background: 'rgba(34,211,238,0.30)', color: '#cffafe' },
    16: { background: 'rgba(232,121,249,0.32)', color: '#fdf4ff' },
    32: { background: 'rgba(232,121,249,0.48)', color: '#fff' },
    64: { background: 'rgba(251,113,133,0.55)', color: '#fff' },
    128: { background: 'rgba(251,191,36,0.55)', color: '#fff' },
    256: { background: 'rgba(251,191,36,0.72)', color: '#16041f' },
    512: { background: 'rgba(251,146,60,0.80)', color: '#16041f' },
    1024: { background: 'linear-gradient(135deg,#f43f5e,#fb7185)', color: '#fff' },
    2048: { background: 'linear-gradient(135deg,#fbbf24,#f59e0b,#fbbf24)', color: '#16041f', boxShadow: '0 0 34px rgba(251,191,36,.75)' },
  };
  return map[val] ?? { background: 'linear-gradient(135deg,#e879f9,#22d3ee)', color: '#16041f', boxShadow: '0 0 30px rgba(232,121,249,.7)' };
};

let tileId = 0;

export function Game2048({ difficulty, onExit }: { difficulty: Difficulty; onExit: () => void }) {
  const { n, blockers } = CONF[difficulty];
  const blockerSet = useMemo(() => new Set(blockers), [blockers]);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [undosLeft, setUndosLeft] = useState(3);
  const [result, setResult] = useState<{ score: number; maxTile: number; won: boolean; xp: number; coins: number; best: number } | null>(null);
  const [round, setRound] = useState(0);

  const lockedRef = useRef(false);
  const undoRef = useRef<{ tiles: Tile[]; score: number } | null>(null);
  const wonRef = useRef(false);
  const recordedRef = useRef(false);
  const endedRef = useRef(false);
  const tilesRef = useRef<Tile[]>([]);
  const scoreRef = useRef(0);
  tilesRef.current = tiles;
  scoreRef.current = score;

  const recordResult = useArcade((s) => s.recordResult);
  const reduceMotion = useArcade((s) => s.settings.reduceMotion);

  const spawnTile = useCallback((list: Tile[]): Tile | null => {
    const taken = new Set(list.map((t) => `${t.r},${t.c}`));
    const empty: { r: number; c: number }[] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!blockerSet.has(`${r},${c}`) && !taken.has(`${r},${c}`)) empty.push({ r, c });
    }
    if (empty.length === 0) return null;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    return { id: ++tileId, val: Math.random() < 0.9 ? 2 : 4, r: cell.r, c: cell.c, isNew: true };
  }, [n, blockerSet]);

  const init = useCallback(() => {
    const first = spawnTile([]);
    const second = first ? spawnTile([first]) : null;
    setTiles([first, second].filter(Boolean) as Tile[]);
    setScore(0); setUndosLeft(3);
    undoRef.current = null; wonRef.current = false; recordedRef.current = false; endedRef.current = false;
    lockedRef.current = false;
    setResult(null);
    audio.setProfile('game');
     
  }, [spawnTile]);

  useEffect(() => { init(); }, [init, round]);

  const finish = useCallback((won: boolean) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const maxTile = Math.max(...tilesRef.current.map((t) => t.val), 0);
    const s = scoreRef.current;
    const xp = Math.min(200, Math.round(Math.log2(Math.max(2, maxTile)) * 8));
    const coins = Math.floor(s / 100) + (won ? 40 : 0);
    recordedRef.current = true;
    const res = recordResult({ game: '2048', difficulty, score: s, won, xp, coins });
    const best = useArcade.getState().highScores[`2048:${difficulty}`] ?? s;
    if (won) { audio.victory(); if (!reduceMotion) celebration(); } else audio.gameOver();
    setResult({ score: s, maxTile, won, xp, coins, best });
    if (res.leveledUp) audio.levelUp();
     
  }, [difficulty, recordResult, reduceMotion]);

  const canMove = useCallback((list: Tile[]) => {
    const grid = new Map<string, number>();
    list.forEach((t) => grid.set(`${t.r},${t.c}`, t.val));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const key = `${r},${c}`;
      if (blockerSet.has(key)) continue;
      if (!grid.has(key)) return true;
      const v = grid.get(key)!;
      if (c + 1 < n && !blockerSet.has(`${r},${c + 1}`) && grid.get(`${r},${c + 1}`) === v) return true;
      if (r + 1 < n && !blockerSet.has(`${r + 1},${c}`) && grid.get(`${r + 1},${c}`) === v) return true;
    }
    return false;
  }, [n, blockerSet]);

  const doMove = useCallback((dir: Dir) => {
    if (lockedRef.current || endedRef.current || result) return;
    const horizontal = dir === 'left' || dir === 'right';
    const reversed = dir === 'right' || dir === 'down';
    const grid = new Map<string, Tile>();
    tilesRef.current.forEach((t) => grid.set(`${t.r},${t.c}`, { ...t }));

    const survivors: Tile[] = [];
    const absorbed: Tile[] = [];
    let gained = 0, maxMerged = 0, moved = false;

    for (let line = 0; line < n; line++) {
      const cells: { r: number; c: number }[] = [];
      for (let i = 0; i < n; i++) {
        const pos = reversed ? n - 1 - i : i;
        cells.push(horizontal ? { r: line, c: pos } : { r: pos, c: line });
      }
      // split line into segments at blockers
      const segments: { r: number; c: number }[][] = [];
      let cur: { r: number; c: number }[] = [];
      for (const cell of cells) {
        if (blockerSet.has(`${cell.r},${cell.c}`)) {
          if (cur.length) segments.push(cur);
          cur = [];
        } else cur.push(cell);
      }
      if (cur.length) segments.push(cur);

      for (const segment of segments) {
        const segTiles = segment
          .map((cell) => grid.get(`${cell.r},${cell.c}`))
          .filter(Boolean) as Tile[];
        let i = 0, slot = 0;
        while (i < segTiles.length) {
          const target = segment[slot];
          const a = segTiles[i];
          if (i + 1 < segTiles.length && segTiles[i].val === segTiles[i + 1].val) {
            const b = segTiles[i + 1];
            moved = true;
            survivors.push({ ...a, r: target.r, c: target.c, merged: true, pendingVal: a.val * 2 });
            absorbed.push({ ...b, r: target.r, c: target.c });
            gained += a.val * 2;
            maxMerged = Math.max(maxMerged, a.val * 2);
            i += 2;
          } else {
            if (a.r !== target.r || a.c !== target.c) moved = true;
            survivors.push({ ...a, r: target.r, c: target.c });
            i += 1;
          }
          slot++;
        }
      }
    }

    if (!moved) { audio.error(); return; }
    undoRef.current = { tiles: tilesRef.current.map((t) => ({ ...t })), score: scoreRef.current };
    lockedRef.current = true;
    audio.whoosh();

    // slide phase: survivors + absorbed ghosts move together
    setTiles([...survivors, ...absorbed]);

    window.setTimeout(() => {
      // resolve merges
      const resolved = survivors.map((t) => (t.merged ? { ...t, val: t.pendingVal!, pendingVal: undefined } : t));
      const fresh = spawnTile(resolved);
      const next = fresh ? [...resolved, fresh] : resolved;
      setTiles(next);
      setScore((s) => s + gained);
      if (maxMerged > 0) audio.merge(maxMerged);
      else audio.spawn();

      window.setTimeout(() => {
        setTiles((prev) => prev.map((t) => ({ ...t, isNew: false, merged: false })));
        lockedRef.current = false;
        if (resolved.some((t) => t.val >= 2048) && !wonRef.current) {
          wonRef.current = true;
          finish(true);
        } else if (!canMove(next)) {
          finish(false);
        }
      }, reduceMotion ? 40 : 160);
    }, reduceMotion ? 40 : 135);
  }, [n, blockerSet, spawnTile, canMove, finish, reduceMotion, result]);

  const undo = () => {
    if (!undoRef.current || undosLeft <= 0 || lockedRef.current) return;
    setTiles(undoRef.current.tiles);
    setScore(undoRef.current.score);
    undoRef.current = null;
    setUndosLeft((u) => u - 1);
    endedRef.current = false;
    audio.click();
  };

  // keyboard + swipe
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); doMove(dir); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doMove]);

  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  // record partial progress on exit
  useEffect(() => () => {
    if (!recordedRef.current && scoreRef.current > 30) {
      const maxTile = Math.max(...tilesRef.current.map((t) => t.val), 0);
      recordResult({
        game: '2048', difficulty, score: scoreRef.current, won: false,
        xp: Math.min(120, Math.round(Math.log2(Math.max(2, maxTile)) * 5)), coins: 0,
      });
    }
  }, [difficulty, recordResult]);

  const cellPct = `calc((100% - ${(n + 1) * GAP}px) / ${n})`;
  const posStyle = (r: number, c: number): React.CSSProperties => ({
    width: cellPct, height: cellPct,
    left: `calc(${GAP}px + ${c} * ((100% - ${(n + 1) * GAP}px) / ${n} + ${GAP}px))`,
    top: `calc(${GAP}px + ${r} * ((100% - ${(n + 1) * GAP}px) / ${n} + ${GAP}px))`,
  });

  const replay = () => setRound((r) => r + 1);

  return (
    <div className="max-w-md mx-auto">
      <div className="flex justify-center gap-2 md:gap-3 mb-5 flex-wrap">
        <StatChip label="Score" value={score} accent="#22d3ee" />
        <StatChip label="Target" value="2048" accent="#fbbf24" />
        <StatChip label="Undos" value={undosLeft} accent="#e879f9" />
      </div>

      <div
        className="relative rounded-2xl neon-border touch-none select-none"
        style={{ aspectRatio: '1 / 1', background: 'rgba(10,2,22,.6)' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        role="application"
        aria-label="2048 board. Use arrow keys, swipe, or the D-pad below."
      >
        {/* static cells */}
        {Array.from({ length: n * n }).map((_, i) => {
          const r = Math.floor(i / n), c = i % n;
          const isBlocker = blockerSet.has(`${r},${c}`);
          return (
            <div
              key={`cell-${i}`}
              className="absolute rounded-xl"
              style={{
                ...posStyle(r, c),
                background: isBlocker ? 'rgba(251,113,133,.10)' : 'rgba(255,255,255,.045)',
                border: isBlocker ? '1px dashed rgba(251,113,133,.4)' : '1px solid rgba(255,255,255,.05)',
              }}
            >
              {isBlocker && <span className="absolute inset-0 flex items-center justify-center text-xl opacity-60" aria-hidden>🧱</span>}
            </div>
          );
        })}

        {/* tiles */}
        {tiles.map((t) => (
          <div
            key={t.id}
            className={cn(
              'absolute rounded-xl flex items-center justify-center font-black select-none',
              t.merged && !reduceMotion && 'anim-tile-pop',
              t.isNew && !reduceMotion && 'anim-spawn'
            )}
            style={{
              ...posStyle(t.r, t.c),
              ...tileStyle(t.val),
              fontSize: t.val >= 1024 ? 'clamp(14px, 4.2vw, 22px)' : t.val >= 128 ? 'clamp(16px, 5vw, 26px)' : 'clamp(18px, 6vw, 30px)',
              transition: reduceMotion ? 'none' : 'left 130ms ease-in-out, top 130ms ease-in-out',
              zIndex: t.merged ? 2 : 1,
            }}
            aria-label={`Tile ${t.val}`}
          >
            {t.val}
          </div>
        ))}
      </div>

      {/* controls */}
      <div className="flex items-center justify-between mt-5 gap-3">
        <button
          onClick={undo}
          disabled={undosLeft <= 0 || !undoRef.current}
          className="glass rounded-xl px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/10 transition disabled:opacity-30 flex items-center gap-2"
        >
          <Undo2 className="w-4 h-4" aria-hidden /> Undo
        </button>

        {/* D-pad */}
        <div className="grid grid-cols-3 gap-1.5 w-36" aria-label="Direction pad">
          <span />
          <button onClick={() => doMove('up')} className="glass rounded-lg py-3 hover:bg-white/10 active:scale-90 transition" aria-label="Move up"><ArrowUp className="w-5 h-5 mx-auto" /></button>
          <span />
          <button onClick={() => doMove('left')} className="glass rounded-lg py-3 hover:bg-white/10 active:scale-90 transition" aria-label="Move left"><ArrowLeft className="w-5 h-5 mx-auto" /></button>
          <button onClick={() => doMove('down')} className="glass rounded-lg py-3 hover:bg-white/10 active:scale-90 transition" aria-label="Move down"><ArrowDown className="w-5 h-5 mx-auto" /></button>
          <button onClick={() => doMove('right')} className="glass rounded-lg py-3 hover:bg-white/10 active:scale-90 transition" aria-label="Move right"><ArrowRight className="w-5 h-5 mx-auto" /></button>
        </div>

        <NeonButton onClick={replay} variant="ghost" className="!px-4">↻ New</NeonButton>
      </div>

      <p className="text-center text-xs text-white/40 mt-4">
        Arrow keys / WASD / swipe / D-pad · merge equal tiles · reach 2048
        {difficulty === 'hard' && <span className="text-rose-300"> · 🧱 blockers never move</span>}
      </p>

      {result && (
        <ResultModal
          open
          won={result.won}
          title={result.won ? '2048 ACHIEVED!' : 'No Moves Left'}
          subtitle={result.won ? 'The grid bows to you' : `Best tile this run: ${result.maxTile}`}
          stats={[
            { label: 'Score', value: result.score, accent: '#22d3ee' },
            { label: 'Best tile', value: result.maxTile, accent: '#fbbf24' },
            { label: 'All-time best', value: result.best, accent: '#34d399' },
            { label: 'Difficulty', value: difficulty.toUpperCase(), accent: '#fb7185' },
          ]}
          xp={result.xp}
          coins={result.coins}
          onReplay={replay}
          onExit={() => { setResult(null); onExit(); }}
        />
      )}
    </div>
  );
}
