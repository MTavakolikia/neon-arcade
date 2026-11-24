// ─── Neon Arcade · Confetti ──────────────────────────────────────────────────
// Global canvas confetti: bursts, rain and fireworks. Zero dependencies.

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; color: string;
  rot: number; vr: number;
  shape: 'rect' | 'circle' | 'star';
  life: number; maxLife: number;
  gravity: number; drag: number;
}

const COLORS = ['#e879f9', '#22d3ee', '#fbbf24', '#34d399', '#fb7185', '#a78bfa', '#f472b6', '#facc15'];

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let rafId: number | null = null;
let dpr = 1;

function ensureCanvas() {
  if (canvas || typeof document === 'undefined') return;
  canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  if (!canvas || !ctx) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawn(p: Partial<Particle> & { x: number; y: number }) {
  particles.push({
    vx: 0, vy: 0, size: 8, color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.3,
    shape: (['rect', 'circle', 'star'] as const)[Math.floor(Math.random() * 3)],
    life: 0, maxLife: 120 + Math.random() * 80,
    gravity: 0.14, drag: 0.985,
    ...p,
  });
}

function drawStar(c: CanvasRenderingContext2D, r: number) {
  c.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  c.fill();
}

function loop() {
  if (!ctx) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particles = particles.filter((p) => p.life < p.maxLife);
  for (const p of particles) {
    p.life++;
    p.vx *= p.drag;
    p.vy = p.vy * p.drag + p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    const alpha = Math.min(1, (p.maxLife - p.life) / 30);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
    else drawStar(ctx, p.size * 0.7);
    ctx.restore();
  }
  if (particles.length > 0) {
    rafId = requestAnimationFrame(loop);
  } else {
    rafId = null;
  }
}

function kick() {
  if (rafId === null) rafId = requestAnimationFrame(loop);
}

/** Radial burst from a point (default: center-ish) */
export function burst(opts: { x?: number; y?: number; count?: number; colors?: string[]; power?: number } = {}) {
  if (typeof window === 'undefined') return;
  ensureCanvas();
  const x = opts.x ?? window.innerWidth / 2;
  const y = opts.y ?? window.innerHeight * 0.45;
  const count = opts.count ?? 80;
  const power = opts.power ?? 11;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = power * (0.35 + Math.random() * 0.8);
    spawn({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      size: 6 + Math.random() * 9,
      maxLife: 90 + Math.random() * 70,
      gravity: 0.13,
      color: opts.colors ? opts.colors[Math.floor(Math.random() * opts.colors.length)] : undefined,
    });
  }
  kick();
}

/** Confetti rain from the top of the screen */
export function rain(opts: { count?: number; duration?: number; colors?: string[] } = {}) {
  if (typeof window === 'undefined') return;
  ensureCanvas();
  const count = opts.count ?? 160;
  const duration = opts.duration ?? 1600;
  const start = performance.now();
  const tick = () => {
    const elapsed = performance.now() - start;
    if (elapsed > duration) return;
    const remaining = Math.ceil((count * 3) / (duration / 16));
    for (let i = 0; i < Math.min(remaining, 14); i++) {
      spawn({
        x: Math.random() * window.innerWidth,
        y: -20 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 3.2,
        vy: 2 + Math.random() * 4,
        size: 7 + Math.random() * 9,
        maxLife: 200 + Math.random() * 120,
        gravity: 0.08,
        color: opts.colors ? opts.colors[Math.floor(Math.random() * opts.colors.length)] : undefined,
      });
    }
    kick();
    requestAnimationFrame(tick);
  };
  tick();
}

/** Side cannons + center burst — for big wins */
export function celebration() {
  if (typeof window === 'undefined') return;
  burst({ x: window.innerWidth * 0.08, y: window.innerHeight * 0.75, count: 70, power: 15 });
  burst({ x: window.innerWidth * 0.92, y: window.innerHeight * 0.75, count: 70, power: 15 });
  setTimeout(() => {
    burst({ x: window.innerWidth / 2, y: window.innerHeight * 0.35, count: 110, power: 13 });
  }, 260);
  rain({ count: 120, duration: 1500 });
}
